import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { paymentRouter } from './routes/payment.routes';
import { webhookRouter } from './routes/webhook.routes';
import { healthRouter } from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

// Webhook route needs raw body for Stripe signature verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use('/health', healthRouter);
app.use('/api/v1/payments', paymentRouter);

app.use(errorHandler);
app.use((req, res) => res.status(404).json({ success: false, message: 'Resource not found' }));

app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});

export default app;
