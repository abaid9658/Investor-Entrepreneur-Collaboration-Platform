import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import OTP from '../models/OTP.js';
import ActivityLog from '../models/ActivityLog.js';
import sendEmail from '../utils/email.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper to generate access & refresh JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id }, 
    process.env.REFRESH_SECRET, 
    { expiresIn: process.env.REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// Send response helper
const sendTokenResponse = (user, statusCode, res, message = 'Authenticated successfully') => {
  const { accessToken, refreshToken } = generateTokens(user);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isTwoFAEnabled: user.isTwoFAEnabled,
        createdAt: user.createdAt
      },
      accessToken
    },
    errors: null
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { name, email, password, role = 'entrepreneur' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email address is already in use',
      data: null,
      errors: [{ msg: 'Email address is already in use', path: 'email' }]
    });
  }

  // Create User
  const avatarUrl = req.body.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  const user = await User.create({
    name,
    email,
    password,
    role,
    avatarUrl
  });

  // Automatically seed an empty profile linked to the User
  await Profile.create({
    user: user._id
  });

  // Automatically credit $50,000 for sandbox sandbox balance
  const { default: Transaction } = await import('../models/Transaction.js');
  await Transaction.create({
    user: user._id,
    type: 'deposit',
    amount: 50000,
    status: 'completed',
    description: 'Initial Sandbox Balance Credit'
  });

  // Track event in audit trail
  await ActivityLog.create({
    user: user._id,
    action: 'USER_REGISTERED',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: { email, role }
  });

  sendTokenResponse(user, 201, res, 'Registration successful');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { email, password, role } = req.body;

  // Find User (select password explicitely since we excluded it in query hooks)
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || (role && user.role !== role)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      data: null,
      errors: [{ msg: 'Invalid email, password, or role selector' }]
    });
  }

  // Check lockout status
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    return res.status(423).json({
      success: false,
      message: `Account is temporarily locked. Try again in ${minutesLeft} minutes.`,
      data: null,
      errors: null
    });
  }

  // Check password matches
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    // Increment failed attempts
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      user.failedLoginAttempts = 0; // reset counter
    }
    await user.save();

    await ActivityLog.create({
      user: user._id,
      action: 'LOGIN_FAILED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      data: null,
      errors: null
    });
  }

  // Reset login attempts
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Handle 2FA Verification Mock Flow
  if (user.isTwoFAEnabled) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    
    // Save OTP to DB
    await OTP.create({
      email: user.email,
      code,
      type: '2fa',
      expiresAt
    });

    // Send email code
    await sendEmail({
      email: user.email,
      subject: 'Nexus Multi-Factor Code (2FA)',
      message: `Your Nexus login verification OTP code is: ${code}. It expires in 5 minutes.`,
      html: `<h3>Nexus Verification</h3><p>Your Nexus login verification OTP code is: <strong>${code}</strong></p><p>It expires in 5 minutes.</p>`
    });

    await ActivityLog.create({
      user: user._id,
      action: '2FA_OTP_SENT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      message: 'Two-factor code sent to your registered email address',
      data: { require2FA: true, email: user.email },
      errors: null
    });
  }

  // Audit log
  await ActivityLog.create({
    user: user._id,
    action: 'USER_LOGGED_IN',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Verify 2FA OTP
// @route   POST /api/auth/verify-2fa
// @access  Public
export const verify2FA = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: 'Email and verification code are required',
      data: null,
      errors: null
    });
  }

  const otpRecord = await OTP.findOne({ email, code, type: '2fa' });

  if (!otpRecord || otpRecord.expiresAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code',
      data: null,
      errors: null
    });
  }

  // Delete OTP record after successful matching
  await OTP.deleteOne({ _id: otpRecord._id });

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User no longer exists',
      data: null,
      errors: null
    });
  }

  // Audit log
  await ActivityLog.create({
    user: user._id,
    action: '2FA_VERIFIED_SUCCESSFULLY',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  sendTokenResponse(user, 200, res, 'Two-factor verification completed successfully');
});

// @desc    Refresh token rotation
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token not found',
      data: null,
      errors: null
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
        data: null,
        errors: null
      });
    }

    // Refresh response (re-issue both tokens, rotating refresh token)
    sendTokenResponse(user, 200, res, 'Access token refreshed successfully');
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.',
      data: null,
      errors: null
    });
  }
});

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    data: null,
    errors: null
  });
});

