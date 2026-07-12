import { body } from 'express-validator';

export const createMeetingValidator = [
  body('title')
    .notEmpty()
    .withMessage('Meeting title is required')
    .trim(),
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('attendee')
    .isMongoId()
    .withMessage('Valid attendee user ID is required')
];

export const updateStatusValidator = [
  body('status')
    .isIn(['accepted', 'rejected', 'cancelled'])
    .withMessage('Invalid meeting status code')
];
