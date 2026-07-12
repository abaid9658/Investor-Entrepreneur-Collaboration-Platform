import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentVersion: { type: Number, default: 1 },
  url: { type: String, required: true },
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'reviewed', 'signed', 'approved', 'rejected'], 
    default: 'pending' 
  },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Filter out soft-deleted documents
documentSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
