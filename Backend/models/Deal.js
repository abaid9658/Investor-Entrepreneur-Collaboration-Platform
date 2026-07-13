import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  investor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entrepreneur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startupName: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    trim: true,
    default: ''
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  equity: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['exploring', 'due_diligence', 'term_sheet', 'negotiation', 'closed', 'passed'],
    default: 'exploring'
  },
  stage: {
    type: String,
    enum: ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'growth'],
    default: 'seed'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

dealSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
