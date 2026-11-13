const { ApiError } = require("@/error");

function send(res, status, code, message, details) {
  const error = { code, message };
  if (details !== undefined && details !== null) {
    error.details = details;
  }
  return res.status(status).json({ error });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return send(res, err.status, err.code, err.message, err.details);
  }

  if (err.type === "entity.parse.failed") {
    return send(res, 400, "INVALID_JSON", "Malformed JSON");
  }

  if (err.type === "entity.too.large") {
    return send(res, 413, "PAYLOAD_TOO_LARGE", "Body over 100 KB");
  }

  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    return send(res, 400, "VALIDATION_ERROR", "Validation failed", details);
  }

  if (err.name === "CastError") {
    return send(res, 400, "VALIDATION_ERROR", `Invalid ${err.path}`);
  }

  if (err.code === 11000) {
    return send(res, 409, "CONFLICT", "Duplicate value");
  }

  console.error(err);
  return send(res, 500, "INTERNAL_ERROR", "Internal server error");
}

module.exports = errorHandler;
