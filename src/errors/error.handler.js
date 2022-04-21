import Bugsnag from '@bugsnag/js';

const getSequelizeUnique = (e) => {
  return e.errors[0].message.split('_').join(' ');
};

export default class ErrorHandler {
  constructor(e) {
    let message = '';
    let status = 400;

    switch (e.name) {
      case 'NotFoundError':
      case 'NotFound':
        message = e.message || 'Resources does not exist';
        status = e.statusCode || 404;
        break;

      case 'CustomError':
      case 'ValidationError':
        message = e.message;
        break;

      case 'AuthError':
        status = 401;
        message = e.message;
        break;

      case 'SequelizeUniqueConstraintError':
        status = 400;
        message = getSequelizeUnique(e);
        break;

      default:
        if (process.env.NODE_ENV === 'production') {
          Bugsnag.notify(e);
          message = 'There has been an error with your request. Try again later.';
        } else {
          message = e.message;
        }
        break;
    }

    this.name = e.name;
    this.message = message;
    this.statusCode = status;
    this.date = new Date();
  }

  getErrorResponse() {
    return { statusCode: this.statusCode, message: this.message };
  }
}
