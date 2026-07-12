import { body } from 'express-validator';

export const shareDocumentValidator = [
  body('sharedWithUserId')
    .isMongoId()
    .withMessage('Valid user ID to share document with is required')
];

export const signatureValidator = [
  body('signatureImageUrl')
    .notEmpty()
    .withMessage('Signature image link/drawing content is required')
];
