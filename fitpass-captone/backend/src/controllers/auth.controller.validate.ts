import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // ... existing methods ...

  public validateResetToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ 
          success: false, 
          message: 'Reset token is required' 
        });
        return;
      }

      const isValid = await this.authService.validateResetToken(token);
      
      if (isValid) {
        res.status(200).json({ 
          success: true, 
          message: 'Token is valid' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired reset token' 
        });
      }
    } catch (error: any) {
      console.error('❌ Validate reset token error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      });
    }
  };
}