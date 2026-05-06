import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import path from 'path';

const heicConvert: any = require('heic-convert');

let isCloudinaryConfigured = false;

function configureCloudinary() {
  if (isCloudinaryConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
    isCloudinaryConfigured = true;
    return;
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Missing CLOUDINARY_URL or CLOUDINARY_* credentials.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isCloudinaryConfigured = true;
}

function isHeicLike(fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  const lowerType = mimeType.toLowerCase();
  return (
    lowerType.includes('heic') ||
    lowerType.includes('heif') ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  );
}

async function normalizeImageBuffer(file: Express.Multer.File): Promise<{ buffer: Buffer; warning?: string }> {
  let inputBuffer = file.buffer;
  let warning: string | undefined;

  if (isHeicLike(file.originalname, file.mimetype)) {
    const converted = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9,
    });
    inputBuffer = Buffer.from(converted);
    warning = 'Ảnh HEIC đã được chuyển đổi sang JPEG để đảm bảo tương thích.';
  }

  const normalized = await sharp(inputBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return { buffer: normalized, warning };
}

function uploadBuffer(options: {
  buffer: Buffer;
  folder: string;
  resourceType: 'image' | 'video' | 'raw';
  publicIdPrefix: string;
  format?: string;
}): Promise<any> {
  configureCloudinary();

  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e6);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType,
        public_id: `${options.publicIdPrefix}-${timestamp}-${random}`,
        format: options.format,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(options.buffer);
  });
}

export async function uploadImageWithNormalization(file: Express.Multer.File, folder: string) {
  const normalized = await normalizeImageBuffer(file);
  const uploaded = await uploadBuffer({
    buffer: normalized.buffer,
    folder,
    resourceType: 'image',
    publicIdPrefix: path.parse(file.originalname).name.replace(/\s+/g, '-').toLowerCase() || 'image',
    format: 'jpg',
  });

  return {
    url: uploaded.secure_url as string,
    warning: normalized.warning,
    publicId: uploaded.public_id as string,
    width: uploaded.width as number | undefined,
    height: uploaded.height as number | undefined,
    bytes: uploaded.bytes as number | undefined,
  };
}

export async function uploadVideoDirect(file: Express.Multer.File, folder: string) {
  const uploaded = await uploadBuffer({
    buffer: file.buffer,
    folder,
    resourceType: 'video',
    publicIdPrefix: path.parse(file.originalname).name.replace(/\s+/g, '-').toLowerCase() || 'video',
  });

  return {
    url: uploaded.secure_url as string,
    publicId: uploaded.public_id as string,
    bytes: uploaded.bytes as number | undefined,
    duration: uploaded.duration as number | undefined,
  };
}
