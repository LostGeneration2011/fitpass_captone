@echo off
cd /d "c:\vtc-project3\fitpass"

echo.
echo 🔧 Setting up FitPass Auto-Manager...
echo.

REM Create desktop shortcut
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = "%USERPROFILE%\Desktop\FitPass Auto Manager.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%CD%\start-auto.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "%CD%" >> %SCRIPT%
echo oLink.Description = "FitPass Auto Manager - Auto WiFi Support" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo ✅ Desktop shortcut created!
echo.
echo 🚀 Starting FitPass Auto-Manager...
echo.

call start-auto.bat