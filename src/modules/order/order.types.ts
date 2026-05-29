// src/modules/order/order.types.ts

import { z } from "zod";

// 1. Order Status Schema & Type
export const OrderStatusSchema = z.enum([
  "PLACED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUND_PENDING_APPROVAL",
  "REFUNDED",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// 2. Product Schema & Type
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive("Price must be greater than 0"),
  stock: z.number().int().nonnegative("Stock cannot be negative"),
});
export type Product = z.infer<typeof ProductSchema>;

// 3. Order Item Schema & Type
export const OrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// 4. Full Order Schema & Type
export const OrderSchema = z.object({
  id: z.string(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerId: z.string().optional(),
  items: z.array(OrderItemSchema),
  totalAmount: z.number().nonnegative(),
  status: OrderStatusSchema,
  createdAt: z.string().datetime(), // Ensures standard ISO format
  shippingAddress: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;