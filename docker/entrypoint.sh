#!/bin/sh
set -e

ADMIN_PORTAL_ORIGIN=${ADMIN_PORTAL_ORIGIN:-http://admin-portal:4173}
RUNTIME_CONFIG_PATH=/usr/share/nginx/html/runtime-config.js

echo "window.__ADMIN_PORTAL_ORIGIN__='${ADMIN_PORTAL_ORIGIN}';" > "$RUNTIME_CONFIG_PATH"

echo "[entrypoint] Runtime config written to $RUNTIME_CONFIG_PATH with origin $ADMIN_PORTAL_ORIGIN"

exec "$@"
