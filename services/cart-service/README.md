# Cart Service

Shopping cart microservice with Redis-based storage for the e-commerce platform.

## Features

- Redis-based cart storage with 7-day TTL
- Guest and authenticated user cart support
- Cart merging when guest user logs in
- Discount code support
- Inventory validation
- Checkout preparation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cart` | Get current cart |
| POST | `/api/v1/cart/items` | Add item to cart |
| PUT | `/api/v1/cart/items/:productId` | Update item quantity |
| DELETE | `/api/v1/cart/items/:productId` | Remove item |
| DELETE | `/api/v1/cart` | Clear cart |
| POST | `/api/v1/cart/discount` | Apply discount code |
| DELETE | `/api/v1/cart/discount` | Remove discount |
| POST | `/api/v1/cart/merge` | Merge guest cart (auth required) |
| POST | `/api/v1/cart/checkout` | Initiate checkout (auth required) |

## Cart Identification

- **Authenticated users**: Cart ID is `user:{userId}`
- **Guest users**: Cart ID is `guest:{guestId}` (from `x-guest-id` header)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3003` |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `PRODUCT_SERVICE_URL` | Product service URL | - |
