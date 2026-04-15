# 🔧 FitPass Environment Setup Checklist

## ❌ THIẾU - CẦN BỔ SUNG NGAY

### 1. Backend Email Service (.env)
```bash
# Add to fitpass-captone/backend/.env:
MAILTRAP_HOST=live.smtp.mailtrap.io
MAILTRAP_USER=your-mailtrap-user
MAILTRAP_PASS=your-mailtrap-password  
EMAIL_FROM=noreply@fitpass.com
```

### 2. PayPal Complete Config (.env)
```bash
# Add to fitpass-captone/backend/.env:
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_BASE_URL=https://api.sandbox.paypal.com
```

### 3. Admin Ngrok Integration (.env.local)
```bash
# Update fitpass-admin/.env.local:
NEXT_PUBLIC_API_URL=https://onagraceous-unblenchingly-ebony.ngrok-free.dev/api
NEXT_PUBLIC_API=https://onagraceous-unblenchingly-ebony.ngrok-free.dev/api
```

### 4. Mobile App Production URLs (.env)
```bash
# Add to fitpass-app/.env for production:
EXPO_PUBLIC_API=https://your-backend.vercel.app/api
EXPO_PUBLIC_WS=wss://your-backend.vercel.app/ws
```

## ✅ ĐÃ THIẾT LẬP TỐT

- ✅ Database (Neon PostgreSQL)
- ✅ Cloudinary (Image uploads)  
- ✅ JWT & QR secrets
- ✅ CORS origins
- ✅ Vercel deploy config
- ✅ Prisma ORM
- ✅ Socket.io WebSocket

## 🚀 PRODUCTION READY STEPS

### 1. Vercel Deployment
```bash
# Set these in Vercel dashboard:
DATABASE_URL=postgresql://production-url
JWT_SECRET=production-jwt-secret
MAILTRAP_USER=production-email-user
PAYPAL_CLIENT_ID=production-paypal-id
```

### 2. Domain Setup
- Admin: `https://fitpass-admin.vercel.app`
- Backend: `https://fitpass-api.vercel.app` 
- Update ALLOWED_ORIGINS with real domains

### 3. App Store Deployment
- Update app.json with production config
- Set production API URLs
- Configure deep linking domains

## 📱 CURRENT DEV FLOW (WORKING)

1. **Backend**: `npm run dev` (port 3001)
2. **Ngrok**: Tunnel for external access
3. **Admin**: Next.js on localhost:3000  
4. **Mobile**: Expo Go + tunnel
5. **Email**: Web flow (no deep links needed)

## ⚠️ CRITICAL TODO

1. **Add email service credentials**
2. **Complete PayPal setup**
3. **Update admin to use ngrok URL**
4. **Test end-to-end payment flow**
5. **Verify email delivery**