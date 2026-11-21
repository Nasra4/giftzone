const multer = require('multer');

const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5MB)' : err.message;
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'That value already exists';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409;
    message = 'This item is in use and cannot be deleted';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  }

  if (status >= 500) {
    console.error(err);
    message = process.env.NODE_ENV === 'production' ? 'Something went wrong on our side' : message;
  }
  res.status(status).json({ message, errors: err.details });
};

module.exports = { notFound, errorHandler };
