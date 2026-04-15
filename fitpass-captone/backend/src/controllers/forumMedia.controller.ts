import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set up multer storage for forum media
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/forum-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = `${base}-${Date.now()}${ext}`;
    cb(null, unique);
  }
});

export const forumMediaUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

// Controller for upload
export async function uploadMedia(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Return public URL for the uploaded file
  const url = `/forum-uploads/${req.file.filename}`;
  res.json({ url });
}
