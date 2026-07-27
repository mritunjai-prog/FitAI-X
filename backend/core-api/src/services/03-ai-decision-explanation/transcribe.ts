import { Router } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Note: Using 'form-data' package or native FormData is required. We'll use form-data here.
const router = Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/v1/coach/transcribe
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filePath = req.file.path;
    
    // Read the file and prepare FormData for Groq API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: req.file.originalname || 'audio.m4a',
      contentType: req.file.mimetype || 'audio/m4a'
    });
    formData.append('model', 'whisper-large-v3');

    // Call Groq Whisper API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        // Let form-data set its own boundary header
        ...formData.getHeaders()
      },
      body: formData as any
    });

    const data = await response.json();

    // Clean up temp file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete temp audio file:', err);
    });

    if (!response.ok) {
      console.error('Groq STT Error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Transcription failed' });
    }

    res.json({ text: data.text });
  } catch (error: any) {
    console.error('Transcription route error:', error);
    res.status(500).json({ error: error.message || 'Failed to process audio' });
  }
});

export default router;
