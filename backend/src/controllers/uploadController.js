'use strict';

const { upload, cloudinary } = require('../config/cloudinary');
const { sendSuccess, createApiError } = require('../utils/apiResponse');
const { logAction } = require('../services/auditLogService');

// POST /api/v1/uploads/document
// Citizen uploads a single document — file goes to Cloudinary, URL is returned
const uploadDocument = async (req, res, next) => {
  try {
    // multer-storage-cloudinary populates req.file after successful upload
    if (!req.file) {
      return next(createApiError(400, 'No file provided. Please attach a file to upload.'));
    }

    const { docKey } = req.body;
    if (!docKey || typeof docKey !== 'string' || docKey.trim() === '') {
      // Delete the already-uploaded file from Cloudinary to avoid orphans
      await cloudinary.uploader.destroy(req.file.filename);
      return next(createApiError(400, 'docKey is required — specify which document type this file represents (e.g. "aadhaar").'));
    }

    const docData = {
      docKey: docKey.trim(),
      originalName: req.file.originalname,
      url: req.file.path,            // Cloudinary secure URL
      publicId: req.file.filename,   // Cloudinary public_id — needed to delete/replace
      format: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    };

    await logAction({
      action: 'DOCUMENT_UPLOADED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Document',
      entityId: docKey,
      changedFields: { url: docData.url, publicId: docData.publicId },
    });

    sendSuccess(res, { document: docData }, 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/uploads/document/:publicId
// Citizen can delete/replace a document before submission
const deleteDocument = async (req, res, next) => {
  try {
    // publicId is passed in the request body because it contains slashes
    // which cannot be reliably encoded in URL path params in Express 5
    const { publicId } = req.body;
    if (!publicId) return next(createApiError(400, 'publicId is required in request body'));

    // Decode because Cloudinary public IDs contain slashes (e.g. nagrik_docs/userId/file)
    const decodedPublicId = decodeURIComponent(publicId);

    const result = await cloudinary.uploader.destroy(decodedPublicId, { resource_type: 'raw' });

    // Try again with 'image' type if 'raw' did not find it (PDFs can be raw, images are image)
    if (result.result === 'not found') {
      await cloudinary.uploader.destroy(decodedPublicId, { resource_type: 'image' });
    }

    await logAction({
      action: 'DOCUMENT_DELETED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Document',
      entityId: publicId,
    });

    sendSuccess(res, { message: 'Document removed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, deleteDocument };
