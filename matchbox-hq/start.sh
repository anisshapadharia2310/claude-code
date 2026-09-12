#!/bin/sh
echo "Starting Matchbox HQ..."
node "$(dirname "$0")/server.js" &
sleep 1
(xdg-open http://localhost:4321 || open http://localhost:4321) >/dev/null 2>&1
wait
