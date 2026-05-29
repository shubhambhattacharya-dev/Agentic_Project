// src/modules/order/order.service.ts

import { Product, Order, OrderStatus } from "./order.types.js";

// 1. Mock Products Catalog (Gigi Energy Drinks Flavors)
export const PRODUCTS: Product[] = [
  { id: "p1", name: "Gigi Pineapple Coconut", price: 125, stock: 50 },
  { id: "p2", name: "Gigi Lemon Lime", price: 125, stock: 35 },
  { id: "p3", name: "Gigi Trial Pack", price: 396, stock: 20 },
];

// 2. Mock Database Table (In-memory orders — will be replaced by SQLite)
export let ORDERS: Order[] = [
  {
    id: "gigi-101",
    customerName: "Shubham Bhattacharya",
    customerId: "cust-001",
    customerEmail: "shubham@example.com",
    items: [{ productId: "p2", quantity: 5 }], // 5 x 125 = 625
    totalAmount: 625,
    status: "DELIVERED",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    shippingAddress: "B-201, Shanti Kunj, Surat, Gujarat",
  },
  {
    id: "gigi-102",
    customerName: "Rahul Sharma",
    customerId: "cust-002",
    customerEmail: "rahul@example.com",
    items: [{ productId: "p1", quantity: 1 }], // 1 x 125 = 125
    totalAmount: 125,
    status: "DELIVERED",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    shippingAddress: "Flat 405, Heights Residency, Mumbai",
  },
  {
    id: "gigi-103",
    customerName: "Pooja Patel",
    customerId: "cust-003",
    customerEmail: "pooja@example.com",
    items: [{ productId: "p3", quantity: 1 }], // 1 x 396 = 396
    totalAmount: 396,
    status: "PLACED",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    shippingAddress: "Sector 15, Gandhinagar, Gujarat",
  },
  {
    id: "gigi-104",
    customerName: "Pooja Patel",
    customerId: "cust-003",
    customerEmail: "pooja@example.com",
    items: [{ productId: "p3", quantity: 1 }], // 1 x 396 = 396
    totalAmount: 396,
    status: "SHIPPED",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    shippingAddress: "Sector 15, Gandhinagar, Gujarat",
  },
];

// 3. Database Functions (Queries)

// ID se order find karne ka helper
export const getOrderById = (id: string): Order | undefined => {
  return ORDERS.find((order) => order.id.toLowerCase() === id.toLowerCase());
};

// Order Cancel karne ka core function
export const cancelOrder = (id: string): { success: boolean; message: string; order?: Order } => {
  const order = getOrderById(id);

  if (!order) {
    return { success: false, message: `Order with ID ${id} not found.` };
  }

  if (order.status === "CANCELLED") {
    return { success: false, message: "Order is already cancelled.", order };
  }

  // SHIPPED/DELIVERED orders cancel nahi ho sakte
  if (order.status === "SHIPPED" || order.status === "DELIVERED") {
    return { 
      success: false, 
      message: "Sorry, we already despatched it.", 
      order 
    };
  }

  // Only PLACED/PACKED can be cancelled
  if (order.status !== "PLACED" && order.status !== "PACKED") {
    return {
      success: false,
      message: `Cannot cancel order in ${order.status} status.`,
      order,
    };
  }

  // Order Cancel mark karo aur products ka stock wapas increase karo
  order.status = "CANCELLED";
  for (const item of order.items) {
    const product = PRODUCTS.find((p) => p.id === item.productId);
    if (product) {
      product.stock += item.quantity;
    }
  }

  return { success: true, message: "Order cancelled successfully.", order };
};

// Refund process karne ka core function
export const processRefund = (
  id: string,
  reason?: string,
  damageClaim?: boolean
): { success: boolean; message: string; order?: Order } => {
  const order = getOrderById(id);

  if (!order) {
    return { success: false, message: `Order with ID ${id} not found.` };
  }

  // Refund already processed check karo pehle
  if (order.status === "REFUNDED") {
    return { success: false, message: "Refund has already been processed.", order };
  }

  // Refund sirf DELIVERED orders ka ho sakta hai
  if (order.status !== "DELIVERED" && order.status !== "REFUND_PENDING_APPROVAL") {
    return { 
      success: false, 
      message: "Refund can only be processed for delivered orders.", 
      order 
    };
  }

  // Business Rule: damaged + amount < 500 -> auto approve
  if (damageClaim && order.totalAmount < 500) {
    order.status = "REFUNDED";
    return { 
      success: true, 
      message: `Refund of ₹${order.totalAmount} approved automatically (damaged item, under ₹500 threshold).`, 
      order 
    };
  }

  // ₹500 se bada ya non-damage refund hai toh Admin approval ke liye pending daal do
  order.status = "REFUND_PENDING_APPROVAL";
  return {
    success: true,
    message: `Refund of ₹${order.totalAmount} requires manual Admin approval. Marked as PENDING.`,
    order,
  };
};