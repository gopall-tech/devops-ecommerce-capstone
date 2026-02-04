import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { logger } from '../utils/logger';

const cartService = new CartService();

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      const cart = await cartService.getCart(cartId);

      res.status(200).json({
        success: true,
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      const { productId, quantity } = req.body;

      const cart = await cartService.addItem(cartId, productId, quantity);

      logger.info(`Item added to cart ${cartId}: ${productId} x ${quantity}`);

      res.status(200).json({
        success: true,
        message: 'Item added to cart',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      const { productId } = req.params;
      const { quantity } = req.body;

      const cart = await cartService.updateItem(cartId, productId, quantity);

      logger.info(`Cart ${cartId} item updated: ${productId} -> ${quantity}`);

      res.status(200).json({
        success: true,
        message: quantity > 0 ? 'Item updated' : 'Item removed',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      const { productId } = req.params;

      const cart = await cartService.removeItem(cartId, productId);

      logger.info(`Item removed from cart ${cartId}: ${productId}`);

      res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      await cartService.clearCart(cartId);

      logger.info(`Cart cleared: ${cartId}`);

      res.status(200).json({
        success: true,
        message: 'Cart cleared',
      });
    } catch (error) {
      next(error);
    }
  }

  async applyDiscount(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      const { code } = req.body;

      const cart = await cartService.applyDiscount(cartId, code);

      logger.info(`Discount applied to cart ${cartId}: ${code}`);

      res.status(200).json({
        success: true,
        message: 'Discount applied',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeDiscount(req: Request, res: Response, next: NextFunction) {
    try {
      const cartId = this.getCartId(req);
      const cart = await cartService.removeDiscount(cartId);

      res.status(200).json({
        success: true,
        message: 'Discount removed',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async mergeGuestCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { guestCartId } = req.body;

      const cart = await cartService.mergeCart(guestCartId, userId);

      logger.info(`Guest cart merged for user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Cart merged successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  async initiateCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const cart = await cartService.getCart(userId);

      if (!cart.items.length) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty',
        });
      }

      const checkoutData = await cartService.prepareCheckout(userId, cart);

      res.status(200).json({
        success: true,
        message: 'Checkout initiated',
        data: checkoutData,
      });
    } catch (error) {
      next(error);
    }
  }

  private getCartId(req: Request): string {
    // Use user ID if authenticated, otherwise use session/guest ID
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    const guestId = req.headers['x-guest-id'] as string || req.cookies?.guestId;
    if (guestId) {
      return `guest:${guestId}`;
    }

    // Generate new guest ID
    const newGuestId = require('uuid').v4();
    return `guest:${newGuestId}`;
  }
}
