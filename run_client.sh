#!/bin/bash

# Kill all processes matching "vite" (often spawned by npm run dev)
echo "Stopping any running vite instances..."
pkill -f "vite"

# Allow a moment for processes to terminate and ports to free up
sleep 2

# Check if port 3000 is still in use
if lsof -i :3000 > /dev/null; then
    echo "Port 3000 is still in use by another process. Killing it..."
    fuser -k 3000/tcp
fi

# Start npm run dev on port 3000
echo "Starting npm run dev on port 3000..."
npm run dev -- --port 3000
