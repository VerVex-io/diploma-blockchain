
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {File} = require('node:buffer');
const {PinataSDK} = require('pinata');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Validate required environment variables.
if (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY) {
  throw new Error('Missing PINATA_JWT or PINATA_GATEWAY in backend/.env');
}

// Initialize Pinata using backend-only credentials.
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

// Middleware.
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
}));

app.use(express.json({limit: '100kb'}));

// Configure PDF upload.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== 'application/pdf') {
      return callback(new Error('Only PDF files are accepted.'));
    }

    callback(null, true);
  },
});

// Health check.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Diploma Blockchain API is running',
  });
});

// Upload diploma PDF to public IPFS.
app.post('/api/diplomas/upload', upload.single('diploma'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file.',
      });
    }

    // Verify actual PDF signature, not just the supplied MIME type.
    const isPdfSignature =
        req.file.buffer.subarray(0, 5).toString() === '%PDF-';

    if (!isPdfSignature) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is not a valid PDF.',
      });
    }

    // Sanitize the filename before sending it to Pinata.
    const safeFileName = path.basename(req.file.originalname)
                             .replace(/[^a-zA-Z0-9._-]/g, '_')
                             .slice(0, 100) ||
        'diploma.pdf';

    const pdfFile =
        new File([req.file.buffer], safeFileName, {type: 'application/pdf'});

    const result = await pinata.upload.public.file(pdfFile);

    return res.status(201).json({
      success: true,
      message: 'Diploma uploaded successfully!',
      cid: result.cid,
      fileName: result.name,
      size: result.size,
      gatewayUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${result.cid}`,
    });
  } catch (error) {
    // Keep provider details and credentials out of client responses.
    console.error('IPFS upload failed:', error.message);

    return res.status(502).json({
      success: false,
      message: 'Failed to upload diploma to IPFS. Please try again.',
    });
  }
});

// Handle Multer and other request errors.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'PDF must not exceed 10 MB.',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid file upload request.',
    });
  }

  if (err.message === 'Only PDF files are accepted.') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  console.error('Backend request error:', err.message);

  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

app.listen(PORT, () => {
  console.log(`Diploma Blockchain API running at http://localhost:${PORT}`);
  console.log(`Allowed frontend origin: ${FRONTEND_URL}`);
});
