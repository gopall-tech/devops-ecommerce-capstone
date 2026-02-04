import { Router } from 'express';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

const createPaymentIntentValidation = [
  body('orderId').isUUID().withMessage('Valid order ID required'),
  body('amount').isFloat({ min: 0.5 }).withMessage('Amount must be at least $0.50'),
  body('currency').optional().isIn(['usd', 'eur', 'gbp']).withMessage('Invalid currency'),
];

const refundValidation = [
  body('paymentId').isUUID().withMessage('Valid payment ID required'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer']),
];

router.use(authenticate);

router.post('/intent', createPaymentIntentValidation, validateRequest, paymentController.createPaymentIntent);
router.post('/confirm/:paymentId', paymentController.confirmPayment);
router.post('/refund', refundValidation, validateRequest, paymentController.refundPayment);
router.get('/methods', paymentController.getPaymentMethods);
router.post('/methods', paymentController.addPaymentMethod);
router.delete('/methods/:methodId', paymentController.removePaymentMethod);
router.get('/:paymentId', paymentController.getPayment);
router.get('/order/:orderId', paymentController.getPaymentsByOrder);

export { router as paymentRouter };
