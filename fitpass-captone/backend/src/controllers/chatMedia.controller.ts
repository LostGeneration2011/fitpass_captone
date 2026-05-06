import { Request, Response } from 'express';
import multer from 'multer';
import { uploadImageWithNormalization, uploadVideoDirect } from '../utils/cloudinaryMedia';

const storage = multer.memoryStorage();

export const chatMediaUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
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

  try {
    const isVideo = req.file.mimetype.startsWith('video/');
    const uploaded = isVideo
      ? await uploadVideoDirect(req.file, 'fitpass/chat/videos')
      : await uploadImageWithNormalization(req.file, 'fitpass/chat/images');

    return res.json({
      url: uploaded.url,
      warning: (uploaded as { warning?: string }).warning,
      publicId: uploaded.publicId,
      fileName: req.file.originalname,
      fileSize: uploaded.bytes,
      mimeType: isVideo ? req.file.mimetype : 'image/jpeg',
    });
  } catch (error) {
    console.error('Chat media upload failed:', error);
    return res.status(500).json({ error: 'Failed to upload chat media' });
  }
}
