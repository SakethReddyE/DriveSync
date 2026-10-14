const multer = require('multer');
const crypto = require('crypto');

/**
 * Secure document-upload middleware for verification files (e.g. vehicle RC).
 *
 * Defence in depth:
 *   1. multer fileFilter rejects anything whose declared MIME isn't whitelisted.
 *   2. multer limits enforce a max file size.
 *   3. verifyMagicBytes() inspects the actual file content (magic numbers) — the
 *      browser-supplied filename and content-type are never trusted alone.
 *   4. Filenames supplied by the client are never used as storage keys; a safe
 *      random identifier is generated instead.
 *
 * Files are kept in memory (memoryStorage) and persisted to MongoDB via the
 * DriverDocument model — no reliance on the ephemeral Render filesystem.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// MIME types accepted for verification documents.
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const rcUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const err = new Error('Unsupported file type. Only PDF, JPEG, or PNG are allowed.');
    err.statusCode = 400;
    return cb(err);
  },
});

// Magic-number signatures for the allowed formats.
const SIG_PDF = Buffer.from('%PDF', 'ascii'); // 25 50 44 46
const SIG_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIG_JPG = Buffer.from([0xff, 0xd8, 0xff]);

/**
 * Detect the true content type of a buffer from its leading bytes.
 * Returns one of the allowed MIME types, or null if the content is unknown.
 */
function detectMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.slice(0, 4).equals(SIG_PDF)) return 'application/pdf';
  if (buffer.length >= 8 && buffer.slice(0, 8).equals(SIG_PNG)) return 'image/png';
  if (buffer.slice(0, 3).equals(SIG_JPG)) return 'image/jpeg';
  return null;
}

/**
 * Validate an uploaded file's actual content against its declared type.
 * Throws a 400-tagged error on mismatch or unknown content.
 * Returns the verified MIME type.
 */
function verifyMagicBytes(file) {
  if (!file) {
    const err = new Error('RC document is required.');
    err.statusCode = 400;
    throw err;
  }
  const detected = detectMime(file.buffer);
  if (!detected) {
    const err = new Error('File content could not be verified. The file may be corrupted or is not a supported type.');
    err.statusCode = 400;
    throw err;
  }
  if (detected !== file.mimetype) {
    const err = new Error('File content does not match its declared type.');
    err.statusCode = 400;
    throw err;
  }
  return detected;
}

/** Generate a cryptographically random safe storage identifier. */
function generateStoredName(ext) {
  const id = crypto.randomBytes(16).toString('hex');
  return ext ? `${id}.${ext}` : id;
}

module.exports = {
  rcUpload,
  verifyMagicBytes,
  generateStoredName,
  MAX_FILE_SIZE,
  ALLOWED_MIME,
};
