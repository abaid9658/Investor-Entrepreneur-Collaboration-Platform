import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  // Log the complete error stack trace
  logger.error(err.stack || err.message);

  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Catch Mongoose Schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Catch Mongoose Cast validation (bad ObjectIds)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found. Invalid field: ${err.path}`;
  }

  // Catch MongoDB unique indexing duplicates (e.g. registered email)
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value entered';
  }

  // Match enterprise response format: success, message, data, errors
  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors
  });
};

export default errorHandler;
