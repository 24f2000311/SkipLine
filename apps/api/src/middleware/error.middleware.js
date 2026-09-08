const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Don't leak raw internal errors (like Prisma/DB errors) to the client
  const isOperational = err.isOperational;
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
