const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Document = require('../models/Document');
const Parcel = require('../models/Parcel');
const { recalculateParcelZone } = require('../services/zoneService');
const { logAction } = require('../services/auditService');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files (PNG, JPG, WEBP) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const CHECKLIST_TYPES = [
  { type: 'IDENTITY_PROOF', title: 'Identity Proof (Aadhaar / Voter ID / PAN)' },
  { type: 'OWNERSHIP_DEED', title: 'Land Ownership Document (Sale Deed / Patta / 7/12)' },
  { type: 'LAND_RECORD_KHASRA', title: 'Cadastral Land Record (Khasra / Khatoni Jamabandi)' },
  { type: 'BANK_PASSBOOK', title: 'Bank Verification Proof (Passbook / Cancelled Cheque)' },
  { type: 'OTHER', title: 'Other Supporting Title Document (Optional)' },
];

// @desc    Upload document for a land parcel
// @route   POST /api/documents/upload
// @access  Private (Landowner / Officer)
const uploadDocument = async (req, res, next) => {
  try {
    const { parcelId, type, title } = req.body;

    if (!parcelId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide parcelId and document type',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a document file to upload',
      });
    }

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel not found',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    // Check if document of this type already exists for this parcel
    let doc = await Document.findOne({ parcelId: parcel._id, type });

    if (doc) {
      doc.fileName = req.file.originalname;
      doc.fileUrl = fileUrl;
      doc.fileSize = req.file.size;
      doc.mimeType = req.file.mimetype;
      doc.status = 'UNDER_REVIEW';
      doc.rejectionReason = undefined;
      doc.verifiedBy = undefined;
      doc.verifiedAt = undefined;
      await doc.save();
    } else {
      doc = await Document.create({
        parcelId: parcel._id,
        projectId: parcel.projectId,
        ownerId: req.user?.id || parcel.ownerId,
        ownerMobile: parcel.ownerMobile,
        type,
        title: title || type.replace(/_/g, ' '),
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        status: 'UNDER_REVIEW',
      });
    }

    // If parcel is in INVITED or DOCUMENT_UPLOAD, advance to DOCUMENT_VERIFICATION
    if (['INVITED', 'PARCEL_DETAILS_REVIEW', 'DOCUMENT_UPLOAD'].includes(parcel.stage)) {
      parcel.stage = 'DOCUMENT_VERIFICATION';
      await parcel.save();
    }

    const updatedParcel = await recalculateParcelZone(parcel._id);

    await logAction({
      actor: req.user,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc._id,
      newValue: { type: doc.type, fileName: doc.fileName, status: doc.status },
      note: `Document '${doc.title}' uploaded for parcel ${parcel.parcelId}`,
    });

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully and marked for review',
      document: doc,
      parcel: updatedParcel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get 5-item checklist documents for a parcel
// @route   GET /api/documents/parcel/:parcelId
// @access  Private
const getParcelDocuments = async (req, res, next) => {
  try {
    const { parcelId } = req.params;
    const parcel = await Parcel.findById(parcelId);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel not found',
      });
    }

    const existingDocs = await Document.find({ parcelId: parcel._id }).lean();

    // Map each checklist requirement
    const checklist = CHECKLIST_TYPES.map((item) => {
      const match = existingDocs.find((d) => d.type === item.type);
      if (match) {
        return {
          ...match,
          isUploaded: true,
        };
      }
      return {
        parcelId: parcel._id,
        type: item.type,
        title: item.title,
        status: 'NOT_UPLOADED',
        isUploaded: false,
      };
    });

    res.status(200).json({
      success: true,
      parcelId: parcel._id,
      checklist,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Attach sample demo documents (1-Click helper for SIH evaluation)
// @route   POST /api/documents/sample-attach
// @access  Private
const attachSampleDocuments = async (req, res, next) => {
  try {
    const { parcelId } = req.body;
    const parcel = await Parcel.findById(parcelId);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel not found',
      });
    }

    const sampleDocs = [
      {
        type: 'IDENTITY_PROOF',
        title: 'Identity Proof (Aadhaar / Voter ID)',
        fileName: 'Aadhaar_Card_Verification_Doc.pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: 145200,
        mimeType: 'application/pdf',
        status: 'UNDER_REVIEW',
      },
      {
        type: 'OWNERSHIP_DEED',
        title: 'Land Ownership Document (Sale Deed / Patta)',
        fileName: 'Registered_Sale_Deed_Khasra.pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: 382100,
        mimeType: 'application/pdf',
        status: 'UNDER_REVIEW',
      },
      {
        type: 'LAND_RECORD_KHASRA',
        title: 'Cadastral Land Record (Khasra / Jamabandi)',
        fileName: 'Khasra_Record_Jamabandi_2026.pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: 224000,
        mimeType: 'application/pdf',
        status: 'UNDER_REVIEW',
      },
      {
        type: 'BANK_PASSBOOK',
        title: 'Bank Verification Proof (Passbook / Cheque)',
        fileName: 'SBI_Passbook_Cancelled_Cheque.pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: 189000,
        mimeType: 'application/pdf',
        status: 'UNDER_REVIEW',
      },
    ];

    for (const s of sampleDocs) {
      await Document.findOneAndUpdate(
        { parcelId: parcel._id, type: s.type },
        {
          ...s,
          parcelId: parcel._id,
          projectId: parcel.projectId,
          ownerId: req.user?.id || parcel.ownerId,
          ownerMobile: parcel.ownerMobile,
        },
        { upsert: true, new: true }
      );
    }

    if (['INVITED', 'PARCEL_DETAILS_REVIEW', 'DOCUMENT_UPLOAD'].includes(parcel.stage)) {
      parcel.stage = 'DOCUMENT_VERIFICATION';
      await parcel.save();
    }

    const updatedParcel = await recalculateParcelZone(parcel._id);

    await logAction({
      actor: req.user,
      action: 'SAMPLE_DOCS_ATTACHED',
      entityType: 'Parcel',
      entityId: parcel._id,
      note: `All mandatory title documents attached for parcel ${parcel.parcelId}`,
    });

    res.status(200).json({
      success: true,
      message: 'Sample title deeds & identity records attached successfully',
      parcel: updatedParcel,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  uploadDocument,
  getParcelDocuments,
  attachSampleDocuments,
};
