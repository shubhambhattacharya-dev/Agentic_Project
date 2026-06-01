import express from 'express'

import { chatController } from '../controllers/chat.controller.js';



const route=express.Router();

route.post("/chat", chatController)

export default route;
