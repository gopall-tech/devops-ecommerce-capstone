import { Router } from 'express';
import { body } from 'express-validator';
import { CartController } from '../controllers/cart.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();
const cartController = new CartController();

const addItemValidation = [
  body('productId').isUUID().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

const updateItemValidation = [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
];

const applyDiscountValidation = [
  body('code').trim().notEmpty().withMessage('Discount code is required'),
];

// Routes with optional auth (supports both guest and authenticated users)
router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, addItemValidation, validateRequest, cartController.addItem);
router.put('/items/:productId', optionalAuth, updateItemValidation, validateRequest, cartController.updateItem);
router.delete('/items/:productId', optionalAuth, cartController.removeItem);
router.delete('/', optionalAuth, cartController.clearCart);
router.post('/discount', optionalAuth, applyDiscountValidation, validateRequest, cartController.applyDiscount);
router.delete('/discount', optionalAuth, cartController.removeDiscount);

// Authenticated routes
router.post('/merge', authenticate, cartController.mergeGuestCart);
router.post('/checkout', authenticate, cartController.initiateCheckout);

export { router as cartRouter };
