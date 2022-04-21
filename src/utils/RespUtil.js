export default class RespUtil {
  constructor() {
    this.statusCode = null;
    this.status = null;
    this.data = null;
    this.message = null;
  }

  setSuccess(statusCode, message, data) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.status = true;
  }

  setPagination(pagination) {
    this.pagination = pagination;
    return this;
  }

  setError(statusCode, message) {
    this.statusCode = statusCode;
    this.message = message;
    this.status = false;
    return this;
  }

  send(res) {
    const result = {
      status: this.status,
      message: this.message,
      data: this.data,
    };

    if (this.pagination !== null) {
      Object.assign(result, { pagination: this.pagination });
      this.pagination = null;
    }

    if (this.status === true) {
      return res.status(this.statusCode).json(result);
    }
    return res.status(this.statusCode).json({
      status: this.status,
      message: this.message,
    });
  }
}
