import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { logger } from '../utils/logger';

const orderService = new OrderService();

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { items, shippingAddress, billingAddress, notes } = req.body;

      const order = await orderService.createOrder({
        userId,
        items,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        notes,
      });

      logger.info(`Order created: ${order.id} for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const order = await orderService.getOrderById(id, isAdmin ? undefined : userId);

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10, status } = req.query;

      const result = await orderService.getUserOrders(userId, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, userId } = req.query;

      const result = await orderService.getAllOrders({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        userId: userId as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const order = await orderService.updateOrderStatus(id, status, notes);

      logger.info(`Order ${id} status updated to ${status}`);

      res.status(200).json({
        success: true,
        message: 'Order status updated',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(id, userId, reason);

      logger.info(`Order ${id} cancelled by user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Order cancelled',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }

  async shipOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { trackingNumber, carrier } = req.body;

      const order = await orderService.shipOrder(id, trackingNumber, carrier);

      logger.info(`Order ${id} shipped with tracking ${trackingNumber}`);

      res.status(200).json({
        success: true,
        message: 'Order shipped',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }

  async handlePaymentEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { event, paymentId, error } = req.body;

      await orderService.handlePaymentEvent(id, event, { paymentId, error });

      logger.info(`Payment event ${event} handled for order ${id}`);

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
