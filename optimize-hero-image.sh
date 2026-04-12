#!/bin/bash

# Script to optimize hero image
# Install ImageMagick or use online tools if not available

echo "🖼️  Hero Image Optimization Script"
echo "=================================="

cd client/public

# Check if hero_image.jpg exists
if [ ! -f "hero_image.jpg" ]; then
    echo "❌ hero_image.jpg not found in client/public/"
    exit 1
fi

echo "📊 Current file size:"
ls -lh hero_image.jpg

# Try to optimize with ImageMagick if available
if command -v convert &> /dev/null; then
    echo ""
    echo "✨ Optimizing JPEG..."
    convert hero_image.jpg -quality 80 -strip -interlace Plane hero_image-temp.jpg
    mv hero_image-temp.jpg hero_image.jpg
    echo "✅ JPEG optimized"
    
    echo ""
    echo "🔄 Creating WebP version..."
    convert hero_image.jpg -quality 80 hero_image.webp
    echo "✅ WebP created"
    
    echo ""
    echo "📊 Optimized file sizes:"
    ls -lh hero_image.jpg hero_image.webp
else
    echo ""
    echo "⚠️  ImageMagick not found. Use these online tools instead:"
    echo "   • TinyPNG/TinyJPG: https://tinypng.com (compress JPG/PNG)"
    echo "   • CloudConvert: https://cloudconvert.com (to WebP)"
    echo "   • Squoosh: https://squoosh.app (Google's tool, great for WebP)"
    echo ""
    echo "Then place both hero_image.jpg and hero_image.webp in client/public/"
fi

echo ""
echo "✅ Done! The app will now:"
echo "   • Load WebP on modern browsers (smaller, faster)"
echo "   • Fall back to JPG on older browsers"
echo "   • Preload the hero image in HTML head"
echo "   • Use async decoding for better performance"
