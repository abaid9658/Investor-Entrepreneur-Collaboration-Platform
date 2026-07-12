import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['2fa', 'password-reset', 'email-verify'], 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true, 
    index: true 
  }
}, { timestamps: true });

// Auto-delete records 300 seconds after creation/updated expiresAt
// Note: Mongoose TTL configuration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
