const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Never trust the client filename: random name + extension derived from the validated mimetype.
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(ApiError.badRequest('Only JPG, PNG or WEBP images up to 5MB are allowed'));
    cb(null, true);
  },
});

const publicUrl = (file) => `/uploads/${file.filename}`;

module.exports = { upload, publicUrl, UPLOAD_DIR };
