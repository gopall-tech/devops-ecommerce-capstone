// Integration Tests for API Gateway
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:3005';

describe('API Gateway Integration Tests', () => {
  let authToken: string;
  let userId: string;

  // Authentication Tests
  describe('Authentication Flow', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Integration',
      lastName: 'Test',
    };

    it('should register a new user', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      userId = response.body.id;
    });

    it('should login and receive tokens', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      authToken = response.body.accessToken;
    });

    it('should reject login with wrong password', async () => {
      await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should get user profile with valid token', async () => {
      const response = await request(API_URL)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      await request(API_URL)
        .get('/api/users/profile')
        .expect(401);
    });
  });

  // Product Tests
  describe('Product Catalog', () => {
    it('should list products', async () => {
      const response = await request(API_URL)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should filter products by category', async () => {
      const response = await request(API_URL)
        .get('/api/products?category=electronics')
        .expect(200);

      response.body.products.forEach((product: any) => {
        expect(product.category).toBe('electronics');
      });
    });

    it('should paginate products', async () => {
      const response = await request(API_URL)
        .get('/api/products?page=1&limit=5')
        .expect(200);

      expect(response.body.products.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  // Cart Tests
  describe('Shopping Cart', () => {
    it('should get empty cart', async () => {
      const response = await request(API_URL)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should add item to cart', async () => {
      const response = await request(API_URL)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 'test-product-id',
          quantity: 2,
        })
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should clear cart', async () => {
      await request(API_URL)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  // Health Check Tests
  describe('Health Checks', () => {
    it('should return healthy status', async () => {
      const response = await request(API_URL)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should return ready status', async () => {
      const response = await request(API_URL)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  // Rate Limiting Tests
  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array.from({ length: 110 }, () =>
        request(API_URL).get('/api/products')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
