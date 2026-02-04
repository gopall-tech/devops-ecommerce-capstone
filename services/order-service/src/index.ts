import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { orderRouter } from './routes/order.routes';
import { healthRouter } from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use('/health', healthRouter);
app.use('/api/v1/orders', orderRouter);

app.use(errorHandler);
app.use((req, res) => res.status(404).json({ success: false, message: 'Resource not found' }));

app.listen(PORT, () => {
  logger.info(`Order Service running on port ${PORT}`);
});

export default app;
