#!/bin/bash

echo "🎯 LOGIXX Dashboard - Quick Start"
echo "=================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    echo ""
    echo "🌐 Installing Playwright browsers..."
    npx playwright install chromium
    
    if [ $? -ne 0 ]; then
        echo "⚠️  Playwright installation failed. You may need to run this manually:"
        echo "    npx playwright install chromium --with-deps"
    fi
fi

echo ""
echo "🚀 Starting LOGIXX Dashboard..."
echo ""
echo "Dashboard will be available at:"
echo "👉 http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
