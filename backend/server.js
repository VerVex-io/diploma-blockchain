
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {File} = require('node:buffer');
const {PinataSDK} = require('pinata');

const app = express();
const PORT = process.env.PORT || 5000;

// Check required environment variables
if (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY) {
  throw new Error('Missing PINATA_JWT or PINATA_GATEWAY in backend/.env');
}

// Initialize Pinata
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY
});

// Middleware
app.use(cors());
app.use(express.json());

// Receive files in memory, with a 10 MB limit
const upload = multer(
    {storage: multer.memoryStorage(), limits: {fileSize: 10 * 1024 * 1024}});

// Health check
app.get('/api/health', (req, res) => {
  res.json({success: true, message: 'Diploma Blockchain API is running'});
});

// Upload diploma PDF to public IPFS
app.post('/api/diplomas/upload', upload.single('diploma'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(
          {success: false, message: 'Please upload a PDF file.'});
    }

    // Check MIME type and PDF signature
    const isPdfMime = req.file.mimetype === 'application/pdf';
    const isPdfSignature =
        req.file.buffer.subarray(0, 5).toString() === '%PDF-';

    if (!isPdfMime || !isPdfSignature) {
      return res.status(400).json(
          {success: false, message: 'Only valid PDF files are accepted.'});
    }

    // Convert uploaded buffer into a File for Pinata
    const pdfFile = new File(
        [req.file.buffer], req.file.originalname, {type: 'application/pdf'});

    // Upload to public IPFS
    const result = await pinata.upload.public.file(pdfFile);

    return res.status(201).json({
      success: true,
      message: 'Diploma uploaded successfully!',
      cid: result.cid,
      fileName: result.name,
      size: result.size,
      gatewayUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${result.cid}`
    });

  } catch (error) {
    console.error('IPFS upload error:', error);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error response:', error.response?.data);

    return res.status(500).json(
        {success: false, message: 'Failed to upload diploma to IPFS.'});
  }
});

// Handle file size errors and other Multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'PDF must not exceed 10 MB.' :
                                                err.message
    });
  }

  console.error(err);
  res.status(500).json({success: false, message: 'Internal server error.'});
});

app.listen(PORT, () => {
  console.log(`Diploma Blockchain API running at http://localhost:${PORT}`);
});
