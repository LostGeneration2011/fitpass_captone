import nodemailer from 'nodemailer';
import { NetworkUtils } from '../utils/network.util';

export class EmailService {
  private mailtrapTransporter: nodemailer.Transporter;
  private gmailTransporter: nodemailer.Transporter;
  private fromEmail: string = 'FitPass Team <noreply@fitpass.com>';

  private isGmailAddress(email: string): boolean {
    return email.trim().toLowerCase().endsWith('@gmail.com');
  }

  private getPasswordResetTransporter(to: string, isGoogleUser: boolean) {
    const shouldUseGmail = isGoogleUser || this.isGmailAddress(to);
    return {
      transporter: shouldUseGmail ? this.gmailTransporter : this.mailtrapTransporter,
      via: shouldUseGmail ? 'Gmail' : 'Mailtrap'
    };
  }

  constructor() {
    // Mailtrap for form registration
    this.mailtrapTransporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER || '',
        pass: process.env.MAILTRAP_PASS || ''
      }
    });

    // Gmail for Google OAuth welcome email
    this.gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || '',
        pass: process.env.GMAIL_PASS || ''
      }
    });
  }

  async sendVerificationEmail(to: string, fullName: string, verificationToken: string): Promise<void> {
    // Get dynamic URL using NetworkUtils
    const localIP = NetworkUtils.getLocalIPAddress();
    let verificationUrl = `http://${localIP}:3001/api/auth/verify-email?token=${verificationToken}`;
    let urlSource = 'dynamic IP detection';

    // Priority 1: Live ngrok API (most current)
    const liveNgrokUrl = await this.getCurrentNgrokUrl();
    if (liveNgrokUrl) {
      verificationUrl = `${liveNgrokUrl}/api/auth/verify-email?token=${verificationToken}`;
      urlSource = 'live ngrok API';
    } else {
      // Priority 2: Environment variable ngrok URL
      const envNgrokUrl = process.env.NGROK_URL;
      if (envNgrokUrl) {
        verificationUrl = `${envNgrokUrl}/api/auth/verify-email?token=${verificationToken}`;
        urlSource = 'env variable';
      }
    }

    console.log(`📧 Email verification URL (${urlSource}): ${verificationUrl}`);
    
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: '🔐 Verify Your FitPass Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - FitPass</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #3B82F6;">
              <h1 style="color: #3B82F6; margin: 0; font-size: 28px;">🏋️ FitPass</h1>
              <p style="color: #666; margin: 5px 0;">Your Fitness Journey Awaits</p>
            </div>
            
            <div style="padding: 30px 0; text-align: center;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome to FitPass, ${fullName}! 🎉</h2>
              
              <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
                Thank you for joining FitPass! To complete your registration and start your fitness journey, 
                please verify your email address by clicking the button below.
              </p>
              
              <div style="margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
                  ✅ Verify My Email
                </a>
              </div>
              
              <p style="font-size: 14px; color: #777; margin-top: 25px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a>
              </p>
              
              <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400E;">
                  ⚠️ <strong>Important:</strong> This verification link will expire in 24 hours. 
                  If you didn't create this account, please ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px;">
              <p>© 2025 FitPass Technology. All rights reserved.</p>
              <p>This email was sent to ${to}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.mailtrapTransporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent successfully to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${to}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, fullName: string, role: string, isGoogleUser: boolean = true): Promise<void> {
    try {
      console.log(`📧 Preparing welcome email for: ${to} (${role}, isGoogleUser=${isGoogleUser})`);
      
      const mailOptions = {
        from: '"FitPass Team" <noreply@fitpass.com>',
        to,
        subject: `Chào mừng đến FitPass! 🏋️‍♀️`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; font-size: 32px; margin-bottom: 10px;">💪 Chào mừng đến FitPass!</h1>
              <p style="font-size: 18px; opacity: 0.9;">Hành trình fitness của bạn bắt đầu từ đây</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #fff; margin-top: 0;">Xin chào ${fullName}! 👋</h2>
              <p style="font-size: 16px; line-height: 1.6;">
                Cảm ơn bạn đã tham gia FitPass với vai trò <strong>${role === 'TEACHER' ? 'Giáo viên' : 'Học viên'}</strong>! 
                Chúng tôi rất vui khi có bạn là một phần của cộng đồng fitness của chúng tôi.
              </p>
              
              ${role === 'TEACHER' ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                  <h3 style="color: #fff; margin-top: 0;">🎓 Với tư cách Giáo viên, bạn có thể:</h3>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Tạo và quản lý các lớp fitness</li>
                    <li>Tạo mã QR để điểm danh</li>
                    <li>Theo dõi tiến độ và điểm danh của học viên</li>
                    <li>Giám sát cập nhật phiên học theo thời gian thực</li>
                  </ul>
                </div>
              ` : `
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                  <h3 style="color: #fff; margin-top: 0;">🎯 Với tư cách Học viên, bạn có thể:</h3>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Duyệt và đăng ký các lớp fitness</li>
                    <li>Điểm danh bằng mã QR</li>
                    <li>Theo dõi điểm danh và tiến độ của bạn</li>
                    <li>Cập nhật lịch trình lớp học</li>
                  </ul>
                </div>
              `}
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="color: #fff; margin-top: 0;">🚀 Bạn đã sẵn sàng bắt đầu?</h3>
              <p style="margin-bottom: 20px;">Đăng nhập vào tài khoản của bạn và khám phá tất cả các tính năng mà FitPass cung cấp!</p>
              <a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Mở ứng dụng FitPass
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
              <p style="font-size: 14px; opacity: 0.8; margin: 0;">
                Cần giúp đỡ? Liên hệ với chúng tôi tại support@fitpass.com
              </p>
              <p style="font-size: 12px; opacity: 0.6; margin: 10px 0 0 0;">
                © 2025 FitPass. Bảo lưu mọi quyền.
              </p>
            </div>
          </div>
        `
      };

      const transporter = isGoogleUser ? this.gmailTransporter : this.mailtrapTransporter;
      const via = isGoogleUser ? 'Gmail' : 'Mailtrap';
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent via ${via} to ${to}`);
      console.log(`   📨 Message ID: ${info.messageId}`);
      console.log(`   📨 Response: ${info.response}`);
    } catch (error) {
      console.error(`❌ Email sending failed for ${to}:`, error);
      console.error(`   Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw error - registration should succeed even if email fails
    }
  }

  private async getCurrentNgrokUrl(): Promise<string | null> {
    try {
      const ngrokResponse = await fetch('http://localhost:4040/api/tunnels', { 
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (ngrokResponse.ok) {
        const tunnelData = await ngrokResponse.json() as any;
        const httpsTunnel = tunnelData.tunnels?.find((tunnel: any) => 
          tunnel.proto === 'https' && tunnel.config.addr.includes('3001')
        );
        
        return httpsTunnel ? httpsTunnel.public_url : null;
      }
    } catch (error) {
      console.log('⚠️ Could not reach ngrok API, using fallback...');
    }
    return null;
  }

  async sendPasswordResetEmail(
    to: string,
    fullName: string,
    resetToken: string,
    isGoogleUser: boolean = false
  ): Promise<void> {
    try {
      // Reset password must point to a frontend page, never backend host.
      const normalizedFrontend = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
      const normalizedAdmin = (process.env.ADMIN_URL || '').trim().replace(/\/+$/, '');

      let baseWebUrl = normalizedFrontend || normalizedAdmin || '';
      let urlSource = normalizedFrontend ? 'FRONTEND_URL' : normalizedAdmin ? 'ADMIN_URL' : 'fallback';

      if (!baseWebUrl) {
        const liveNgrokUrl = await this.getCurrentNgrokUrl();
        if (liveNgrokUrl) {
          baseWebUrl = liveNgrokUrl;
          urlSource = 'live ngrok API';
        } else if (process.env.NGROK_URL && !process.env.NGROK_URL.includes('your-ngrok-url')) {
          baseWebUrl = process.env.NGROK_URL.replace(/\/+$/, '');
          urlSource = 'NGROK_URL';
        } else {
          baseWebUrl = 'http://localhost:3000';
        }
      }

      const webResetUrl = `${baseWebUrl}/reset-password?token=${resetToken}`;
      
      console.log(`🌐 Using ${urlSource}: ${webResetUrl}`);
      
      const mailOptions = {
        from: '"FitPass Security" <security@fitpass.com>',
        to,
        subject: '🔐 Reset Your FitPass Password - Works Anywhere!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
            <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; font-size: 32px; margin-bottom: 8px;">🔐 Reset Password</h1>
                <p style="font-size: 18px; color: #6b7280; margin: 0;">Secure • Fast • Works Everywhere</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
                <h2 style="color: white; margin: 0 0 15px 0; font-size: 22px;">Hello ${fullName}! 👋</h2>
                <p style="color: #e0e7ff; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                  Ready to reset your password? This secure link works on any device, any WiFi network, anywhere in the world.
                </p>
                
                <a href="${webResetUrl}" style="display: inline-block; background: white; color: #4F46E5; padding: 18px 36px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(255,255,255,0.3); transition: transform 0.2s;">
                  🚀 Reset Password Now
                </a>
                
                <p style="color: #e0e7ff; font-size: 12px; margin: 15px 0 0 0;">
                  ✨ Universally accessible • No app required
                </p>
              </div>
              
              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">📋 Alternative Options:</h3>
                
                <div style="margin: 15px 0;">
                  <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;"><strong>Copy & Paste Link:</strong></p>
                  <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <code style="color: #4f46e5; font-size: 12px; word-break: break-all; font-family: 'Monaco', 'Menlo', monospace;">${webResetUrl}</code>
                  </div>
                </div>
              </div>
              
              <div style="background: #fef3cd; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>⏰ Security Notice:</strong> This link expires in 1 hour for your security. 
                  If you didn't request this reset, simply ignore this email.
                </p>
              </div>
              
              <div style="text-align: center; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  Questions? We're here to help! 💬
                </p>
                <a href="mailto:support@fitpass.com" style="color: #4f46e5; text-decoration: none; font-weight: 600;">support@fitpass.com</a>
                <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
                  © 2025 FitPass • Secure Fitness Management
                </p>
              </div>
            </div>
          </div>
        `
      };

      const { transporter, via } = this.getPasswordResetTransporter(to, isGoogleUser);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent via ${via} to ${to}`);
      console.log(`🌐 Reset URL (${urlSource}): ${webResetUrl}`);
    } catch (error) {
      console.error('❌ Password reset email sending failed:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendClassReminderEmail(to: string, fullName: string, className: string, startTime: Date): Promise<void> {
    try {
      const timeString = startTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const mailOptions = {
        from: '"FitPass Reminders" <reminders@fitpass.com>',
        to,
        subject: `🏋️‍♀️ Class Reminder: ${className} starts soon!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 10px;">⏰ Class Reminder</h1>
              <p style="font-size: 16px; color: #6b7280;">Don't forget about your upcoming class!</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: white; margin-top: 0; font-size: 24px;">${className}</h2>
              <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px;">
                <p style="margin: 0; font-size: 18px;"><strong>📅 ${timeString}</strong></p>
              </div>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin-bottom: 20px;">
              <h3 style="color: #0c4a6e; margin-top: 0;">Hi ${fullName}! 👋</h3>
              <p style="color: #075985; margin-bottom: 15px;">
                Your class <strong>${className}</strong> is starting soon. Make sure you're ready!
              </p>
              <ul style="color: #075985; margin: 10px 0;">
                <li>Bring your workout gear and water bottle</li>
                <li>Arrive a few minutes early</li>
                <li>Have the FitPass app ready for QR check-in</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Open FitPass App
              </a>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                See you in class! 💪
              </p>
            </div>
          </div>
        `
      };

      await this.mailtrapTransporter.sendMail(mailOptions);
      console.log(`✅ Class reminder email sent to ${to} for ${className}`);
    } catch (error) {
      console.error('❌ Class reminder email sending failed:', error);
      // Don't throw error - class operations should continue even if email fails
    }
  }

  async sendPaymentReceiptEmail(
    to: string,
    fullName: string,
    packageName: string,
    amountVND: number,
    credits: number,
    transactionId: string,
    isGoogleUser: boolean
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountVND);
    const amountUSD = (amountVND / 24000).toFixed(2);
    const paidAt = new Date().toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

    const mailOptions = {
      from: '"FitPass Payments" <payments@fitpass.com>',
      to,
      subject: `🧾 Xác nhận thanh toán FitPass – ${packageName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 6px;">🏋️ FitPass</h1>
              <p style="color: #6b7280; margin: 0; font-size: 16px;">Biên lai thanh toán</p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 28px;">
              <div style="font-size: 40px; margin-bottom: 8px;">✅</div>
              <h2 style="color: #166534; margin: 0 0 6px 0; font-size: 22px;">Thanh toán thành công!</h2>
              <p style="color: #15803d; margin: 0; font-size: 15px;">Gói tập của bạn đã được kích hoạt ngay lập tức.</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Khách hàng</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${fullName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Gói tập</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${packageName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Số buổi</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${credits} buổi</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Số tiền (VND)</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${formattedAmount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Tương đương USD</td>
                <td style="padding: 12px 0; color: #6b7280; text-align: right;">≈ $${amountUSD}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Phương thức</td>
                <td style="padding: 12px 0; color: #111827; text-align: right;">💳 PayPal</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Thời gian</td>
                <td style="padding: 12px 0; color: #111827; text-align: right;">${paidAt}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Mã giao dịch</td>
                <td style="padding: 12px 0; color: #6b7280; font-size: 12px; text-align: right; word-break: break-all;">${transactionId}</td>
              </tr>
            </table>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="color: #1d4ed8; margin: 0; font-size: 14px; line-height: 1.6;">
                💡 <strong>Lưu ý:</strong> Số buổi đã được cộng vào tài khoản. Mở app FitPass để đăng ký lớp học ngay.
              </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 6px 0;">Cần hỗ trợ? Liên hệ <a href="mailto:support@fitpass.com" style="color: #4f46e5;">support@fitpass.com</a></p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 FitPass. Bảo lưu mọi quyền.</p>
            </div>
          </div>
        </div>
      `,
    };

    try {
      const transporter = isGoogleUser ? this.gmailTransporter : this.mailtrapTransporter;
      const via = isGoogleUser ? 'Gmail' : 'Mailtrap';
      await transporter.sendMail(mailOptions);
      console.log(`✅ Payment receipt email sent via ${via} to ${to}`);
    } catch (error) {
      console.error('❌ Payment receipt email sending failed:', error);
      // Don't throw - payment is already complete
    }
  }
}