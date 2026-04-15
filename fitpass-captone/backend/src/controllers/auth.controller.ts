import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { EmailService } from "../services/email.service";

const authService = new AuthService();
const emailService = new EmailService();

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, role } = req.body;
    
    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Full name, email and password are required" });
    }
    
    if (!role || !['STUDENT', 'TEACHER'].includes(role)) {
      return res.status(400).json({ error: "Role must be either STUDENT or TEACHER" });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    console.log('Registering user:', { fullName, email, role });
    
    const user = await authService.register(fullName, email, password, role);
    
    return res.status(201).json({ 
      message: "Registration successful! Please check your email to verify your account before logging in.",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    console.log('Login request body:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    console.log('Login attempt for:', email);
    const { user, token } = await authService.login(email, password);
    console.log('Login successful for:', email);
    // Set JWT as httpOnly cookie, expires in 7 days
    res.cookie('fitpass_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return res.json({ message: "Login successful", user });
  } catch (err: any) {
    console.error('Login error:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

export const me = async (req: any, res: Response) => {
  try {
    const user = await authService.getMe(req.user.id);
    return res.json({ user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({ message: "Logout success" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await authService.forgotPassword(email);
    
    return res.json({ 
      message: "If an account with that email exists, we've sent a password reset link" 
    });
  } catch (err: any) {
    console.error('Forgot password error:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    await authService.resetPassword(token, newPassword);
    
    return res.json({ message: "Password reset successful" });
  } catch (err: any) {
    console.error('Reset password error:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token is required' 
      });
    }

    const isValid = await authService.validateResetToken(token);
    
    if (isValid) {
      return res.status(200).json({ 
        success: true, 
        message: 'Token is valid' 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }
  } catch (error: any) {
    console.error('❌ Validate reset token error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: "Verification token is required" });
    }

    await authService.verifyEmail(token);
    
    // Return clean success page
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - FitPass</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            padding: 2rem;
            background: #f8fafc;
            color: #1a202c;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .success-icon { font-size: 3rem; margin-bottom: 1rem; }
          .title { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #10b981; }
          .message { color: #6b7280; margin-bottom: 2rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <div class="title">Email Verified Successfully!</div>
          <div class="message">
            Your email has been verified. You can now close this page and return to the app to log in.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Email verification error:', err.message);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Failed - FitPass</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            padding: 2rem;
            background: #fef2f2;
            color: #1a202c;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .error-icon { font-size: 3rem; margin-bottom: 1rem; }
          .title { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #dc2626; }
          .message { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <div class="title">Verification Failed</div>
          <div class="message">
            ${err.message}<br><br>
            Please try requesting a new verification email or contact support.
          </div>
        </div>
      </body>
      </html>
    `);
  }
};
