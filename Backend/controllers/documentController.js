import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import ESignature from '../models/ESignature.js';
import { createNotification } from '../services/notificationService.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { validateMagicBytes } from '../middlewares/upload.js';
import logger from '../utils/logger.js';

// Transacting helper with fallback support for local standalone (non-replica set) MongoDB
const runTransaction = async (action) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await action(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (e) {
        // Ignore abort errors
      }
    }
    logger.warn(`Transaction execution failed (${error.message}). Falling back to non-transactional execution.`);
    return await action(null);
  } finally {
    if (session) {
      try {
        session.endSession();
      } catch (e) {
        // Ignore end errors
      }
    }
  }
};

// @desc    Upload new document vault file
// @route   POST /api/documents
// @access  Private
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a file to upload',
      data: null,
      errors: null
    });
  }

  // Double validation on binary header
  if (!validateMagicBytes(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'File upload blocked: binary validation failure (magic bytes mismatch).',
      data: null,
      errors: null
    });
  }

  // Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(req.file.buffer, 'nexus/documents');

  // Create document and its initial version records
  const resultDoc = await runTransaction(async (session) => {
    const opts = session ? { session } : {};
    
    const docArray = await Document.create([{
      name: req.body.title || req.file.originalname,
      title: req.body.title || req.file.originalname.replace(/\.[^.]+$/, ''),
      type: req.file.mimetype,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      size: req.file.size,
      owner: req.user._id,
      url: uploadResult.secure_url,
      fileUrl: uploadResult.secure_url
    }], opts);

    const doc = docArray[0];

    await DocumentVersion.create([{
      document: doc._id,
      versionNumber: 1,
      url: uploadResult.secure_url,
      uploadedBy: req.user._id,
      changesDescription: 'Initial Upload'
    }], opts);

    return doc;
  });

  res.status(201).json({
    success: true,
    message: 'Document uploaded and registered successfully',
    data: resultDoc,
    errors: null
  });
});

// @desc    Upload a new version of an existing document
// @route   POST /api/documents/:id/version
// @access  Private
export const uploadNewVersion = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please provide the revised file to upload',
      data: null,
      errors: null
    });
  }

  const { changesDescription } = req.body;
  const doc = await Document.findById(req.params.id);

  if (!doc || doc.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
      data: null,
      errors: null
    });
  }

  if (doc.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to upload revisions for this document',
      data: null,
      errors: null
    });
  }

  if (!validateMagicBytes(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'File upload blocked: binary validation failure (magic bytes mismatch).',
      data: null,
      errors: null
    });
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, 'nexus/documents');

  const updatedDoc = await runTransaction(async (session) => {
    const opts = session ? { session } : {};
    
    doc.currentVersion += 1;
    doc.url = uploadResult.secure_url;
    doc.size = req.file.size;
    doc.approvalStatus = 'pending'; // Reset approval on newer version uploads
    await doc.save(opts);

    await DocumentVersion.create([{
      document: doc._id,
      versionNumber: doc.currentVersion,
      url: uploadResult.secure_url,
      uploadedBy: req.user._id,
      changesDescription: changesDescription || `Version ${doc.currentVersion} revision`
    }], opts);

    return doc;
  });

  res.status(200).json({
    success: true,
    message: `Document updated to Version ${updatedDoc.currentVersion} successfully`,
    data: updatedDoc,
    errors: null
  });
});

// @desc    Get user-owned or user-shared documents
// @route   GET /api/documents
// @access  Private
export const getDocuments = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const docs = await Document.find({
    $or: [
      { owner: userId },
      { sharedWith: userId }
    ],
    deletedAt: null
  })
  .populate('owner', 'name email role avatarUrl')
  .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Documents loaded successfully',
    data: docs,
    errors: null
  });
});

// @desc    Get a single document's metadata and version history
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id)
    .populate('owner', 'name email role avatarUrl')
    .populate('sharedWith', 'name email role avatarUrl');

  if (!doc || doc.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
      data: null,
      errors: null
    });
  }

  // Authorization check
  const userId = req.user._id.toString();
  const isOwner = doc.owner._id.toString() === userId;
  const isShared = doc.sharedWith.some(sharedUser => sharedUser._id.toString() === userId);

  if (!isOwner && !isShared) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this document',
      data: null,
      errors: null
    });
  }

  // Get version history
  const versions = await DocumentVersion.find({ document: doc._id })
    .populate('uploadedBy', 'name')
    .sort({ versionNumber: -1 });

  // Get e-signatures
  const signatures = await ESignature.find({ document: doc._id })
    .populate('user', 'name role email');

  res.status(200).json({
    success: true,
    message: 'Document detail loaded successfully',
    data: {
      document: doc,
      versions,
      signatures
    },
    errors: null
  });
});

