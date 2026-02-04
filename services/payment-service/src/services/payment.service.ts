import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

interface CreatePaymentIntentInput {
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
}

export class PaymentService {
  private readonly ORDER_SERVICE_URL: string;

  constructor() {
    this.ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';
  }

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const { userId, orderId, amount, currency } = input;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        id: uuidv4(),
        userId,
        orderId,
        amount,
        currency,
        status: 'pending',
      },
    });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        paymentId: payment.id,
        orderId,
        userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update payment with Stripe ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
    };
  }

  async confirmPayment(paymentId: string, paymentMethodId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (!payment.stripePaymentIntentId) {
      throw new AppError('No payment intent found', 400);
    }

    // Confirm with Stripe if payment method provided
    if (paymentMethodId) {
      await stripe.paymentIntents.confirm(payment.stripePaymentIntentId, {
        payment_method: paymentMethodId,
      });
    }

    // Get updated status from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId
    );

    const status = this.mapStripeStatus(paymentIntent.status);

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });

    return updatedPayment;
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status !== 'succeeded') {
      throw new AppError('Can only refund successful payments', 400);
    }

    if (!payment.stripePaymentIntentId) {
      throw new AppError('No payment intent found', 400);
    }

    const refundAmount = amount || payment.amount;
    const refundAmountCents = Math.round(refundAmount * 100);

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: refundAmountCents,
      reason: reason as Stripe.RefundCreateParams.Reason,
    });

    // Create refund record
    const refundRecord = await prisma.refund.create({
      data: {
        id: uuidv4(),
        paymentId,
        amount: refundAmount,
        stripeRefundId: refund.id,
        reason,
        status: refund.status || 'pending',
      },
    });

    // Update payment status if fully refunded
    if (refundAmount >= payment.amount) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'refunded' },
      });
    }

    return refundRecord;
  }

  async getPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    return payment;
  }

  async getPaymentsByOrder(orderId: string) {
    return prisma.payment.findMany({
      where: { orderId },
      include: { refunds: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentMethods(userId: string) {
    const customer = await this.getOrCreateStripeCustomer(userId);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));
  }

  async addPaymentMethod(userId: string, paymentMethodId: string) {
    const customer = await this.getOrCreateStripeCustomer(userId);

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return {
      id: paymentMethod.id,
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
    };
  }

  async removePaymentMethod(userId: string, methodId: string) {
    // Verify ownership
    const paymentMethod = await stripe.paymentMethods.retrieve(methodId);
    const customer = await this.getOrCreateStripeCustomer(userId);

    if (paymentMethod.customer !== customer.id) {
      throw new AppError('Payment method not found', 404);
    }

    await stripe.paymentMethods.detach(methodId);
  }

  async updatePaymentStatus(
    paymentId: string,
    status: string,
    stripeId?: string,
    errorMessage?: string
  ) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(stripeId && { stripePaymentIntentId: stripeId }),
        ...(errorMessage && { errorMessage }),
        updatedAt: new Date(),
      },
    });
  }

  async handleRefundCompleted(stripePaymentIntentId: string, amountRefunded: number) {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId },
    });

    if (payment) {
      const amountInDollars = amountRefunded / 100;
      if (amountInDollars >= payment.amount) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'refunded' },
        });
      }
    }
  }

  async notifyOrderService(orderId: string, event: string, data: Record<string, unknown>) {
    try {
      await axios.post(`${this.ORDER_SERVICE_URL}/api/v1/orders/${orderId}/payment-event`, {
        event,
        ...data,
      });
    } catch (error) {
      logger.error('Failed to notify order service', { orderId, event, error });
    }
  }

  private async getOrCreateStripeCustomer(userId: string) {
    let customer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        metadata: { userId },
      });

      customer = await prisma.stripeCustomer.create({
        data: {
          userId,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    return { id: customer.stripeCustomerId };
  }

  private mapStripeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'processing',
      succeeded: 'succeeded',
      canceled: 'canceled',
    };

    return statusMap[status] || 'pending';
  }
}
