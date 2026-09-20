'use strict';

const { v2: cloudinary } = require('cloudinary');
// multer-storage-cloudinary v2 exports the class as a default function (CJS default)
const CloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer-Cloudinary Storage ──────────────────────────────────────────────
// Files are uploaded directly to Cloudinary stored under nagrik_docs/<userId>/
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: `nagrik_docs/${req.user?.id || 'unknown'}`,
    resource_type: 'auto',               // handles both PDFs and images
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
  }),
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
});

module.exports = { cloudinary, upload };
