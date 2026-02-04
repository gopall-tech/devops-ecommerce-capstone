import { PrismaClient, Prisma } from '@prisma/client';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface OrderItem {
  productId: string;
  quantity: number;
  price?: number;
  name?: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
}

export class OrderService {
  private snsClient: SNSClient | null = null;
  private readonly PRODUCT_SERVICE_URL: string;
  private readonly CART_SERVICE_URL: string;

  constructor() {
    this.PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
    this.CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:3003';

    if (process.env.AWS_REGION) {
      this.snsClient = new SNSClient({ region: process.env.AWS_REGION });
    }
  }

  async createOrder(input: CreateOrderInput) {
    const { userId, items, shippingAddress, billingAddress, notes } = input;

    // Fetch product details and validate inventory
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.fetchProduct(item.productId);
        if (product.inventory < item.quantity) {
          throw new AppError(`Insufficient inventory for ${product.name}`, 400);
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
        };
      })
    );

    // Calculate totals
    const subtotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // Create order
    const order = await prisma.order.create({
      data: {
        id: uuidv4(),
        userId,
        status: 'pending',
        subtotal,
        tax,
        shipping,
        total,
        shippingAddress: shippingAddress as unknown as Prisma.JsonObject,
        billingAddress: billingAddress as unknown as Prisma.JsonObject,
        notes,
        items: {
          create: enrichedItems.map((item) => ({
            id: uuidv4(),
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        statusHistory: {
          create: {
            id: uuidv4(),
            status: 'pending',
            notes: 'Order created',
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    });

    // Publish order created event
    await this.publishEvent('order.created', {
      orderId: order.id,
      userId,
      total,
      items: enrichedItems,
    });

    return order;
  }

  async getOrderById(id: string, userId?: string) {
    const where: Prisma.OrderWhereUniqueInput = { id };

    const order = await prisma.order.findUnique({
      where,
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (userId && order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return order;
  }

  async getUserOrders(userId: string, options: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllOrders(options: { page: number; limit: number; status?: string; userId?: string }) {
    const { page, limit, status, userId } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(userId && { userId }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateOrderStatus(id: string, status: string, notes?: string) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: { id: uuidv4(), status, notes },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'desc' } } },
    });

    await this.publishEvent('order.status_updated', {
      orderId: id,
      status,
      previousStatus: order.status,
    });

    return updatedOrder;
  }

  async cancelOrder(id: string, userId: string, reason?: string) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError('Cannot cancel order in current status', 400);
    }

    return this.updateOrderStatus(id, 'cancelled', reason || 'Cancelled by user');
  }

  async shipOrder(id: string, trackingNumber: string, carrier: string) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'processing') {
      throw new AppError('Order must be in processing status to ship', 400);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'shipped',
        trackingNumber,
        carrier,
        shippedAt: new Date(),
        statusHistory: {
          create: {
            id: uuidv4(),
            status: 'shipped',
            notes: `Shipped via ${carrier}. Tracking: ${trackingNumber}`,
          },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'desc' } } },
    });

    await this.publishEvent('order.shipped', {
      orderId: id,
      trackingNumber,
      carrier,
      userId: order.userId,
    });

    return updatedOrder;
  }

  async handlePaymentEvent(orderId: string, event: string, data: { paymentId?: string; error?: string }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      logger.error(`Order not found for payment event: ${orderId}`);
      return;
    }

    if (event === 'payment_completed') {
      await this.updateOrderStatus(orderId, 'confirmed', 'Payment received');

      // Reserve inventory
      await this.reserveInventory(orderId);
    } else if (event === 'payment_failed') {
      await this.updateOrderStatus(orderId, 'payment_failed', data.error || 'Payment failed');
    }
  }

  private async fetchProduct(productId: string): Promise<{ name: string; price: number; inventory: number }> {
    try {
      const response = await axios.get(`${this.PRODUCT_SERVICE_URL}/api/v1/products/${productId}`);
      return response.data.data.product;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new AppError('Product not found', 404);
      }
      throw new AppError('Failed to fetch product details', 500);
    }
  }

  private async reserveInventory(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;

    for (const item of order.items) {
      try {
        await axios.patch(`${this.PRODUCT_SERVICE_URL}/api/v1/products/${item.productId}/inventory`, {
          quantity: item.quantity,
          operation: 'subtract',
        });
      } catch (error) {
        logger.error(`Failed to reserve inventory for product ${item.productId}`, { error });
      }
    }
  }

  private async publishEvent(eventType: string, data: Record<string, unknown>) {
    if (!this.snsClient) {
      logger.info(`Event (local): ${eventType}`, data);
      return;
    }

    try {
      const topicArn = process.env.ORDER_EVENTS_TOPIC_ARN;
      if (!topicArn) return;

      await this.snsClient.send(new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({ eventType, data, timestamp: new Date().toISOString() }),
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: eventType },
        },
      }));

      logger.info(`Event published: ${eventType}`);
    } catch (error) {
      logger.error(`Failed to publish event: ${eventType}`, { error });
    }
  }
}
