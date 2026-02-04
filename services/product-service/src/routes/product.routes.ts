import { Router } from 'express';
import { body, query } from 'express-validator';
import { ProductController } from '../controllers/product.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';

const router = Router();
const productController = new ProductController();

// Validation rules
const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
  body('categoryId').isUUID().withMessage('Valid category ID is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('inventory').isInt({ min: 0 }).withMessage('Inventory must be non-negative'),
];

const updateProductValidation = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
  body('categoryId').optional().isUUID().withMessage('Valid category ID is required'),
  body('inventory').optional().isInt({ min: 0 }).withMessage('Inventory must be non-negative'),
];

const searchValidation = [
  query('q').optional().trim(),
  query('category').optional().isUUID().withMessage('Valid category ID required'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
];

const inventoryValidation = [
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('operation').isIn(['add', 'subtract', 'set']).withMessage('Operation must be add, subtract, or set'),
];

// Public routes
router.get('/', optionalAuth, searchValidation, validateRequest, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/search', searchValidation, validateRequest, productController.searchProducts);
router.get('/:id', optionalAuth, productController.getProductById);

// Protected routes - require authentication
router.use(authenticate);

// Admin only routes
router.post('/', authorize('admin'), createProductValidation, validateRequest, productController.createProduct);
router.put('/:id', authorize('admin'), updateProductValidation, validateRequest, productController.updateProduct);
router.delete('/:id', authorize('admin'), productController.deleteProduct);
router.patch('/:id/inventory', authorize('admin'), inventoryValidation, validateRequest, productController.updateInventory);
router.post('/:id/images', authorize('admin'), productController.addProductImage);
router.delete('/:id/images/:imageId', authorize('admin'), productController.removeProductImage);

export { router as productRouter };
