# Production Build Script for Windows
Write-Host "🚀 Building FitPass for Production Deployment" -ForegroundColor Green

# Set production environment
$env:NODE_ENV = "production"
$env:IS_PRODUCTION = "true"

# Production API URLs (replace with your actual domains)
$env:EXPO_PUBLIC_API = "https://your-backend-domain.vercel.app/api"
$env:EXPO_PUBLIC_WS = "wss://your-backend-domain.vercel.app/ws"

Write-Host "📱 Building Expo App..." -ForegroundColor Cyan
Set-Location fitpass-app

# Clean and build
try { npm run clean } catch { Write-Host "Clean not available, skipping..." }
expo doctor
expo build:web --clear

Write-Host "🏗️ Building for EAS..." -ForegroundColor Yellow
# For mobile app store deployment
eas build --platform all

Write-Host "🔧 Building Backend..." -ForegroundColor Cyan
Set-Location ..\fitpass-captone\backend

# Install dependencies and build
npm install
npm run build

Write-Host "🎯 Building Admin Dashboard..." -ForegroundColor Cyan
Set-Location ..\..\fitpass-admin

# Build admin panel
npm install
npm run build

Write-Host "✅ Production build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Deployment Ready:" -ForegroundColor Yellow
Write-Host "  • Backend: fitpass-captone/backend/dist"
Write-Host "  • Mobile: Built via EAS"
Write-Host "  • Admin: fitpass-admin/.next"
Write-Host ""
Write-Host "🌐 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy backend to Vercel/Railway/etc"
Write-Host "  2. Deploy admin to Vercel"
Write-Host "  3. Submit mobile app to stores"
Write-Host "  4. Update production environment variables"