import Redis from 'ioredis';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: {
    code: string | null;
    amount: number;
    type: 'percentage' | 'fixed' | null;
  };
  total: number;
  itemCount: number;
  updatedAt: string;
}

interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  expiresAt?: string;
}

export class CartService {
  private redis: Redis;
  private readonly CART_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly PRODUCT_SERVICE_URL: string;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
  }

  async getCart(cartId: string): Promise<Cart> {
    const cartKey = `cart:${cartId}`;
    const cartData = await this.redis.get(cartKey);

    if (!cartData) {
      return this.createEmptyCart(cartId);
    }

    return JSON.parse(cartData);
  }

  async addItem(cartId: string, productId: string, quantity: number): Promise<Cart> {
    // Fetch product details from product service
    const product = await this.fetchProduct(productId);

    if (product.inventory < quantity) {
      throw new AppError('Insufficient inventory', 400);
    }

    const cart = await this.getCart(cartId);
    const existingItemIndex = cart.items.findIndex((item) => item.productId === productId);

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (product.inventory < newQuantity) {
        throw new AppError('Insufficient inventory', 400);
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.images?.[0]?.url,
      });
    }

    return this.saveCart(cartId, cart);
  }

  async updateItem(cartId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.getCart(cartId);
    const itemIndex = cart.items.findIndex((item) => item.productId === productId);

    if (itemIndex === -1) {
      throw new AppError('Item not found in cart', 404);
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await this.fetchProduct(productId);
      if (product.inventory < quantity) {
        throw new AppError('Insufficient inventory', 400);
      }
      cart.items[itemIndex].quantity = quantity;
    }

    return this.saveCart(cartId, cart);
  }

  async removeItem(cartId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(cartId);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    return this.saveCart(cartId, cart);
  }

  async clearCart(cartId: string): Promise<void> {
    const cartKey = `cart:${cartId}`;
    await this.redis.del(cartKey);
  }

  async applyDiscount(cartId: string, code: string): Promise<Cart> {
    const cart = await this.getCart(cartId);
    const discount = await this.validateDiscountCode(code, cart.subtotal);

    cart.discount = {
      code: discount.code,
      amount: this.calculateDiscountAmount(discount, cart.subtotal),
      type: discount.type,
    };

    return this.saveCart(cartId, cart);
  }

  async removeDiscount(cartId: string): Promise<Cart> {
    const cart = await this.getCart(cartId);
    cart.discount = { code: null, amount: 0, type: null };
    return this.saveCart(cartId, cart);
  }

  async mergeCart(guestCartId: string, userId: string): Promise<Cart> {
    const guestCart = await this.getCart(`guest:${guestCartId}`);
    const userCart = await this.getCart(`user:${userId}`);

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingIndex = userCart.items.findIndex(
        (item) => item.productId === guestItem.productId
      );

      if (existingIndex > -1) {
        userCart.items[existingIndex].quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }

    // Clear guest cart
    await this.clearCart(`guest:${guestCartId}`);

    return this.saveCart(`user:${userId}`, userCart);
  }

  async prepareCheckout(userId: string, cart: Cart) {
    // Validate all items are still available
    const validatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.fetchProduct(item.productId);
        if (product.inventory < item.quantity) {
          return {
            ...item,
            available: false,
            maxQuantity: product.inventory,
          };
        }
        return {
          ...item,
          available: true,
          currentPrice: product.price,
        };
      })
    );

    const unavailableItems = validatedItems.filter((item) => !item.available);
    if (unavailableItems.length > 0) {
      return {
        valid: false,
        unavailableItems,
        message: 'Some items in your cart are no longer available',
      };
    }

    return {
      valid: true,
      checkoutId: uuidv4(),
      items: validatedItems,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };
  }

  private createEmptyCart(id: string): Cart {
    return {
      id,
      items: [],
      subtotal: 0,
      discount: { code: null, amount: 0, type: null },
      total: 0,
      itemCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  private async saveCart(cartId: string, cart: Cart): Promise<Cart> {
    // Recalculate totals
    cart.subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.total = Math.max(0, cart.subtotal - cart.discount.amount);
    cart.updatedAt = new Date().toISOString();

    const cartKey = `cart:${cartId}`;
    await this.redis.setex(cartKey, this.CART_TTL, JSON.stringify(cart));

    return cart;
  }

  private async fetchProduct(productId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.PRODUCT_SERVICE_URL}/api/v1/products/${productId}`
      );
      return response.data.data.product;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new AppError('Product not found', 404);
      }
      logger.error('Failed to fetch product', { productId, error });
      throw new AppError('Failed to fetch product details', 500);
    }
  }

  private async validateDiscountCode(code: string, subtotal: number): Promise<DiscountCode> {
    // In a real system, this would fetch from a database or discount service
    const discounts: Record<string, DiscountCode> = {
      SAVE10: { code: 'SAVE10', type: 'percentage', value: 10 },
      FLAT20: { code: 'FLAT20', type: 'fixed', value: 20, minPurchase: 50 },
      WELCOME15: { code: 'WELCOME15', type: 'percentage', value: 15, maxDiscount: 50 },
    };

    const discount = discounts[code.toUpperCase()];
    if (!discount) {
      throw new AppError('Invalid discount code', 400);
    }

    if (discount.minPurchase && subtotal < discount.minPurchase) {
      throw new AppError(
        `Minimum purchase of $${discount.minPurchase} required for this code`,
        400
      );
    }

    return discount;
  }

  private calculateDiscountAmount(discount: DiscountCode, subtotal: number): number {
    let amount: number;

    if (discount.type === 'percentage') {
      amount = (subtotal * discount.value) / 100;
    } else {
      amount = discount.value;
    }

    if (discount.maxDiscount) {
      amount = Math.min(amount, discount.maxDiscount);
    }

    return Math.round(amount * 100) / 100;
  }
}
