import express from 'express';
import { getMessages, getConversations } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth lock on all direct messaging routes
router.use(protect);

router.get('/conversations', getConversations);
router.get('/messages/:receiverId', getMessages);

export default router;
