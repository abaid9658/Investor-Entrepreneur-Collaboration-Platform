import mongoose from 'mongoose';

const eSignatureSchema = new mongoose.Schema({
  document: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true, 
    index: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  signatureImageUrl: { type: String, required: true },
  signedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

eSignatureSchema.pre(/^find/, function(next) {
  this.where({ deletedAt: null });
  next();
});

const ESignature = mongoose.model('ESignature', eSignatureSchema);
export default ESignature;
