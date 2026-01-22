#!/bin/bash

# Development Server Script for Urban Bank API
# This script kills any existing processes on port 8080 and starts the CodeIgniter development server

PORT=8080

echo "🔍 Checking for processes on port $PORT..."

# Find and kill any process using port 8080
PID=$(lsof -ti:$PORT)

if [ ! -z "$PID" ]; then
    echo "⚠️  Found process(es) running on port $PORT: $PID"
    echo "🔪 Killing process(es)..."
    kill -9 $PID
    sleep 1
    echo "✅ Process(es) killed successfully"
else
    echo "✅ Port $PORT is free"
fi

echo "🚀 Starting CodeIgniter development server on port $PORT..."
echo "📍 API will be available at: http://localhost:$PORT"
echo "📍 API endpoints at: http://localhost:$PORT/{endpoint}"
echo "📍 Clean URLs enabled (no /index.php required)"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the development server with router for clean URLs
php -S localhost:$PORT -t public router.php
