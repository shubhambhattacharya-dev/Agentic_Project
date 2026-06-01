import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { logger } from './logger.js';
import { env } from './env.js';

// 1. Create the connection pool
const pool = new pg.Pool({ 
  connectionString: env.DATABASE_URL 
});

// 2. Initialize the adapter
const adapter = new PrismaPg(pool);

// 3. Initialize Prisma Client with the adapter
export const prisma = new PrismaClient({ adapter } as any);

// Test the database connection on startup
export const connectDB = async () => {
  try {
    // Ping the pool directly to verify connection
    await pool.query('SELECT 1');
    logger.info('🐘 Successfully connected to PostgreSQL database via Driver Adapter!');
  } catch (error) {
    logger.error(error, '❌ Failed to connect to PostgreSQL database');
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
  await pool.end();
  logger.info('🐘 Database connection and pool closed.');
};
