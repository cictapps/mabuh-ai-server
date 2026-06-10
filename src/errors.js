export class AppError extends Error {
  constructor(status, code, message, options = {}) {
    super(message, options);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(400, "INVALID_REQUEST", message);
    this.name = "ValidationError";
  }
}

export class UpstreamError extends AppError {
  constructor(message = "The AI service is temporarily unavailable", options) {
    super(502, "UPSTREAM_ERROR", message, options);
    this.name = "UpstreamError";
  }
}
