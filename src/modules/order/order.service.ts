// src/modules/order/order.service.ts

import { Product, Order, OrderStatus } from "./order.types.js";

// 1. Mock Products Catalog (Gigi Energy Drinks Flavors)
export const PRODUCTS: Product[] = [
  { id: "p1", name: "Gigi Pinecone Coconut", price: 120, stock: 50 },
  { id: "p2", name: "Gigi Lemon Lime", price: 100, stock: 35 },
  { id: "p3", name: "Gigi Wild Berry", price: 150, stock: 20 },
];

// 2. Mock Database Table (Hamari in-memory orders sheet)
export let ORDERS: Order[] = [
  {
    id: "gigi-101",
    customerName: "Shubham Bhattacharya",
    items: [{ productId: "p1", quantity: 2 }], // Total: 240
    totalAmount: 240,
    status: "PROCESSING",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    shippingAddress: "B-201, Shanti Kunj, Surat, Gujarat",
  },
  {
    id: "gigi-102",
    customerName: "Rahul Sharma",
    items: [{ productId: "p2", quantity: 1 }], // Total: 100
    totalAmount: 100,
    status: "DELIVERED",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    shippingAddress: "Flat 405, Heights Residency, Mumbai",
  },
  {
    id: "gigi-103",
    customerName: "Pooja Patel",
    items: [{ productId: "p3", quantity: 1 }], // Total: 150
    totalAmount: 150,
    status: "PENDING",
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
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

  // Shipped/Delivered orders cancel nahi ho sakte
  if (order.status === "SHIPPED" || order.status === "DELIVERED") {
    return { 
      success: false, 
      message: `Cannot cancel order. It has already been ${order.status.toLowerCase()}.`, 
      order 
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
export const processRefund = (id: string): { success: boolean; message: string; order?: Order } => {
  const order = getOrderById(id);

  if (!order) {
    return { success: false, message: `Order with ID ${id} not found.` };
  }

  // Refund already processed check karo pehle
  if (order.status === "REFUNDED") {
    return { success: false, message: "Refund has already been processed.", order };
  }

  // Refund sirf cancelled orders ka hi ho sakta hai
  if (order.status !== "CANCELLED" && order.status !== "REFUND_PENDING_APPROVAL") {
    return { 
      success: false, 
      message: "Refund can only be processed for cancelled orders. Please cancel the order first.", 
      order 
    };
  }

  if (order.totalAmount <= 200) {
    order.status = "REFUNDED";
    return { 
      success: true, 
      message: `Refund of ₹${order.totalAmount} approved automatically (under ₹200 threshold).`, 
      order 
    };
  }

  // ₹200 se bada refund hai toh use Admin approval ke liye pending daal do
  order.status = "REFUND_PENDING_APPROVAL";
  return {
    success: true,
    message: `Refund of ₹${order.totalAmount} exceeds safety threshold. Marked as PENDING ADMIN APPROVAL.`,
    order,
  };
};