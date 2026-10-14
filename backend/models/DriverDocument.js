const mongoose = require('mongoose');

/**
 * DriverDocument — privately stores a verification document (e.g. vehicle RC)
 * uploaded by a driver applicant. The file bytes live in a dedicated collection,
 * kept OUT of the ordinary Driver application document.
 *
 * Access is only ever through authenticated, authorized API endpoints — never
 * via a public URL or static directory — so documents stay private.
 */
const driverDocumentSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    // Which document this represents (reserved for future document types).
    field: {
      type: String,
      default: 'rc',
    },
    // Original filename, kept for display only — never used as the storage key.
    filename: {
      type: String,
      default: '',
    },
    // Server-generated safe identifier (not used as a public path).
    storedName: {
      type: String,
      required: true,
    },
    // Verified content type derived from magic bytes, not the browser claim.
    contentType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    // The actual file bytes. Acceptable for small verification docs (≤ 5 MB).
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: false } }
);

module.exports = mongoose.model('DriverDocument', driverDocumentSchema);