// @desc    Share document access scope with another user
// @route   POST /api/documents/:id/share
// @access  Private
export const shareDocument = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { sharedWithUserId } = req.body;
  const doc = await Document.findById(req.params.id);

  if (!doc || doc.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
      data: null,
      errors: null
    });
  }

  if (doc.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the document owner can share it',
      data: null,
      errors: null
    });
  }

  // Prevent duplicate share entries
  if (!doc.sharedWith.includes(sharedWithUserId)) {
    doc.sharedWith.push(sharedWithUserId);
    await doc.save();

    // Notify shared user
    await createNotification({
      recipient: sharedWithUserId,
      sender: req.user._id,
      type: 'document_uploaded',
      title: 'Shared Document',
      message: `${req.user.name} has shared the document "${doc.name}" with you.`,
      metadata: { documentId: doc._id }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Document shared successfully',
    data: doc,
    errors: null
  });
});

// @desc    Apply digital signature to a document
// @route   POST /api/documents/:id/sign
// @access  Private
export const signDocument = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  // Accept both keys from frontend (signatureImage from canvas, signatureImageUrl legacy)
  const signatureImageUrl = req.body.signatureImage || req.body.signatureImageUrl;
  const signerNote = req.body.signerNote || '';
  const doc = await Document.findById(req.params.id);

  if (!doc || doc.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
      data: null,
      errors: null
    });
  }

  // Users can only sign if owner or explicitly shared
  const userId = req.user._id.toString();
  const isOwner = doc.owner.toString() === userId;
  const isShared = doc.sharedWith.includes(userId);

  if (!isOwner && !isShared) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to sign this document',
      data: null,
      errors: null
    });
  }

  // Upload signature graphic
  let signatureUrl = signatureImageUrl;
  if (signatureImageUrl.startsWith('data:image')) {
    // Canvas raw draw buffer
    const base64Data = signatureImageUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadResult = await uploadToCloudinary(buffer, 'nexus/signatures');
    signatureUrl = uploadResult.secure_url;
  }

  const resultESign = await runTransaction(async (session) => {
    const opts = session ? { session } : {};
    
    // Log signature
    const signature = await ESignature.create([{
      document: doc._id,
      user: req.user._id,
      signatureImageUrl: signatureUrl,
      signerNote: signerNote,
      ipAddress: req.ip
    }], opts);

    // Update document approval status to 'signed' or 'approved' depending on role
    doc.approvalStatus = 'signed';
    await doc.save(opts);

    // Notify document owner (if a shared user signed it)
    if (doc.owner.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: doc.owner,
        sender: req.user._id,
        type: 'document_uploaded',
        title: 'Document Signed',
        message: `${req.user.name} has signed the document "${doc.name}".`,
        metadata: { documentId: doc._id }
      }, opts);
    }

    return signature[0];
  });

  res.status(200).json({
    success: true,
    message: 'Document signed successfully',
    data: resultESign,
    errors: null
  });
});

// @desc    Soft delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
      data: null,
      errors: null
    });
  }

  if (doc.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the document owner can delete this file',
      data: null,
      errors: null
    });
  }

  await runTransaction(async (session) => {
    const opts = session ? { session } : {};
    
    doc.deletedAt = new Date();
    await doc.save(opts);

    await DocumentVersion.updateMany(
      { document: doc._id },
      { $set: { deletedAt: new Date() } },
      opts
    );
  });

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
    data: null,
    errors: null
  });
});

// @desc    Get version history for a document
// @route   GET /api/documents/:id/versions
// @access  Private
export const getDocumentVersions = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc || doc.deletedAt) {
    return res.status(404).json({ success: false, message: 'Document not found', data: null, errors: null });
  }

  const userId = req.user._id.toString();
  const isOwner = doc.owner.toString() === userId;
  const isShared = doc.sharedWith.map(String).includes(userId);
  if (!isOwner && !isShared) {
    return res.status(403).json({ success: false, message: 'Access denied', data: null, errors: null });
  }

  const versions = await DocumentVersion.find({ document: doc._id })
    .populate('uploadedBy', 'name avatarUrl')
    .sort({ versionNumber: -1 });

  res.status(200).json({ success: true, message: 'Versions loaded', data: versions, errors: null });
});
