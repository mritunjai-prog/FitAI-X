import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../db';

const router = Router();

// Setup Multer storage for local mocking of S3
const uploadDir = path.join(__dirname, '../../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// POST /api/v1/users/:userId/documents
router.post('/:userId/documents', upload.single('document'), async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Clean up file if user doesn't exist
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'User not found' });
    }

    // Save metadata to DB
    const fileUrl = `/uploads/${file.filename}`; // Mock S3 URL

    const doc = await prisma.medicalDocument.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileUrl: fileUrl,
      }
    });

    res.json({ message: 'Document uploaded successfully', document: doc });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/v1/users/:userId/documents
router.get('/:userId/documents', async (req, res) => {
  try {
    const { userId } = req.params;
    const docs = await prisma.medicalDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
