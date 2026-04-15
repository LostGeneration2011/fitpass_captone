import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.QR_SECRET || 'fitpass_qr_secret_key_2024';

export interface QRPayload {
  sessionId: string;
  exp: number;
}

export class QRUtils {
  // Generate QR token for session (5 minutes expiry)
  static generateQRToken(sessionId: string): string {
    const payload: QRPayload = {
      sessionId,
      exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes
    };

    return jwt.sign(payload, QR_SECRET, { expiresIn: '5m' });
  }

  // Verify QR token
  static verifyQRToken(token: string): QRPayload {
    try {
      const decoded = jwt.verify(token, QR_SECRET) as QRPayload;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('QR code has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid QR code');
      }
      throw new Error('QR verification failed');
    }
  }

  // Check if token is still valid (not expired)
  static isTokenValid(token: string): boolean {
    try {
      this.verifyQRToken(token);
      return true;
    } catch {
      return false;
    }
  }
}