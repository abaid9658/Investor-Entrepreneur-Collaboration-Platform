import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['deposit', 'withdraw', 'transfer', 'investment', 'subscription', 'milestone'], 
    required: true 
  },
  amount: { type: Number, required: true },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  stripePaymentIntentId: { type: String },
  description: { type: String, trim: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

transactionSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
