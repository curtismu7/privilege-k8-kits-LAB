#!/bin/sh
# Host-run start (mock/offline always). Docker: docker compose up -d.
cd "$(dirname "$0")" || exit 1
PORT=${PORT:-7809} HOST=${HOST:-127.0.0.1} exec node server.js
