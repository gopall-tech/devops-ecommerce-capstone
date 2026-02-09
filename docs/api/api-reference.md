# E-Commerce Platform API Reference

## Base URL
- **Production**: `https://api.ecommerce.example.com`
- **Staging**: `https://staging-api.ecommerce.example.com`
- **Development**: `https://dev-api.ecommerce.example.com`

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## User Service (Port 3000)

### POST /api/auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer",
  "createdAt": "2026-02-04T09:00:00Z"
}
```

### POST /api/auth/login
Authenticate a user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

### POST /api/auth/refresh
Refresh an expired access token.

### GET /api/users/profile
Get the authenticated user's profile.

### PUT /api/users/profile
Update the authenticated user's profile.

### PUT /api/users/password
Change the authenticated user's password.

---

## Product Service (Port 3001)

### GET /api/products
List products with pagination and filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| category | string | - | Filter by category |
| minPrice | number | - | Minimum price |
| maxPrice | number | - | Maximum price |
| search | string | - | Search query |
| sort | string | createdAt | Sort field |
| order | string | desc | Sort order (asc/desc) |

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "description": "Product description",
      "price": 2999,
      "category": "electronics",
      "images": ["https://..."],
      "stock": 150,
      "rating": 4.5,
      "reviewCount": 42
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET /api/products/:id
Get a single product by ID.

### POST /api/products (Admin)
Create a new product.

### PUT /api/products/:id (Admin)
Update an existing product.

### DELETE /api/products/:id (Admin)
Delete a product.

### GET /api/categories
List all product categories.

---

## Cart Service (Port 3002)

### GET /api/cart
Get the current user's cart.

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "name": "Product Name",
      "price": 2999,
      "quantity": 2,
      "subtotal": 5998
    }
  ],
  "total": 5998,
  "itemCount": 2
}
```

### POST /api/cart/items
Add an item to the cart.

**Request Body:**
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

### PUT /api/cart/items/:productId
Update item quantity.

### DELETE /api/cart/items/:productId
Remove an item from the cart.

### DELETE /api/cart
Clear the entire cart.

---

## Payment Service (Port 3003)

### POST /api/payments/create-intent
Create a Stripe payment intent.

**Request Body:**
```json
{
  "orderId": "uuid",
  "amount": 5998,
  "currency": "usd"
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### POST /api/payments/confirm
Confirm a payment.

### GET /api/payments/:id
Get payment details.

### POST /api/payments/refund
Process a refund.

### POST /api/payments/webhook
Stripe webhook handler (internal).

---

## Order Service (Port 3004)

### POST /api/orders
Create a new order.

**Request Body:**
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orderNumber": "ORD-20260204-001",
  "status": "pending",
  "items": [...],
  "total": 5998,
  "shippingAddress": {...},
  "createdAt": "2026-02-04T09:00:00Z"
}
```

### GET /api/orders
List user's orders with pagination.

### GET /api/orders/:id
Get order details.

### PUT /api/orders/:id/cancel
Cancel a pending order.

### GET /api/orders/:id/status
Get order status.

---

## Health Check Endpoints

All services expose:
- `GET /health` - Liveness probe (200 if service is running)
- `GET /health/ready` - Readiness probe (200 if dependencies are connected)
- `GET /metrics` - Prometheus metrics endpoint

---

## Error Response Format

All errors follow a consistent format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes
| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 requests/minute |
| API (authenticated) | 100 requests/minute |
| API (unauthenticated) | 30 requests/minute |
| Webhooks | 1000 requests/minute |
