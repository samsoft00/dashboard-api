/* eslint-disable max-classes-per-file */
/**
 * Class handle custom error
 */

export default class CustomError extends Error {
  constructor(message, statusCode = 400) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }

    this.name = 'CustomError';
    this.message = message;
    this.statusCode = statusCode;
    this.date = new Date();
  }
}

export class CredequityError extends Error {
  constructor({ message }) {
    const { error } = message;
    const errorMessage = error.message;

    super(errorMessage);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }

    this.name = 'CredequityError';
    this.message = errorMessage;
    this.statusCode = 400;
    this.date = new Date();
  }
}