// @desc    Request forgot password OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Return success to prevent email harvest attacks
    return res.status(200).json({
      success: true,
      message: 'If account exists, password recovery instructions have been emailed.',
      data: null,
      errors: null
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit reset OTP
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  await OTP.create({
    email,
    code,
    type: 'password-reset',
    expiresAt
  });

  await sendEmail({
    email,
    subject: 'Nexus Password Reset Verification Code',
    message: `Your Nexus password reset verification code is: ${code}. It expires in 10 minutes.`,
    html: `<h3>Nexus Security</h3><p>Use code: <strong>${code}</strong> to reset your password.</p><p>It expires in 10 minutes.</p>`
  });

  res.status(200).json({
    success: true,
    message: 'Recovery instructions have been sent to your email address',
    data: null,
    errors: null
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email, validation code, and new password',
      data: null,
      errors: null
    });
  }

  const otpRecord = await OTP.findOne({ email, code, type: 'password-reset' });

  if (!otpRecord || otpRecord.expiresAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired validation code',
      data: null,
      errors: null
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Account not found',
      data: null,
      errors: null
    });
  }

  // Update password (pre-save hook hashes it automatically)
  user.password = newPassword;
  await user.save();

  // Clear OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  await ActivityLog.create({
    user: user._id,
    action: 'PASSWORD_RESET_SUCCESSFUL',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({
    success: true,
    message: 'Password reset completed successfully. You can now login with your new password.',
    data: null,
    errors: null
  });
});

