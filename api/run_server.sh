#!/bin/bash

# Kill all processes matching "php spark serve"
echo "Stopping any running php spark serve instances..."
pkill -f "php spark serve"

# Allow a moment for processes to terminate and ports to free up
sleep 2

# Check if port 8080 is still in use (just in case it's not a php spark process)
if lsof -i :8080 > /dev/null; then
    echo "Port 8080 is still in use by another process. Killing it..."
    fuser -k 8080/tcp
fi

# Start the server on port 8080
echo "Starting php spark serve on port 8080..."
php spark serve --port 8080
