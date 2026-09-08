import logger from "../infrastructure/logger/logger.js";

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational;

  // Log all errors
  if (req.log) {
    if (statusCode >= 500 && !isOperational) {
      req.log.error({ err, requestId: req.requestId }, "Unexpected server error");
    } else {
      req.log.warn({ err, requestId: req.requestId }, "Operational error");
    }
  } else {
    logger.error({ err, requestId: req.requestId }, "Error without request logger");
  }

  // Don't leak raw internal errors (like Prisma/DB errors) to the client
  const message = (statusCode === 500 && !isOperational)
    ? "Something went wrong"
    : err.message || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message,
    },
  });
};

export default errorMiddleware;
