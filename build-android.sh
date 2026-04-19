#!/bin/bash

# EasyShop Android Build Script
# This script helps you build APK and AAB files easily

echo "🚀 EasyShop Android Build Script"
echo "=================================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null
then
    echo "❌ EAS CLI not found!"
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Check if logged in
echo "🔐 Checking EAS login status..."
if ! eas whoami &> /dev/null
then
    echo "❌ Not logged in to EAS"
    echo "🔑 Please login:"
    eas login
fi

echo ""
echo "Select build type:"
echo "1) Production APK (for direct installation)"
echo "2) Production AAB (for Google Play Store)"
echo "3) Preview APK (for testing)"
echo "4) Preview AAB (for testing)"
echo "5) Build BOTH Production APK and AAB"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo "🔨 Building Production APK..."
        eas build --platform android --profile production-apk
        ;;
    2)
        echo "🔨 Building Production AAB..."
        eas build --platform android --profile production
        ;;
    3)
        echo "🔨 Building Preview APK..."
        eas build --platform android --profile preview
        ;;
    4)
        echo "🔨 Building Preview AAB..."
        eas build --platform android --profile preview-aab
        ;;
    5)
        echo "🔨 Building Production APK..."
        eas build --platform android --profile production-apk
        echo ""
        echo "⏳ Waiting 5 seconds before starting AAB build..."
        sleep 5
        echo "🔨 Building Production AAB..."
        eas build --platform android --profile production
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "✅ Build started!"
echo "📊 Monitor progress at: https://expo.dev"
echo "📧 You'll receive an email when build completes"
echo ""
echo "To check build status, run:"
echo "  eas build:list"
