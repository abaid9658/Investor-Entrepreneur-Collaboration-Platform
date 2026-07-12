import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get user notification history logs
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ 
    recipient: req.user._id, 
    deletedAt: null 
  })
  .populate('sender', 'name avatarUrl')
  .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Notifications loaded successfully',
    data: notifications,
    errors: null
  });
});

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification || notification.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Notification record not found',
      data: null,
      errors: null
    });
  }

  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to read this notification log',
      data: null,
      errors: null
    });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
    errors: null
  });
});

// @desc    Mark all user notification logs as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications updated as read successfully',
    data: null,
    errors: null
  });
});
