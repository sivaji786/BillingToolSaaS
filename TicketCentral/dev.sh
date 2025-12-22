#!/bin/bash

echo "⚙️  Backend API Server Manager"
echo "========================================"

# Kill any existing processes on port 8080
echo ""
echo "🛑 Checking port 8080..."
PIDS=$(lsof -ti:8080 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "  Found processes: $PIDS"
    kill -9 $PIDS 2>/dev/null
    echo "  ✓ Port 8080 cleared"
    sleep 1
else
    echo "  ✓ Port 8080 is free"
fi

# Start backend API server
echo ""
echo "🚀 Starting backend API on port 8080..."
php spark serve

# Note: This will run in foreground so you can see the logs
