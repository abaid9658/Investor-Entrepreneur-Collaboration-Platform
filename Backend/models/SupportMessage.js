import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isResolved: { type: Boolean, default: false }
}, { timestamps: true });

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);
export default SupportMessage;
