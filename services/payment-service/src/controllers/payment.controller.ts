import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();

export class PaymentController {
  async createPaymentIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { orderId, amount, currency = 'usd' } = req.body;

      const result = await paymentService.createPaymentIntent({
        userId,
        orderId,
        amount,
        currency,
      });

      logger.info(`Payment intent created for order ${orderId}`);

      res.status(201).json({
        success: true,
        message: 'Payment intent created',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const { paymentMethodId } = req.body;

      const payment = await paymentService.confirmPayment(paymentId, paymentMethodId);

      logger.info(`Payment confirmed: ${paymentId}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  }

  async refundPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId, amount, reason } = req.body;

      const refund = await paymentService.refundPayment(paymentId, amount, reason);

      logger.info(`Refund processed for payment ${paymentId}`);

      res.status(200).json({
        success: true,
        message: 'Refund processed',
        data: { refund },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPayment(paymentId);

      res.status(200).json({
        success: true,
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const payments = await paymentService.getPaymentsByOrder(orderId);

      res.status(200).json({
        success: true,
        data: { payments },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const methods = await paymentService.getPaymentMethods(userId);

      res.status(200).json({
        success: true,
        data: { methods },
      });
    } catch (error) {
      next(error);
    }
  }

  async addPaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { paymentMethodId } = req.body;

      const method = await paymentService.addPaymentMethod(userId, paymentMethodId);

      logger.info(`Payment method added for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Payment method added',
        data: { method },
      });
    } catch (error) {
      next(error);
    }
  }

  async removePaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { methodId } = req.params;

      await paymentService.removePaymentMethod(userId, methodId);

      logger.info(`Payment method removed for user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Payment method removed',
      });
    } catch (error) {
      next(error);
    }
  }
}
