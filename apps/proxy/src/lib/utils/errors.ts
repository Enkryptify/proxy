export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(
    message = "Too many requests",
    public readonly retryAfter?: number | null,
  ) {
    super(429, message);
  }
}

export class BadGatewayError extends HttpError {
  constructor(message = "Bad gateway") {
    super(502, message);
  }
}
