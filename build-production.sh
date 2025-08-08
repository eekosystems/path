#!/bin/bash

echo "===================================="
echo "Building DocWriter for Production"
echo "===================================="
echo ""

echo "Cleaning previous builds..."
rm -rf dist/
rm -rf dist-electron/

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building application..."
npm run build

echo ""
echo "===================================="
echo "Build Complete!"
echo "===================================="
echo ""
echo "Installer location:"
echo "Mac: dist/DocWriter-*.dmg"
echo "Linux: dist/DocWriter-*.AppImage"
echo ""
echo "This installer includes:"
echo "- Built-in cloud service support (Google Drive, Dropbox, OneDrive)"
echo "- No configuration needed by users"
echo "- Ready for distribution"
echo ""