#!/bin/bash
echo "Starting TypeF@st server..."
sleep 2
if [ -d "/Applications/Microsoft Edge.app" ]; then
    open -a "Microsoft Edge" http://localhost:8080
elif command -v microsoft-edge &> /dev/null; then
    microsoft-edge http://localhost:8080 &
else
    echo "Warning: Microsoft Edge not found. Please install Edge or open http://localhost:8080 manually."
fi
echo "Server running on http://localhost:8080"
echo "Press Ctrl+C to stop the server"
python3 -m http.server 8080

