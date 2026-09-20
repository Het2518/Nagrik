'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const { uploadDocument, deleteDocument } = require('../controllers/uploadController');

// All upload endpoints require authentication
router.use(authenticate);

// POST /api/v1/uploads/document
// Body: multipart/form-data with field 'document' (the file) + 'docKey' (text field)
router.post('/document', upload.single('document'), uploadDocument);

// DELETE /api/v1/uploads/document/:publicId
// publicId is URL-encoded (contains slashes, e.g. nagrik_docs/userId/filename)
// publicId may contain slashes — citizen should encode it before calling this endpoint
// The controller decodes it with decodeURIComponent
router.delete('/document', deleteDocument);

module.exports = router;
