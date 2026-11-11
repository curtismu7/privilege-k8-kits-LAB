#!/bin/sh
pkill -f "privilege-k8-kits-LAB.*server.js" 2>/dev/null || pkill -f "node server.js" 2>/dev/null
echo stopped
