#!/bin/bash

echo "🚀 Building FitPass for Production Deployment"

# Set production environment
export NODE_ENV=production
export IS_PRODUCTION=true

# Production API URLs (replace with your actual domains)
export EXPO_PUBLIC_API="https://your-backend-domain.vercel.app/api"
export EXPO_PUBLIC_WS="wss://your-backend-domain.vercel.app/ws"

echo "📱 Building Expo App..."
cd fitpass-app

# Clean and build
npm run clean 2>/dev/null || true
expo doctor
expo build:web --clear

echo "🏗️ Building for EAS..."
# For mobile app store deployment
eas build --platform all

echo "🔧 Building Backend..."
cd ../fitpass-captone/backend

# Install dependencies and build
npm install
npm run build

echo "🎯 Building Admin Dashboard..."
cd ../../fitpass-admin

# Build admin panel
npm install
npm run build

echo "✅ Production build complete!"
echo ""
echo "📦 Deployment Ready:"
echo "  • Backend: fitpass-captone/backend/dist"
echo "  • Mobile: Built via EAS"
echo "  • Admin: fitpass-admin/.next"
echo ""
echo "🌐 Next Steps:"
echo "  1. Deploy backend to Vercel/Railway/etc"
echo "  2. Deploy admin to Vercel"
echo "  3. Submit mobile app to stores"
echo "  4. Update production environment variables"