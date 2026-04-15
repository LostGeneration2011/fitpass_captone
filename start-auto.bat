@echo off
title FitPass Auto Manager
color 0A

echo ========================================
echo     🚀 FitPass Auto Manager 🚀
echo ========================================
echo.
echo ✨ Features:
echo   • Auto-start backend + ngrok
echo   • Auto-restart on WiFi change
echo   • Auto-update email URLs
echo   • Works on any device/network
echo.
echo 💡 This will run continuously in background
echo 📱 Password reset works everywhere now!
echo.
echo ========================================

:start
node auto-manager.js

echo.
echo ⚠️ Auto-manager stopped unexpectedly!
echo 🔄 Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto start