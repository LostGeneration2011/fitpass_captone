import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { UserRole } from "@prisma/client";
import { EmailService } from "./email.service";

const JWT_SECRET = process.env.JWT_SECRET || "fitpass_jwt_secret_key_2024";

export class AuthService {
  private emailService = new EmailService();

  // Validate password strength
  private validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: "Mật khẩu phải có ít nhất 8 ký tự" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Mật khẩu phải có ít nhất 1 chữ hoa" };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Mật khẩu phải có ít nhất 1 chữ thường" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Mật khẩu phải có ít nhất 1 chữ số" };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)" };
    }
    // Check for common weak passwords
    const weakPasswords = ['password123', 'Password123', '12345678', 'admin123', 'Admin123'];
    if (weakPasswords.includes(password)) {
      return { valid: false, message: "Mật khẩu này quá phổ biến và không an toàn" };
    }
    return { valid: true };
  }

  async register(fullName: string, email: string, password: string, role: UserRole = 'STUDENT') {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already exists");

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { 
        fullName, 
        email, 
        password: hashed, 
        role,
        emailVerified: false,
        verificationToken
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(user.email, user.fullName, verificationToken);
      console.log(`✅ Verification email sent to: ${user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send verification email to ${user.email}:`, emailError);
      // Don't throw error - allow user to be created even if email fails
      console.log(`⚠️ User created but verification email failed. User will need manual verification.`);
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid email or password");

    if (!user.password) throw new Error("Invalid email or password");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid email or password");

    if (!user.emailVerified) {
      throw new Error("Please verify your email address before logging in. Check your inbox for the verification link.");
    }

    const token = jwt.sign(
      { 
        id: user.id,
        userId: user.id, 
        email: user.email,
        role: user.role,
        fullName: user.fullName
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { user, token };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true
      }
    });
    return user;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, fullName: true }
    });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: "Reset email sent if account exists" };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);

    return { message: "Reset email sent if account exists" };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find user by reset token and check expiry
    const user = await prisma.user.findFirst({
      where: { 
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token must not be expired
        }
      }
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: "Password reset successful" };
  }

  async validateResetToken(token: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date() // Token must not be expired
          }
        }
      });

      return !!user; // Return true if user found, false otherwise
    } catch (error) {
      console.error('❌ Validate reset token error:', error);
      return false;
    }
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    return { message: "Email verified successfully" };
  }
}
