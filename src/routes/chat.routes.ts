import express from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { clerkAuthMiddleware } from '../middleware/auth.js';

const route = express.Router();

// POST /api/chat — requires Clerk authentication
route.post("/chat", clerkAuthMiddleware, chatController);

export default route;
