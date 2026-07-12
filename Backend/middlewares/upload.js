import multer from 'multer';

// Use memory storage to inspect buffers for magic bytes validation before saving
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and PNG/JPG images are allowed!'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter
});

// Magic bytes validator helper to verify signatures of incoming files
export const validateMagicBytes = (buffer, mimeType) => {
  if (!buffer || buffer.length < 4) return false;

  const hex = buffer.toString('hex', 0, 4).toUpperCase();

  switch (mimeType) {
    case 'application/pdf':
      // PDF starts with '%PDF' -> '25504446'
      return hex === '25504446';
    case 'image/png':
      // PNG starts with '89504E47'
      return hex === '89504E47';
    case 'image/jpeg':
      // JPEG starts with 'FFD8FF'
      return hex.startsWith('FFD8FF');
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // DOCX starts with '504B0304' (standard ZIP format PK..)
      return hex === '504B0304';
    case 'application/msword':
      // DOC starts with 'D0CF11E0'
      return hex === 'D0CF11E0';
    default:
      return true; // Pass through if we don't have explicit signature rule
  }
};
