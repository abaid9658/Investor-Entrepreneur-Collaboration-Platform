import { body } from 'express-validator';

export const registerValidator = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .toLowerCase(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
  body('role')
    .optional()
    .isIn(['investor', 'entrepreneur', 'admin'])
    .withMessage('Role must be either investor, entrepreneur, or admin')
    .default('entrepreneur')
];

export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .trim(),
  body('role')
    .optional()
    .isIn(['investor', 'entrepreneur', 'admin'])
    .withMessage('Role must be either investor, entrepreneur, or admin')
];