// @desc    Seed test database with 4 entrepreneurs, 5 investors, and 1 admin
// @route   GET /api/auth/seed
// @access  Public
export const seedData = asyncHandler(async (req, res) => {
  const { default: Transaction } = await import('../models/Transaction.js');
  
  // 1. Clean existing records to avoid duplicates (optional, keep custom registered users but clear seed emails)
  const seedEmails = [
    'sarah@techwave.io', 'david@greenlife.co', 'maya@healthpulse.com', 'james@urbanfarm.io',
    'michael@vcinnovate.com', 'jennifer@impactvc.org', 'robert@healthventures.com', 
    'emma@ventures.com', 'john@angel.com', 'admin@nexus.com'
  ];

  await User.deleteMany({ email: { $in: seedEmails } });

  // 2. Define seed users
  const entrepreneursSeed = [
    {
      name: 'Sarah Johnson',
      email: 'sarah@techwave.io',
      password: 'Password123',
      role: 'entrepreneur',
      avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
      bio: 'Serial entrepreneur with 10+ years of experience in SaaS and fintech.',
      profile: {
        startupName: 'TechWave AI',
        pitchSummary: 'AI-powered financial analytics platform helping SMBs make data-driven decisions.',
        fundingStage: 'Seed',
        industry: 'FinTech',
        foundedYear: 2021,
        teamSize: 12,
        location: 'San Francisco, CA',
        website: 'https://techwave.io',
        skills: ['AI', 'SaaS', 'Finance']
      }
    },
    {
      name: 'David Chen',
      email: 'david@greenlife.co',
      password: 'Password123',
      role: 'entrepreneur',
      avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
      bio: 'Environmental scientist turned entrepreneur. Passionate about sustainable solutions.',
      profile: {
        startupName: 'GreenLife Solutions',
        pitchSummary: 'Biodegradable packaging alternatives for consumer goods and food industry.',
        fundingStage: 'Pre-seed',
        industry: 'CleanTech',
        foundedYear: 2020,
        teamSize: 8,
        location: 'Portland, OR',
        website: 'https://greenlife.co',
        skills: ['CleanTech', 'Bioplastics', 'Operations']
      }
    },
    {
      name: 'Maya Patel',
      email: 'maya@healthpulse.com',
      password: 'Password123',
      role: 'entrepreneur',
      avatarUrl: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
      bio: 'Former healthcare professional with an MBA. Building tech to improve patient care.',
      profile: {
        startupName: 'HealthPulse',
        pitchSummary: 'Mobile platform connecting patients with mental health professionals in real-time.',
        fundingStage: 'Seed',
        industry: 'HealthTech',
        foundedYear: 2022,
        teamSize: 5,
        location: 'Boston, MA',
        website: 'https://healthpulse.com',
        skills: ['HealthTech', 'Telehealth', 'Product Management']
      }
    },
    {
      name: 'James Wilson',
      email: 'james@urbanfarm.io',
      password: 'Password123',
      role: 'entrepreneur',
      avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
      bio: 'Agricultural engineer focused on urban farming solutions and food security.',
      profile: {
        startupName: 'UrbanFarm',
        pitchSummary: 'IoT-enabled vertical farming systems for urban environments and food deserts.',
        fundingStage: 'Series A',
        industry: 'AgTech',
        foundedYear: 2019,
        teamSize: 14,
        location: 'Chicago, IL',
        website: 'https://urbanfarm.io',
        skills: ['IoT', 'Agriculture', 'Embedded Systems']
      }
    }
  ];

  const investorsSeed = [
    {
      name: 'Michael Rodriguez',
      email: 'michael@vcinnovate.com',
      password: 'Password123',
      role: 'investor',
      avatarUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
      bio: 'Early-stage investor with focus on B2B SaaS and fintech. Previously founded and exited two startups.',
      profile: {
        investmentInterests: ['FinTech', 'SaaS', 'AI/ML'],
        investmentStage: ['Seed', 'Series A'],
        portfolioCompanies: ['PayStream', 'DataSense', 'CloudSecure'],
        minimumInvestment: 250000,
        maximumInvestment: 1500000,
        totalInvestmentsCount: 12,
        location: 'Miami, FL',
        website: 'https://vcinnovate.com'
      }
    },
    {
      name: 'Jennifer Lee',
      email: 'jennifer@impactvc.org',
      password: 'Password123',
      role: 'investor',
      avatarUrl: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
      bio: 'Impact investor focused on climate tech, sustainable agriculture, and clean energy.',
      profile: {
        investmentInterests: ['CleanTech', 'AgTech', 'Sustainability'],
        investmentStage: ['Seed', 'Series A', 'Series B'],
        portfolioCompanies: ['SolarFlow', 'EcoPackage', 'CleanWater Solutions'],
        minimumInvestment: 500000,
        maximumInvestment: 3000000,
        totalInvestmentsCount: 18,
        location: 'Seattle, WA',
        website: 'https://impactvc.org'
      }
    },
    {
      name: 'Robert Torres',
      email: 'robert@healthventures.com',
      password: 'Password123',
      role: 'investor',
      avatarUrl: 'https://images.pexels.com/photos/834863/pexels-photo-834863.jpeg',
      bio: 'Healthcare-focused investor with medical background. Looking for innovations in patient care and biotech.',
      profile: {
        investmentInterests: ['HealthTech', 'BioTech', 'Medical Devices'],
        investmentStage: ['Series A', 'Series B'],
        portfolioCompanies: ['MediTrack', 'BioGenics', 'Patient+'],
        minimumInvestment: 1000000,
        maximumInvestment: 5000000,
        totalInvestmentsCount: 9,
        location: 'Boston, MA',
        website: 'https://healthventures.com'
      }
    },
    {
      name: 'Emma Watson',
      email: 'emma@ventures.com',
      password: 'Password123',
      role: 'investor',
      avatarUrl: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg',
      bio: 'Angel investor looking for revolutionary AI/ML solutions and digital transformation.',
      profile: {
        investmentInterests: ['AI/ML', 'SaaS', 'Web3'],
        investmentStage: ['Pre-seed', 'Seed'],
        portfolioCompanies: ['OpenMinds', 'FutureAI'],
        minimumInvestment: 50000,
        maximumInvestment: 500000,
        totalInvestmentsCount: 4,
        location: 'New York, NY',
        website: 'https://emmaventures.com'
      }
    },
    {
      name: 'John Doe',
      email: 'john@angel.com',
      password: 'Password123',
      role: 'investor',
      avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
      bio: 'Angel investor focusing on AgTech and sustainability startup teams.',
      profile: {
        investmentInterests: ['AgTech', 'CleanTech'],
        investmentStage: ['Seed'],
        portfolioCompanies: ['FarmGrow'],
        minimumInvestment: 100000,
        maximumInvestment: 800000,
        totalInvestmentsCount: 6,
        location: 'Chicago, IL',
        website: 'https://johnangel.com'
      }
    }
  ];

  // 3. Insert users and create profiles
  const createdUsers = [];
  
  // Seed admin
  const adminUser = await User.create({
    name: 'Nexus Admin',
    email: 'admin@nexus.com',
    password: 'AdminPassword123',
    role: 'admin',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff'
  });
  await Profile.create({ user: adminUser._id });
  createdUsers.push(adminUser);

  // Seed entrepreneurs
  for (const ent of entrepreneursSeed) {
    const user = await User.create({
      name: ent.name,
      email: ent.email,
      password: ent.password,
      role: ent.role,
      avatarUrl: ent.avatarUrl,
      bio: ent.bio
    });
    
    // Seed detailed profile
    await Profile.create({
      user: user._id,
      ...ent.profile
    });

    // Seed welcome balance
    await Transaction.create({
      user: user._id,
      type: 'deposit',
      amount: 50000,
      status: 'completed',
      description: 'Seed Welcome Wallet Balance'
    });

    createdUsers.push(user);
  }

  // Seed investors
  for (const inv of investorsSeed) {
    const user = await User.create({
      name: inv.name,
      email: inv.email,
      password: inv.password,
      role: inv.role,
      avatarUrl: inv.avatarUrl,
      bio: inv.bio
    });
    
    // Seed detailed profile
    await Profile.create({
      user: user._id,
      ...inv.profile
    });

    // Seed welcome balance
    await Transaction.create({
      user: user._id,
      type: 'deposit',
      amount: 150000, // Give investors more seed funds to make investments!
      status: 'completed',
      description: 'Seed Investor Investment Fund Wallet'
    });

    createdUsers.push(user);
  }

  res.status(201).json({
    success: true,
    message: 'Database seeded successfully with 4 entrepreneurs, 5 investors, and 1 admin.',
    data: {
      usersCount: createdUsers.length,
      users: createdUsers.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role }))
    },
    errors: null
  });
});
