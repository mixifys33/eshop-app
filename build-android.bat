@echo off
REM EasyShop Android Build Script for Windows
REM This script helps you build APK and AAB files easily

echo.
echo ========================================
echo   EasyShop Android Build Script
echo ========================================
echo.

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] EAS CLI not found!
    echo [INFO] Installing EAS CLI...
    call npm install -g eas-cli
)

REM Check if logged in
echo [INFO] Checking EAS login status...
call eas whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Not logged in to EAS
    echo [INFO] Please login:
    call eas login
)

echo.
echo Select build type:
echo 1) Production APK (for direct installation)
echo 2) Production AAB (for Google Play Store)
echo 3) Preview APK (for testing)
echo 4) Preview AAB (for testing)
echo 5) Build BOTH Production APK and AAB
echo 6) Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo [BUILD] Building Production APK...
    call eas build --platform android --profile production-apk
    goto end
)

if "%choice%"=="2" (
    echo [BUILD] Building Production AAB...
    call eas build --platform android --profile production
    goto end
)

if "%choice%"=="3" (
    echo [BUILD] Building Preview APK...
    call eas build --platform android --profile preview
    goto end
)

if "%choice%"=="4" (
    echo [BUILD] Building Preview AAB...
    call eas build --platform android --profile preview-aab
    goto end
)

if "%choice%"=="5" (
    echo [BUILD] Building Production APK...
    call eas build --platform android --profile production-apk
    echo.
    echo [WAIT] Waiting 5 seconds before starting AAB build...
    timeout /t 5 /nobreak >nul
    echo [BUILD] Building Production AAB...
    call eas build --platform android --profile production
    goto end
)

if "%choice%"=="6" (
    echo [EXIT] Goodbye!
    exit /b 0
)

echo [ERROR] Invalid choice!
exit /b 1

:end
echo.
echo ========================================
echo [SUCCESS] Build started!
echo ========================================
echo.
echo [INFO] Monitor progress at: https://expo.dev
echo [INFO] You'll receive an email when build completes
echo.
echo To check build status, run:
echo   eas build:list
echo.
pause
