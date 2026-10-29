/**
 * Operational error with an HTTP status code. Thrown from services/controllers
 * and translated to a JSON response by the central error handler.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
