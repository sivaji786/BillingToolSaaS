#!/bin/bash

echo "🎨 Frontend Development Server Manager"
echo "========================================"

# Kill any existing processes on port 3000
echo ""
echo "🛑 Checking port 3000..."
PIDS=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "  Found processes: $PIDS"
    kill -9 $PIDS 2>/dev/null
    echo "  ✓ Port 3000 cleared"
    sleep 1
else
    echo "  ✓ Port 3000 is free"
fi

# Start frontend dev server
echo ""
echo "🚀 Starting frontend on port 3000..."
npm run dev

# Note: This will run in foreground so you can see the logs
