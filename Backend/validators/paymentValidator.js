import { body } from 'express-validator';

export const depositValidator = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Deposit amount must be at least $1.00')
];

export const transferValidator = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Transfer amount must be at least $1.00'),
  body('recipientId')
    .isMongoId()
    .withMessage('Valid recipient user ID is required')
];

export const withdrawValidator = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Withdrawal amount must be at least $1.00')
];
