import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { prisma } from './prisma';
import { EmailService } from '../services/email.service';
const emailService = new EmailService();

// Store to temporarily hold signup role during OAuth flow (timestamp -> role mapping)
// This allows us to match roles even during the OAuth redirect
const signupRoleStore = new Map<string, { role: string; timestamp: number }>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  let cleaned = 0;
  for (const [key, data] of signupRoleStore.entries()) {
    if (data.timestamp < tenMinutesAgo) {
      signupRoleStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired signup roles`);
  }
}, 10 * 60 * 1000);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email from Google'), undefined);
        }

        let shouldSendVerificationEmail = false;
        let verificationTokenForSend: string | null = null;

        // Check if user exists with this googleId or email
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId: profile.id },
              { email: email }
            ]
          }
        });

        if (user) {
          // User exists - link Google account if not already linked
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                provider: user.provider === 'local' ? 'both' : 'google',
                avatar: profile.photos?.[0]?.value || user.avatar,
              }
            });
          } else {
            // Update avatar if needed
            if (profile.photos?.[0]?.value && !user.avatar) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { avatar: profile.photos[0].value }
              });
            }
          }

          if (!user.emailVerified) {
            verificationTokenForSend = user.verificationToken || crypto.randomBytes(32).toString('hex');

            if (!user.verificationToken) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  verificationToken: verificationTokenForSend
                }
              });
            }

            shouldSendVerificationEmail = true;
          }
        } else {
          // Try to get signup role from nearby timestamp (within 5 minutes)
          let signupRole = 'STUDENT'; // Default
          const currentTime = Date.now();
          const fiveMinutesMs = 5 * 60 * 1000;
          
          // Find the closest matching timestamp
          for (const [key, data] of signupRoleStore.entries()) {
            const timeDiff = Math.abs(currentTime - data.timestamp);
            if (timeDiff < fiveMinutesMs && timeDiff < 1000) { // Within 1 second is best match
              signupRole = data.role;
              signupRoleStore.delete(key); // Clean up after use
              console.log(`✅ Found matching role for signup: ${signupRole}`);
              break;
            }
          }
          
          console.log(`👤 Creating new Google user (${email}) with role: ${signupRole}`);

          const verificationToken = crypto.randomBytes(32).toString('hex');
          
          // Create new user
          user = await prisma.user.create({
            data: {
              email: email,
              fullName: profile.displayName || email.split('@')[0] || 'User',
              googleId: profile.id,
              provider: 'google',
              avatar: profile.photos?.[0]?.value,
              emailVerified: false,
              verificationToken,
              password: null, // No password for Google-only users
              role: signupRole as 'STUDENT' | 'TEACHER',
            }
          });

          verificationTokenForSend = verificationToken;
          shouldSendVerificationEmail = true;
        }

        if (shouldSendVerificationEmail && verificationTokenForSend) {
          try {
            await emailService.sendVerificationEmail(user.email, user.fullName, verificationTokenForSend);
            console.log(`✅ Verification email sent to Google OAuth user: ${user.email}`);
          } catch (emailError) {
            console.error(`❌ Failed to send verification email to ${user.email}:`, emailError);
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Export function to register signup role by timestamp
export function registerSignupRole(timestamp: string | number, role: string) {
  if (['STUDENT', 'TEACHER'].includes(role)) {
    const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    signupRoleStore.set(ts.toString(), { role, timestamp: Date.now() });
    console.log(`📝 Signup role registered for timestamp ${ts}: ${role}`);
  }
}

export default passport;
