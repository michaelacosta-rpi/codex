#!/bin/sh
set -e

ADMIN_PORTAL_ORIGIN=${ADMIN_PORTAL_ORIGIN:-http://admin}
CLIENT_API_ORIGIN=${CLIENT_API_ORIGIN:-/api/client}
RUNTIME_CONFIG_PATH=/usr/share/nginx/html/runtime-config.js

cat > "$RUNTIME_CONFIG_PATH" <<CFG
window.__ADMIN_PORTAL_ORIGIN__='${ADMIN_PORTAL_ORIGIN}';
window.__CLIENT_API_ORIGIN__='${CLIENT_API_ORIGIN}';
CFG

echo "[entrypoint] Runtime config written to $RUNTIME_CONFIG_PATH with origin $ADMIN_PORTAL_ORIGIN and client API $CLIENT_API_ORIGIN"

exec "$@"
