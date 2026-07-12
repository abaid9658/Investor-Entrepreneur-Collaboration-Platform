import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: [
      'meeting_request', 
      'meeting_accepted', 
      'meeting_rejected', 
      'payment_update', 
      'document_uploaded', 
      'call_invitation', 
      'new_message'
    ],
    required: true 
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Filter out soft-deleted notifications
notificationSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
