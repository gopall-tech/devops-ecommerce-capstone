import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { logger } from '../utils/logger';

const productService = new ProductService();

export class ProductController {
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const result = await productService.getProducts({
        page: Number(page),
        limit: Number(limit),
        categoryId: category as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        category,
        minPrice,
        maxPrice,
        sortBy = 'relevance',
        sortOrder = 'desc',
      } = req.query;

      const result = await productService.searchProducts({
        query: q as string,
        page: Number(page),
        limit: Number(limit),
        categoryId: category as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 10;
      const products = await productService.getFeaturedProducts(limit);

      res.status(200).json({
        success: true,
        data: { products },
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productData = req.body;
      const product = await productService.createProduct(productData);

      logger.info(`Product created: ${product.id}`);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const product = await productService.updateProduct(id, updateData);

      logger.info(`Product updated: ${id}`);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await productService.deleteProduct(id);

      logger.info(`Product deleted: ${id}`);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, operation } = req.body;
      const product = await productService.updateInventory(id, quantity, operation);

      logger.info(`Inventory updated for product ${id}: ${operation} ${quantity}`);

      res.status(200).json({
        success: true,
        message: 'Inventory updated successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  async addProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { url, alt, isPrimary } = req.body;
      const image = await productService.addProductImage(id, { url, alt, isPrimary });

      logger.info(`Image added to product ${id}`);

      res.status(201).json({
        success: true,
        message: 'Image added successfully',
        data: { image },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, imageId } = req.params;
      await productService.removeProductImage(id, imageId);

      logger.info(`Image ${imageId} removed from product ${id}`);

      res.status(200).json({
        success: true,
        message: 'Image removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
