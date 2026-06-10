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

export class AuthenticationError extends AppError {
  constructor(message = "A valid Supabase user session is required") {
    super(401, "UNAUTHORIZED", message);
    this.name = "AuthenticationError";
  }
}

export class CapacityError extends AppError {
  constructor() {
    super(503, "AT_CAPACITY", "The chat service is busy. Please try again shortly.");
    this.name = "CapacityError";
  }
}

export class UpstreamError extends AppError {
  constructor(message = "The AI service is temporarily unavailable", options) {
    super(502, "UPSTREAM_ERROR", message, options);
    this.name = "UpstreamError";
  }
}
