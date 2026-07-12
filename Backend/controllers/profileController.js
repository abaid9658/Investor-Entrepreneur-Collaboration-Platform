import Profile from '../models/Profile.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { validateMagicBytes } from '../middlewares/upload.js';

// @desc    Get all user profiles (with optional role filtering)
// @route   GET /api/profiles
// @access  Private
export const getProfiles = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const query = { deletedAt: null };
  if (role) {
    query.role = role;
  }

  // Find matching users first
  const users = await User.find(query).select('_id');
  const userIds = users.map(u => u._id);

  // Load their profiles
  const profiles = await Profile.find({ 
    user: { $in: userIds },
    deletedAt: null
  })
  .populate('user', 'name email role avatarUrl bio');

  res.status(200).json({
    success: true,
    message: 'Profiles loaded successfully',
    data: profiles,
    errors: null
  });
});

// @desc    Get currently logged-in user profile
// @route   GET /api/profiles/me
// @access  Private
export const getMyProfile = asyncHandler(async (req, res) => {
  let profile = await Profile.findOne({ user: req.user._id }).populate(
    'user', 
    'name email role avatarUrl bio isTwoFAEnabled'
  );
  
  if (!profile) {
    // Lazy initialize profile if somehow missed during registration
    profile = await Profile.create({ user: req.user._id });
    profile = await Profile.findOne({ user: req.user._id }).populate(
      'user', 
      'name email role avatarUrl bio isTwoFAEnabled'
    );
  }

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: profile,
    errors: null
  });
});

// @desc    Update profile info
// @route   PUT /api/profiles/me
// @access  Private
export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, bio, ...profileFields } = req.body;

  // Handle core user table updates
  const userUpdates = {};
  if (name) userUpdates.name = name;
  if (bio !== undefined) userUpdates.bio = bio;

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

  // Handle extended details in profile schema
  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $set: profileFields },
    { new: true, runValidators: true }
  ).populate('user', 'name email role avatarUrl bio isTwoFAEnabled');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: profile,
    errors: null
  });
});

// @desc    Get specific profile by userId
// @route   GET /api/profiles/:userId
// @access  Private
export const getProfileById = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.params.userId }).populate(
    'user', 
    'name email role avatarUrl bio'
  );

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      data: null,
      errors: null
    });
  }

  res.status(200).json({
    success: true,
    message: 'Profile loaded successfully',
    data: profile,
    errors: null
  });
});

// @desc    Upload profile avatar URL to Cloudinary
// @route   POST /api/profiles/avatar
// @access  Private
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an image file to upload',
      data: null,
      errors: null
    });
  }

  // Validate magic bytes to stop shell script injection disguised as png
  if (!validateMagicBytes(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'File upload blocked: binary validation failure (magic bytes mismatch).',
      data: null,
      errors: null
    });
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer, 'nexus/avatars');
  
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl: uploadResult.secure_url },
    { new: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    message: 'Profile photo uploaded successfully',
    data: updatedUser,
    errors: null
  });
});
