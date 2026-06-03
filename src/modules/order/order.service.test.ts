import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db.js', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      update: vi.fn(),
    },
    refundRequest: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { cancelOrder, processRefund, getOrderById } from './order.service.js';
import { prisma } from '../../config/db.js';

describe('cancelOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels a PLACED order successfully', async () => {
    const mockOrder = { id: 'gigi-101', customerId: 'cust-001', status: 'PLACED', items: [{ productId: 'p1', quantity: 2 }] };
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        order: { findUnique: vi.fn().mockResolvedValue(mockOrder), update: vi.fn().mockReturnValue({ ...mockOrder, status: 'CANCELLED' }) },
        product: { update: vi.fn() },
      };
      return fn(tx);
    });

    const result = await cancelOrder('gigi-101', 'cust-001');
    expect(result.success).toBe(true);
    expect(result.message).toContain('cancelled');
  });

  it('rejects cancellation for wrong owner', async () => {
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        order: { findUnique: vi.fn().mockResolvedValue({ id: 'gigi-101', customerId: 'cust-999', status: 'PLACED', items: [] }) },
      };
      return fn(tx);
    });

    const result = await cancelOrder('gigi-101', 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not authorized');
  });

  it('rejects cancellation for SHIPPED order', async () => {
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        order: { findUnique: vi.fn().mockResolvedValue({ id: 'gigi-101', customerId: 'cust-001', status: 'SHIPPED', items: [] }) },
      };
      return fn(tx);
    });

    const result = await cancelOrder('gigi-101', 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('despatched');
  });

  it('rejects cancellation for already CANCELLED order', async () => {
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        order: { findUnique: vi.fn().mockResolvedValue({ id: 'gigi-101', customerId: 'cust-001', status: 'CANCELLED', items: [] }) },
      };
      return fn(tx);
    });

    const result = await cancelOrder('gigi-101', 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('already cancelled');
  });

  it('returns not found for nonexistent order', async () => {
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        order: { findUnique: vi.fn().mockResolvedValue(null) },
      };
      return fn(tx);
    });

    const result = await cancelOrder('nonexistent', 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});

describe('processRefund', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auto-approves damage claim under 500', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'gigi-101', customerId: 'cust-001', status: 'DELIVERED', totalAmount: 400 });
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        refundRequest: { create: vi.fn() },
        order: { update: vi.fn().mockReturnValue({ id: 'gigi-101', status: 'REFUNDED' }) },
      };
      return fn(tx);
    });

    const result = await processRefund('gigi-101', 'damaged', true, 'cust-001');
    expect(result.success).toBe(true);
    expect(result.message).toContain('approved automatically');
  });

  it('creates pending approval for amount >= 500', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'gigi-101', customerId: 'cust-001', status: 'DELIVERED', totalAmount: 600 });
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        refundRequest: { create: vi.fn() },
        order: { update: vi.fn().mockReturnValue({ id: 'gigi-101', status: 'REFUND_PENDING_APPROVAL' }) },
      };
      return fn(tx);
    });

    const result = await processRefund('gigi-101', 'changed mind', false, 'cust-001');
    expect(result.success).toBe(true);
    expect(result.message).toContain('manual Admin approval');
  });

  it('rejects refund for non-DELIVERED order', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'gigi-101', customerId: 'cust-001', status: 'PLACED', totalAmount: 100 });

    const result = await processRefund('gigi-101', 'reason', false, 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('delivered');
  });

  it('rejects refund for wrong owner', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'gigi-101', customerId: 'cust-999', status: 'DELIVERED', totalAmount: 100 });

    const result = await processRefund('gigi-101', 'reason', false, 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not authorized');
  });

  it('rejects refund for already REFUNDED order', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'gigi-101', customerId: 'cust-001', status: 'REFUNDED', totalAmount: 100 });

    const result = await processRefund('gigi-101', 'reason', false, 'cust-001');
    expect(result.success).toBe(false);
    expect(result.message).toContain('already been processed');
  });
});

describe('getOrderById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns order when customer owns it', async () => {
    const mockOrder = { id: 'gigi-101', customerId: 'cust-001', items: [], customer: {}, refunds: [] };
    (prisma.order.findUnique as any).mockResolvedValue(mockOrder);

    const result = await getOrderById('gigi-101', 'cust-001');
    expect(result).toEqual(mockOrder);
  });

  it('returns null when customer does not own the order', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({ id: 'gigi-101', customerId: 'cust-999' });

    const result = await getOrderById('gigi-101', 'cust-001');
    expect(result).toBeNull();
  });

  it('returns null for nonexistent order', async () => {
    (prisma.order.findUnique as any).mockResolvedValue(null);

    const result = await getOrderById('nonexistent', 'cust-001');
    expect(result).toBeNull();
  });
});
