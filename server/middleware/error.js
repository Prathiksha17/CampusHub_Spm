exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.originalUrl}` });

exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  }
  if (err.code === 11000) {
    status = 400;
    message = `${Object.keys(err.keyValue).join(', ')} already exists`;
  }
  if (err.name === 'MulterError') status = 400;
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
};

exports.httpError = (status, message) => {
  const e = new Error(message);
  e.statusCode = status;
  return e;
};
