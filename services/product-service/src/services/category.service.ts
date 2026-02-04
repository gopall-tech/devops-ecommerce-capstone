import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
}

interface UpdateCategoryInput {
  name?: string;
  description?: string;
  parentId?: string;
}

interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children?: CategoryWithChildren[];
}

export class CategoryService {
  async getCategories() {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return categories;
  }

  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create all category objects
    categories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        children: [],
      });
    });

    // Second pass: build the tree
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return category;
  }

  async getCategoryProducts(id: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Get all child category IDs for nested product search
    const childCategories = await this.getChildCategoryIds(id);
    const categoryIds = [id, ...childCategories];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
        },
        skip,
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
      }),
      prisma.product.count({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
        },
      }),
    ]);

    return {
      category,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createCategory(data: CreateCategoryInput) {
    // Check for duplicate name at the same level
    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        parentId: data.parentId || null,
      },
    });

    if (existing) {
      throw new AppError('Category with this name already exists', 400);
    }

    // Validate parent if provided
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Parent category not found', 404);
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: this.generateSlug(data.name),
        description: data.description,
        parentId: data.parentId,
      },
    });

    return category;
  }

  async updateCategory(id: string, data: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check for duplicate name at the same level
    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: data.name,
          parentId: data.parentId ?? category.parentId,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError('Category with this name already exists', 400);
      }
    }

    // Validate parent if provided
    if (data.parentId) {
      // Cannot set parent to self
      if (data.parentId === id) {
        throw new AppError('Category cannot be its own parent', 400);
      }

      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Parent category not found', 404);
      }

      // Check for circular reference
      const isDescendant = await this.isDescendant(data.parentId, id);
      if (isDescendant) {
        throw new AppError('Circular reference detected', 400);
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        slug: data.name ? this.generateSlug(data.name) : undefined,
        updatedAt: new Date(),
      },
    });

    return updatedCategory;
  }

  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category.children.length > 0) {
      throw new AppError('Cannot delete category with subcategories', 400);
    }

    if (category._count.products > 0) {
      throw new AppError('Cannot delete category with products', 400);
    }

    await prisma.category.delete({
      where: { id },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async getChildCategoryIds(parentId: string): Promise<string[]> {
    const children = await prisma.category.findMany({
      where: { parentId },
      select: { id: true },
    });

    const childIds = children.map((c) => c.id);
    const grandchildIds = await Promise.all(
      childIds.map((id) => this.getChildCategoryIds(id))
    );

    return [...childIds, ...grandchildIds.flat()];
  }

  private async isDescendant(categoryId: string, potentialAncestorId: string): Promise<boolean> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return false;
    }

    if (category.parentId === potentialAncestorId) {
      return true;
    }

    if (category.parentId) {
      return this.isDescendant(category.parentId, potentialAncestorId);
    }

    return false;
  }
}
