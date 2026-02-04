import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

router.post('/stripe', webhookController.handleStripeWebhook);

export { router as webhookRouter };
