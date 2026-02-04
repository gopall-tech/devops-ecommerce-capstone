import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
    },
  });

  const phones = await prisma.category.upsert({
    where: { slug: 'phones' },
    update: {},
    create: {
      name: 'Phones',
      slug: 'phones',
      description: 'Smartphones and accessories',
      parentId: electronics.id,
    },
  });

  const laptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Laptops and notebooks',
      parentId: electronics.id,
    },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and fashion',
    },
  });

  console.log('Categories created:', { electronics, phones, laptops, clothing });

  // Create products
  const products = [
    {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'Latest Apple iPhone with A17 Pro chip',
      price: 999.99,
      sku: 'APPL-IPH15P-001',
      inventory: 100,
      categoryId: phones.id,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy S24',
      slug: 'samsung-galaxy-s24',
      description: 'Flagship Samsung smartphone',
      price: 899.99,
      sku: 'SAMS-GS24-001',
      inventory: 150,
      categoryId: phones.id,
      isFeatured: true,
    },
    {
      name: 'MacBook Pro 14"',
      slug: 'macbook-pro-14',
      description: 'Apple MacBook Pro with M3 chip',
      price: 1999.99,
      sku: 'APPL-MBP14-001',
      inventory: 50,
      categoryId: laptops.id,
      isFeatured: true,
    },
    {
      name: 'Dell XPS 15',
      slug: 'dell-xps-15',
      description: 'Premium Windows laptop',
      price: 1599.99,
      sku: 'DELL-XPS15-001',
      inventory: 75,
      categoryId: laptops.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log('Products created');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
