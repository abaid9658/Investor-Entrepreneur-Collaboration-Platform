import express from 'express';
import SupportMessage from '../models/SupportMessage.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

// Public/Authenticated endpoint to submit a support message
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const supportMsg = await SupportMessage.create({
    name,
    email,
    message,
    user: req.user ? req.user._id : null
  });

  res.status(201).json({ success: true, message: 'Support request submitted successfully', data: supportMsg });
}));

// Admin-only endpoint to get all support messages
router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const messages = await SupportMessage.find().populate('user', 'name email role').sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: messages });
}));

// Admin-only endpoint to mark a message as resolved
router.put('/:id/resolve', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const msg = await SupportMessage.findById(req.params.id);
  if (!msg) {
    return res.status(404).json({ success: false, message: 'Support message not found' });
  }
  msg.isResolved = true;
  await msg.save();
  res.status(200).json({ success: true, message: 'Message resolved', data: msg });
}));

export default router;
