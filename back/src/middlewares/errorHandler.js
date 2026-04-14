function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? err.status ?? 500;
  const message = err.message || 'Internal Server Error';

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({ message });
}

module.exports = { errorHandler };
