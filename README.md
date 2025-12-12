# virtual mediation hosting admin portal

A static, RBAC-aware admin SPA prototype built directly from the guidance in `docs/admin_spa_plan.md`. It includes curated data for users, roles, orders, sessions, feature flags, and audit logs to demonstrate the core flows described in the plan (navigation, impersonation, RBAC-aware buttons, and observability panels).

Our purpose is to deliver a reliable, efficient, purpose-built mediation platform that keeps sensitive casework secure while making every session simple to manage and monitor.

## Confidentiality and security

Mediations and their outcomes are extremely confidential. All environments, configuration, and data used with this project must
be protected with strong access controls, least-privilege credentials, and end-to-end encryption. Logs, screenshots, or sample
data should never include real party names or case outcomes, and any shared assets must be scrubbed of identifying details.

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

The API also accepts writes so the portal can manage its own data source:

- `POST /library` to create a new library entry.
- `POST /support` to file a new support ticket.
- `POST /timeline` to append a customer activity event.

## Running with Docker

The portal can be deployed as a five-container stack to mirror the broader system:

- **Admin**: a static SPA served by nginx (this repository).
- **Client**: a companion SPA using the same base image.
- **Client API**: JSON API for the client portal (`/api/client/*`) backed by PostgreSQL and the video hosting service.
- **Video hosting service**: purpose-built mediation video host with APIs for session lifecycle, invites, and join token issuance.
- **Database**: PostgreSQL for development data.

The admin and client portals now rely on the shared PostgreSQL instance for user identity data. The client API exposes helper endpoints so that users created from the admin side can immediately access the client portal when tagged for that surface.

### Build and run the containers

Make sure Docker and Docker Compose are available on your machine ([Docker install guide](https://docs.docker.com/get-docker/), [compose plugin overview](https://docs.docker.com/compose/)). The stack uses three locally built images plus the official PostgreSQL base image.

1. **Admin/Client SPA** (shared image driven by nginx):

   ```
   docker build -t codex-admin-spa:latest .
   # Run the admin portal directly if you want to test the image without compose
   docker run -p 4173:80 -e ADMIN_PORTAL_ORIGIN=http://admin codex-admin-spa:latest
   ```

   `ADMIN_PORTAL_ORIGIN` sets the internal URL the SPA references for admin communication (defaults to `http://admin:4173`). The same image powers the client-facing portal when paired with the client nginx config in `docker/nginx.client.conf`.

2. **Client API** (production-like API for the client portal):

   ```
   docker build -t codex-client-api:latest ./docker/client-api
   ```

   The Dockerfile installs production dependencies and exposes port `8080` inside the container. The API persists data in PostgreSQL (including profile, library, invoice, support, and timeline records) and automatically seeds sample content on startup if the tables are empty. Configure service connectivity through `DATABASE_URL` and `VIDEO_SERVICE_URL` (the compose file wires these automatically).

3. **Video hosting service** (demo mediation video backend):

   ```
   docker build -t codex-video-hosting:latest ./docker/video-hosting-service
   ```

   The container listens on port `8080` and uses `VIDEO_JOIN_BASE` to craft join links for invites and tokens.

Refer to the [docker build reference](https://docs.docker.com/reference/cli/docker/buildx/build/) if you need alternative build flags (for example, `--platform` or `--build-arg`).

### Compose the stack

An example `docker-compose.yml` is included to run all services together:

```
docker compose up --build
```

If you prefer to build images ahead of time, run the image build commands above and start the compose file without `--build`. See the [Compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/) for details on `up`, `logs`, and `down` behaviors.

The compose file exposes:

- Admin SPA at `http://localhost:4173`.
- Client SPA at `http://localhost:4174`.
- Client API at `http://localhost:4176/api/client`.
- Video hosting service at `http://localhost:4175` with REST endpoints (health, status, session creation, invites, and token issuance).
- PostgreSQL database on port `5432` with default credentials for local development.

The client API reads `VIDEO_SERVICE_URL` (defaulting to `http://video-hosting-service:8080`) so containerized health checks can
validate that the video host is reachable from the API layer.

### Video hosting service endpoints

The dedicated video hosting container now runs a lightweight mediation-ready API (container port `8080`, exposed as `4175` on the host):

- `GET /health` — uptime probe used by the client API system check.
- `GET /status` — service metadata and session counts.
- `GET /sessions` — list scheduled or active sessions (in-memory demo data seeded with `med-5001`).
- `POST /sessions` — create a new mediation session with title, schedule, and access policy details.
- `POST /sessions/:id/invite` — queue an invitation for a participant and append them to the appropriate side.
- `POST /sessions/:id/join-token` — issue a one-time join URL for the participant.
- `POST /sessions/:id/breakouts` — spin up breakout rooms tied to the mediation.

`VIDEO_JOIN_BASE` controls the base used for generated join links (defaults to `https://video.codex.local/room`).

### Client API endpoints for shared users

- `POST /api/client/users` — create or update a user record with `email`, `name`, and a `portals` array (e.g., `['admin', 'client']`).
- `POST /api/client/login` — validate that a user exists and has `client` access; returns the portals attached to the account.
- `GET /api/client/health` — confirms connectivity to the backing PostgreSQL instance.
- `GET /api/client/system-check` — verifies both PostgreSQL connectivity and that the video hosting service is reachable from the API container.

Replace the illustrative images for the video service and database with your production equivalents as needed.

## Notes
- User impersonation in the sidebar immediately updates RBAC gates for navigation and page actions.
- Actions like refund/terminate/export are present to illustrate permission-aware controls; they are placeholders for the backend flows outlined in `docs/admin_spa_plan.md`.
- Telemetry helpers and sink adapters for Amplitude, FullStory, and tag managers are documented in `docs/telemetry.md` to make hooking in product analytics straightforward.
