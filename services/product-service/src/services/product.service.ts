import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface ProductFilters {
  page: number;
  limit: number;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SearchFilters extends ProductFilters {
  query?: string;
}

interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sku: string;
  inventory: number;
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  inventory?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export class ProductService {
  private redis: Redis | null = null;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async getProducts(filters: ProductFilters) {
    const { page, limit, categoryId, minPrice, maxPrice, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(categoryId && { categoryId }),
      ...(minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchProducts(filters: SearchFilters) {
    const { query, page, limit, categoryId, minPrice, maxPrice, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput = sortBy === 'relevance'
      ? { createdAt: 'desc' }
      : { [sortBy]: sortOrder };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string) {
    // Try cache first
    if (this.redis) {
      const cached = await this.redis.get(`product:${id}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { isPrimary: 'desc' },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Cache the result
    if (this.redis) {
      await this.redis.setex(`product:${id}`, this.CACHE_TTL, JSON.stringify(product));
    }

    return product;
  }

  async getFeaturedProducts(limit: number) {
    const cacheKey = `featured:${limit}`;

    // Try cache first
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    // Cache the result
    if (this.redis) {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(products));
    }

    return products;
  }

  async createProduct(data: CreateProductInput) {
    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingProduct) {
      throw new AppError('Product with this SKU already exists', 400);
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        sku: data.sku,
        inventory: data.inventory,
        slug: this.generateSlug(data.name),
        images: data.images ? {
          create: data.images.map((img, index) => ({
            url: img.url,
            alt: img.alt || data.name,
            isPrimary: img.isPrimary || index === 0,
          })),
        } : undefined,
      },
      include: {
        category: true,
        images: true,
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return product;
  }

  async updateProduct(id: string, data: UpdateProductInput) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError('Category not found', 404);
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        slug: data.name ? this.generateSlug(data.name) : undefined,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        images: true,
      },
    });

    // Invalidate cache
    await this.invalidateProductCache(id);

    return updatedProduct;
  }

  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.invalidateProductCache(id);
  }

  async updateInventory(id: string, quantity: number, operation: 'add' | 'subtract' | 'set') {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    let newInventory: number;
    switch (operation) {
      case 'add':
        newInventory = product.inventory + quantity;
        break;
      case 'subtract':
        newInventory = product.inventory - quantity;
        if (newInventory < 0) {
          throw new AppError('Insufficient inventory', 400);
        }
        break;
      case 'set':
        newInventory = quantity;
        break;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { inventory: newInventory },
    });

    // Publish inventory event
    logger.info(`Inventory updated for product ${id}: ${product.inventory} -> ${newInventory}`);

    // Invalidate cache
    await this.invalidateProductCache(id);

    return updatedProduct;
  }

  async addProductImage(productId: string, imageData: { url: string; alt?: string; isPrimary?: boolean }) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // If this is set as primary, unset other primary images
    if (imageData.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.productImage.create({
      data: {
        productId,
        url: imageData.url,
        alt: imageData.alt || product.name,
        isPrimary: imageData.isPrimary || false,
      },
    });

    await this.invalidateProductCache(productId);

    return image;
  }

  async removeProductImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new AppError('Image not found', 404);
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    await this.invalidateProductCache(productId);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async invalidateProductCache(id: string) {
    if (this.redis) {
      await this.redis.del(`product:${id}`);
      await this.invalidateCache();
    }
  }

  private async invalidateCache() {
    if (this.redis) {
      const keys = await this.redis.keys('featured:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
