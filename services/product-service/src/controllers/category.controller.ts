import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { logger } from '../utils/logger';

const categoryService = new CategoryService();

export class CategoryController {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getCategories();

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await categoryService.getCategoryTree();

      res.status(200).json({
        success: true,
        data: { categories: tree },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await categoryService.getCategoryById(id);

      res.status(200).json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await categoryService.getCategoryProducts(id, {
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, parentId } = req.body;
      const category = await categoryService.createCategory({
        name,
        description,
        parentId,
      });

      logger.info(`Category created: ${category.id}`);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const category = await categoryService.updateCategory(id, updateData);

      logger.info(`Category updated: ${id}`);

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await categoryService.deleteCategory(id);

      logger.info(`Category deleted: ${id}`);

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
