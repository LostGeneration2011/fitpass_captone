import { Request, Response } from 'express';
import multer from 'multer';
import { uploadImageWithNormalization } from '../utils/cloudinaryMedia';

const storage = multer.memoryStorage();

export const forumMediaUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
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
  try {
    const uploaded = await uploadImageWithNormalization(req.file, 'fitpass/forum');
    res.json({
      url: uploaded.url,
      warning: uploaded.warning,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      size: uploaded.bytes,
    });
  } catch (error) {
    console.error('Forum media upload failed:', error);
    res.status(500).json({ error: 'Failed to upload forum image' });
  }
}
