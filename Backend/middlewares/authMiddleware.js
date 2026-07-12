import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// Verify access token and assign authenticated user
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Retrieve JWT from Authorization header or cookie parser
  if (
    req.headers.authorization && 
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized to access this route, token missing');
  }

  try {
    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find active user (soft delete handler will automatically exclude if deleted)
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      res.status(401);
      throw new Error('User no longer exists or account is deactivated');
    }

    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token validation failed');
  }
});

// Role-based Access Control (RBAC) middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `User role '${req.user?.role || 'unknown'}' is not authorized to access this route`
      );
    }
    next();
  };
};
