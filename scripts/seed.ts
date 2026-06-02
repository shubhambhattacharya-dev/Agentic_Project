import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config";

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data in order of dependency
  console.log('🧹 Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.agentMessage.deleteMany();
  await prisma.agentSession.deleteMany();
  await prisma.lLMOpsMetric.deleteMany();
  await prisma.customer.deleteMany();

  // 2. Create Customers
  console.log('👤 Seeding Customers...');
  const customers = [
    {
      id: 'cust-001',
      name: 'Shubham Bhattacharya',
      email: 'shubham@example.com',
      role: 'CUSTOMER' as const,
    },
    {
      id: 'cust-002',
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      role: 'CUSTOMER' as const,
    },
    {
      id: 'cust-003',
      name: 'Pooja Patel',
      email: 'pooja@example.com',
      role: 'CUSTOMER' as const,
    },
    {
      id: 'admin-001',
      name: 'Gigi Admin User',
      email: 'admin@gigienergy.com',
      role: 'ADMIN' as const,
    },
  ];

  for (const c of customers) {
    await prisma.customer.create({ data: c });
  }

  // 3. Create Products
  console.log('🥤 Seeding Products...');
  const products = [
    {
      id: 'p1',
      name: 'Gigi Pineapple Coconut',
      price: '125.00',
      stock: 50,
    },
    {
      id: 'p2',
      name: 'Gigi Lemon Lime',
      price: '125.00',
      stock: 35,
    },
    {
      id: 'p3',
      name: 'Gigi Trial Pack',
      price: '396.00',
      stock: 20,
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  // 4. Create Orders
  console.log('📦 Seeding Orders...');
  const orders = [
    {
      id: 'gigi-101',
      customerId: 'cust-001',
      status: 'DELIVERED' as const,
      totalAmount: '625.00',
      shippingAddress: 'B-201, Shanti Kunj, Surat, Gujarat',
      items: [
        {
          productId: 'p2',
          quantity: 5,
          price: '125.00',
        },
      ],
    },
    {
      id: 'gigi-102',
      customerId: 'cust-002',
      status: 'DELIVERED' as const,
      totalAmount: '125.00',
      shippingAddress: 'Flat 405, Heights Residency, Mumbai',
      items: [
        {
          productId: 'p1',
          quantity: 1,
          price: '125.00',
        },
      ],
    },
    {
      id: 'gigi-103',
      customerId: 'cust-003',
      status: 'PLACED' as const,
      totalAmount: '396.00',
      shippingAddress: 'Sector 15, Gandhinagar, Gujarat',
      items: [
        {
          productId: 'p3',
          quantity: 1,
          price: '396.00',
        },
      ],
    },
    {
      id: 'gigi-104',
      customerId: 'cust-003',
      status: 'SHIPPED' as const,
      totalAmount: '396.00',
      shippingAddress: 'Sector 15, Gandhinagar, Gujarat',
      items: [
        {
          productId: 'p3',
          quantity: 1,
          price: '396.00',
        },
      ],
    },
  ];

  for (const o of orders) {
    const { items, ...orderData } = o;
    // Create order and its items in a transaction
    await prisma.order.create({
      data: {
        ...orderData,
        items: {
          create: items,
        },
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
