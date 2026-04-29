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
  constructor(message = "We couldn't process that request. Please check your input and try again.") {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Please sign in again or use a valid access token.") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You don't have permission to perform this action.") {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "We couldn't find what you're looking for.") {
    super(404, message);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(
    message = "You're doing that too often. Please wait a moment and try again.",
    public readonly retryAfter?: number | null,
  ) {
    super(429, message);
  }
}

export class BadGatewayError extends HttpError {
  constructor(message = "We couldn't reach the target service right now. Please try again later.") {
    super(502, message);
  }
}
