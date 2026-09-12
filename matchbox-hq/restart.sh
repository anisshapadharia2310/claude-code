#!/bin/sh
cd "$(dirname "$0")"
[ -f .hq.pid ] && kill "$(cat .hq.pid)" 2>/dev/null
sleep 1
nohup node server.js > /tmp/mhq.log 2>&1 &
echo $! > .hq.pid
sleep 2
echo restarted pid=$(cat .hq.pid)
