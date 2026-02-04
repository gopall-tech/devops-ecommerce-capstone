import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
const paymentService = new PaymentService();

export class WebhookController {
  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.info(`Received Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleRefund(event.data.object as Stripe.Charge);
          break;

        case 'charge.dispute.created':
          await this.handleDispute(event.data.object as Stripe.Dispute);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook', { error, eventType: event.type });
      next(error);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    logger.info(`Payment succeeded: ${paymentIntent.id}`);
    await paymentService.updatePaymentStatus(
      paymentIntent.metadata.paymentId,
      'succeeded',
      paymentIntent.id
    );

    // Notify order service
    await paymentService.notifyOrderService(
      paymentIntent.metadata.orderId,
      'payment_completed',
      { paymentId: paymentIntent.metadata.paymentId }
    );
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    logger.info(`Payment failed: ${paymentIntent.id}`);
    const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';

    await paymentService.updatePaymentStatus(
      paymentIntent.metadata.paymentId,
      'failed',
      paymentIntent.id,
      failureMessage
    );

    await paymentService.notifyOrderService(
      paymentIntent.metadata.orderId,
      'payment_failed',
      { paymentId: paymentIntent.metadata.paymentId, error: failureMessage }
    );
  }

  private async handleRefund(charge: Stripe.Charge) {
    logger.info(`Refund processed for charge: ${charge.id}`);
    if (charge.payment_intent) {
      await paymentService.handleRefundCompleted(
        charge.payment_intent as string,
        charge.amount_refunded
      );
    }
  }

  private async handleDispute(dispute: Stripe.Dispute) {
    logger.warn(`Dispute created: ${dispute.id}`, {
      reason: dispute.reason,
      amount: dispute.amount,
    });
    // TODO: Implement dispute handling logic
  }
}
