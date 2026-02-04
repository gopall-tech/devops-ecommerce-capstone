import { Router } from 'express';
import { body } from 'express-validator';
import { CategoryController } from '../controllers/category.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const categoryController = new CategoryController();

// Validation rules
const createCategoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  body('parentId').optional().isUUID().withMessage('Valid parent category ID required'),
];

const updateCategoryValidation = [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().trim(),
  body('parentId').optional().isUUID().withMessage('Valid parent category ID required'),
];

// Public routes
router.get('/', categoryController.getCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/products', categoryController.getCategoryProducts);

// Protected routes - require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.post('/', createCategoryValidation, validateRequest, categoryController.createCategory);
router.put('/:id', updateCategoryValidation, validateRequest, categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export { router as categoryRouter };
