# Codex Admin Portal

A static, RBAC-aware admin SPA prototype built directly from the guidance in `docs/admin_spa_plan.md`. It ships with mocked data for users, roles, orders, sessions, feature flags, and audit logs to demonstrate the core flows described in the plan (navigation, impersonation, RBAC-aware buttons, and observability panels).

## Running locally

No build tooling is required. Serve the repository root with any static HTTP server (for example, `python -m http.server 4173`) and open `http://localhost:4173` in a browser.

## Running with Docker

The portal can be deployed as a container and paired with other stack services (for example, an admin API or companion SPA) in the same Docker Compose network.

### Build and run the container

```
docker build -t codex-admin-portal .
docker run -p 4173:80 -e ADMIN_PORTAL_ORIGIN=http://admin-portal codex-admin-portal
```

`ADMIN_PORTAL_ORIGIN` sets the internal URL the SPA will reference for admin communication (defaults to `http://admin-portal:4173`).

### Compose with an admin portal peer

An example `docker-compose.yml` is included to co-locate this SPA with a peer admin portal/API container on the same stack:

```
docker compose up --build
```

The compose file exposes the SPA on `http://localhost:4173` and mounts a placeholder admin portal container on `http://localhost:4174`. Update the `admin-portal` service to your real admin portal image as needed.

## Notes
- User impersonation in the sidebar immediately updates RBAC gates for navigation and page actions.
- Actions like refund/terminate/export are present to illustrate permission-aware controls; they are placeholders for the backend flows outlined in `docs/admin_spa_plan.md`.
