import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  content: { type: String, required: true, trim: true },
  isRead: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Filter out soft-deleted messages
messageSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
