import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set up multer storage for chat media
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/chat-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = `${base}-${Date.now()}${ext}`;
    cb(null, unique);
  }
});

export const chatMediaUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/', 'video/'];
    if (!allowed.some((prefix) => file.mimetype.startsWith(prefix))) {
      return cb(new Error('Only image and video files are allowed'));
    }
    cb(null, true);
  }
});

export async function uploadChatMedia(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  return res.json({
    url: `/chat-uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });
}
