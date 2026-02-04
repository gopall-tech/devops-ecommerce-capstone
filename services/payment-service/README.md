# Payment Service

Payment processing microservice with Stripe integration for the e-commerce platform.

## Features

- Stripe payment intent creation
- Payment confirmation
- Refund processing
- Payment method management
- Webhook handling for Stripe events

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/intent` | Create payment intent |
| POST | `/api/v1/payments/confirm/:paymentId` | Confirm payment |
| POST | `/api/v1/payments/refund` | Process refund |
| GET | `/api/v1/payments/:paymentId` | Get payment details |
| GET | `/api/v1/payments/order/:orderId` | Get payments by order |
| GET | `/api/v1/payments/methods` | List payment methods |
| POST | `/api/v1/payments/methods` | Add payment method |
| DELETE | `/api/v1/payments/methods/:methodId` | Remove payment method |

## Webhook Events

- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed
- `charge.dispute.created` - Dispute opened

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## Stripe Test Cards

| Number | Description |
|--------|-------------|
| 4242424242424242 | Success |
| 4000000000000002 | Decline |
| 4000000000009995 | Insufficient funds |
