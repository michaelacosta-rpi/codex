#!/bin/sh
set -e

ADMIN_PORTAL_ORIGIN=${ADMIN_PORTAL_ORIGIN:-http://admin-portal:4173}
CLIENT_API_ORIGIN=${CLIENT_API_ORIGIN:-/api/client}
RUNTIME_CONFIG_PATH=/usr/share/nginx/html/runtime-config.js

cat > "$RUNTIME_CONFIG_PATH" <<EOF
window.__ADMIN_PORTAL_ORIGIN__='${ADMIN_PORTAL_ORIGIN}';
window.__CLIENT_API_ORIGIN__='${CLIENT_API_ORIGIN}';
EOF

echo "[entrypoint] Runtime config written to $RUNTIME_CONFIG_PATH with admin origin $ADMIN_PORTAL_ORIGIN and client API $CLIENT_API_ORIGIN"

exec "$@"
