# Codex Admin Portal

A static, RBAC-aware admin SPA prototype built directly from the guidance in `docs/admin_spa_plan.md`. It ships with mocked data for users, roles, orders, sessions, feature flags, and audit logs to demonstrate the core flows described in the plan (navigation, impersonation, RBAC-aware buttons, and observability panels).

## Running locally

No build tooling is required. Serve the repository root with any static HTTP server (for example, `python -m http.server 4173`) and open `http://localhost:4173` in a browser.

## Notes
- User impersonation in the sidebar immediately updates RBAC gates for navigation and page actions.
- Actions like refund/terminate/export are present to illustrate permission-aware controls; they are placeholders for the backend flows outlined in `docs/admin_spa_plan.md`.
