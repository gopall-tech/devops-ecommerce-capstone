# Order Service

Order management microservice with event-driven architecture for the e-commerce platform.

## Features

- Order creation and management
- Status tracking with history
- Event publishing to SNS
- Integration with payment and inventory
- Shipping and delivery tracking

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create order |
| GET | `/api/v1/orders/my-orders` | Get user's orders |
| GET | `/api/v1/orders/:id` | Get order by ID |
| POST | `/api/v1/orders/:id/cancel` | Cancel order |
| GET | `/api/v1/orders` | List all orders (admin) |
| PUT | `/api/v1/orders/:id/status` | Update status (admin) |
| POST | `/api/v1/orders/:id/ship` | Ship order (admin) |

## Order Statuses

- `pending` - Order created, awaiting payment
- `confirmed` - Payment received
- `processing` - Being prepared
- `shipped` - In transit
- `delivered` - Completed
- `cancelled` - Cancelled
- `payment_failed` - Payment issue

## Events Published

- `order.created` - New order placed
- `order.status_updated` - Status changed
- `order.shipped` - Order shipped

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```
