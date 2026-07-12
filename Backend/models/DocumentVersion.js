import mongoose from 'mongoose';

const documentVersionSchema = new mongoose.Schema({
  document: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true, 
    index: true 
  },
  versionNumber: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  changesDescription: { type: String, trim: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Exclude soft-deleted versions
documentVersionSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);
export default DocumentVersion;
