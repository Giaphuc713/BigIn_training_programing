class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const error = {
    code: isApiError ? err.code : "INTERNAL_SERVER_ERROR",
    message: isApiError ? err.message : "Internal server error",
  };

  if (isApiError && err.details !== null) {
    error.details = err.details;
  }

  return res.status(status).json({ error });
}

module.exports = { ApiError, errorHandler };
