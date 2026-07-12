import Notification from '../models/Notification.js';
import { emitNotification } from '../socket/socketHandler.js';

/**
 * Service to write a notification to the database and emit it in real-time
 */
export const createNotification = async ({ 
  recipient, 
  sender, 
  type, 
  title, 
  message, 
  metadata 
}, options = {}) => {
  const notificationArray = await Notification.create([{
    recipient,
    sender,
    type,
    title,
    message,
    metadata
  }], options);

  const notification = notificationArray[0];

  // Populate sender details for real-time dashboard updates
  const populated = await Notification.findById(notification._id)
    .populate('sender', 'name avatarUrl');

  emitNotification(recipient, populated);
  return populated;
};
