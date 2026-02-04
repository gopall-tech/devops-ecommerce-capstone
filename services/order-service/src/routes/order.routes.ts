import { Router } from 'express';
import { body } from 'express-validator';
import { OrderController } from '../controllers/order.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const orderController = new OrderController();

const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').isUUID().withMessage('Valid product ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('shippingAddress').isObject().withMessage('Shipping address required'),
  body('shippingAddress.street').notEmpty().withMessage('Street required'),
  body('shippingAddress.city').notEmpty().withMessage('City required'),
  body('shippingAddress.state').notEmpty().withMessage('State required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip code required'),
  body('shippingAddress.country').notEmpty().withMessage('Country required'),
];

const updateStatusValidation = [
  body('status').isIn(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
];

router.use(authenticate);

// User routes
router.post('/', createOrderValidation, validateRequest, orderController.createOrder);
router.get('/my-orders', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);

// Internal routes (from other services)
router.post('/:id/payment-event', orderController.handlePaymentEvent);

// Admin routes
router.get('/', authorize('admin'), orderController.getAllOrders);
router.put('/:id/status', authorize('admin'), updateStatusValidation, validateRequest, orderController.updateOrderStatus);
router.post('/:id/ship', authorize('admin'), orderController.shipOrder);

export { router as orderRouter };
