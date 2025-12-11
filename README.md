# Codex Admin Portal

A static, RBAC-aware admin SPA prototype built directly from the guidance in `docs/admin_spa_plan.md`. It includes curated data for users, roles, orders, sessions, feature flags, and audit logs to demonstrate the core flows described in the plan (navigation, impersonation, RBAC-aware buttons, and observability panels).

## Running locally

No build tooling is required. Serve the repository root with any static HTTP server (for example, `python -m http.server 4173`) and open `http://localhost:4173` in a browser.

- **Admin portal**: `http://localhost:4173` (renders `index.html`).
- **Client portal**: `http://localhost:4173/client.html` (renders the customer-facing experience built in `src/client.js`).

The client portal reads live customer data from the configured client API origin (default `/api/client`) and expects JSON responses for:

- `GET /profile`
- `GET /library`
- `GET /invoices`
- `GET /support`
- `GET /timeline`

## Running with Docker

The portal can be deployed as a four-container stack to mirror the broader system:

- **Admin**: a static SPA served by nginx (this repository).
- **Client**: a companion SPA using the same base image and runtime config.
- **Client API**: stub JSON service backing the client portal endpoints.
- **Video hosting service**: placeholder HTTP service representing the media backend.
- **Database**: PostgreSQL for development data.

### Build and run the container

```
docker build -t codex-admin-portal .
docker run -p 4173:80 -e ADMIN_PORTAL_ORIGIN=http://admin codex-admin-portal
```

`ADMIN_PORTAL_ORIGIN` sets the internal URL the SPA will reference for admin communication (defaults to `http://admin`).

### Compose the four-container stack

An example `docker-compose.yml` is included to run all services together:

```
docker compose up --build
```

The compose file exposes:

- Admin SPA at `http://localhost:4173`.
- Client SPA at `http://localhost:4174`.
- Client API stub at `http://localhost:4176` (supports `/profile`, `/library`, `/invoices`, `/support`, `/timeline`, `/video-sessions`).
- Video hosting service placeholder at `http://localhost:4175`.
- PostgreSQL database on port `5432` with default credentials for local development.

Environment variables:

- `ADMIN_PORTAL_ORIGIN`: internal URL the SPAs will reference for admin communication (defaults to `http://admin`).
- `CLIENT_API_ORIGIN`: base URL for client portal API requests (defaults to `/api/client`).

Replace the placeholder images for the video service and database with your production equivalents as needed.

## Notes
- User impersonation in the sidebar immediately updates RBAC gates for navigation and page actions.
- Actions like refund/terminate/export are present to illustrate permission-aware controls; they are placeholders for the backend flows outlined in `docs/admin_spa_plan.md`.
