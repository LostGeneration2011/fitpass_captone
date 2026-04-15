import { Router, Request, Response, NextFunction } from "express";
import { register, login, me, logout, forgotPassword, resetPassword, validateResetToken, verifyEmail } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth";
import passport, { registerSignupRole } from "../config/passport";
import jwt from "jsonwebtoken";

const router = Router();

// Middleware to capture signup role from query parameter with timestamp
const captureSignupRole = (req: Request, res: Response, next: NextFunction) => {
  const role = req.query.role as string;
  const timestamp = req.query.ts as string;
  
  if (role && timestamp && ['STUDENT', 'TEACHER'].includes(role.toUpperCase())) {
    // Register the role with the timestamp
    registerSignupRole(timestamp, role.toUpperCase());
    console.log(`📋 Signup role captured: ${role} for timestamp ${timestamp}`);
  }
  next();
};

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/validate-reset-token", validateResetToken);
router.get("/verify-email", verifyEmail);

// Google OAuth routes
router.get(
  "/google",
  captureSignupRole,
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    session: false 
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { 
    session: false,
    failureRedirect: "/login?error=google_auth_failed"
  }),
  (req, res) => {
    try {
      const user = req.user as any;
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      const userData = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      };

      // Return HTML that will close the browser and trigger deep link
      const deepLinkUrl = `fitpass://auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
      
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Đăng nhập thành công</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
              }
              .container {
                padding: 2rem;
                max-width: 400px;
              }
              .success-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                animation: bounce 0.6s ease-in-out;
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
              }
              h1 {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
              }
              p {
                opacity: 0.9;
                font-size: 1rem;
                margin-bottom: 2rem;
              }
              .btn {
                background: white;
                color: #667eea;
                padding: 1rem 2rem;
                border-radius: 12px;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.1rem;
                display: inline-block;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transition: transform 0.2s;
              }
              .btn:active {
                transform: scale(0.95);
              }
              .countdown {
                margin-top: 1rem;
                opacity: 0.8;
                font-size: 0.9rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>Đăng nhập thành công!</h1>
              <p>Xin chào, ${userData.fullName}!</p>
              <a href="${deepLinkUrl}" class="btn" id="returnBtn">
                🚀 Quay về ứng dụng
              </a>
              <div class="countdown" id="countdown"></div>
            </div>
            <script>
              let seconds = 3;
              const countdownEl = document.getElementById('countdown');
              const returnBtn = document.getElementById('returnBtn');
              
              // Auto redirect after 3 seconds
              const interval = setInterval(() => {
                countdownEl.textContent = 'Tự động chuyển sau ' + seconds + ' giây...';
                seconds--;
                
                if (seconds < 0) {
                  clearInterval(interval);
                  window.location.href = '${deepLinkUrl}';
                }
              }, 1000);
              
              // Manual button click
              returnBtn.addEventListener('click', (e) => {
                e.preventDefault();
                clearInterval(interval);
                window.location.href = '${deepLinkUrl}';
                
                // Try to close the window (may not work on all browsers)
                setTimeout(() => {
                  window.close();
                }, 500);
              });
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google callback error:", error);
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Lỗi đăng nhập</title>
          </head>
          <body>
            <h1>Lỗi đăng nhập</h1>
            <p>Không thể tạo phiên đăng nhập. Vui lòng thử lại.</p>
            <script>
              setTimeout(() => {
                window.location.href = 'fitpass://auth/callback?error=token_generation_failed';
              }, 2000);
            </script>
          </body>
        </html>
      `);
    }
  }
);

// Export registerSignupRole for use in other files if needed
export { registerSignupRole };

export default router;