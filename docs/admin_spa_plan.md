# Admin SPA Implementation Steps

This document outlines a detailed plan for building an admin single-page application that covers user administration, sales management, and session oversight. It includes role-based access control (RBAC), audit logging, and feature flags, alongside proposed API endpoints, database tables, and test coverage.

## Confidentiality and security expectations
- Mediations and their outcomes are extremely confidential; treat all related case data, recordings, and transcripts as highly sensitive.
- Production and test environments must enforce strict access controls, encryption in transit and at rest, and audit logging for every privileged action.
- Never include real party names, case identifiers, or outcome details in demos, logs, screenshots, or documentation; use anonymized fixtures instead.

## Containerized local stack
- **Admin**: this SPA served from the repository image.
- **Client**: companion SPA container for end-user flows.
- **Video hosting service**: placeholder HTTP service representing the media backend used for session links.
- **Database**: PostgreSQL instance for local data and feature testing.

## Functional Areas
- **User Administration**: Create/edit/deactivate users, manage roles and permissions, password resets, MFA status.
- **Sales Management**: View and edit orders, refunds, discounts, invoicing, and customer account data.
- **Session Oversight**: Active session list, termination, sign-in history, suspicious activity flags.
- **Platform Controls**: Feature flag toggles, audit trail views, system health indicators.

## Architecture Overview
- **Frontend**: SPA using React (or similar) with router-based layouts; component library for tables/forms; state managed via Redux Toolkit/Query or React Query; TypeScript for safety.
- **Backend**: REST (or GraphQL) service with authenticated JWT sessions; RBAC enforced at middleware + handler level; audit logging middleware; feature flag evaluation service.
- **Security**: JWT or session tokens with rotation; CSRF protection for unsafe methods; rate limiting; input validation; encrypted secrets; strict password policies; MFA support.

## RBAC Model
- Roles are collections of permissions; permissions are granular actions.
- Suggested permissions (non-exhaustive): `user:view`, `user:edit`, `user:create`, `user:deactivate`, `role:manage`, `sales:view`, `sales:edit`, `sales:refund`, `session:view`, `session:terminate`, `feature:view`, `feature:toggle`, `audit:view`, `audit:export`.
- Enforce RBAC in middleware and in UI via feature guards. Include deny-by-default server logic.

## Database Schema (Relational)
- **users**: id (pk), email (unique), password_hash, full_name, status, mfa_enabled, last_login_at, created_at, updated_at.
- **roles**: id (pk), name (unique), description, created_at, updated_at.
- **permissions**: id (pk), name (unique), description, created_at, updated_at.
- **role_permissions**: role_id (fk roles.id), permission_id (fk permissions.id), primary key (role_id, permission_id).
- **user_roles**: user_id (fk users.id), role_id (fk roles.id), primary key (user_id, role_id).
- **password_resets**: id (pk), user_id (fk users.id), token_hash, expires_at, used_at.
- **sessions**: id (pk), user_id (fk users.id), issued_at, expires_at, ip_address, user_agent, is_active, terminated_by (nullable fk users.id), terminated_reason.
- **login_events**: id (pk), user_id (fk users.id), occurred_at, ip_address, user_agent, result (success/failure), failure_reason.
- **customers**: id (pk), email, name, status, created_at, updated_at.
- **orders**: id (pk), customer_id (fk customers.id), status, total_cents, currency, placed_at, updated_at.
- **order_items**: id (pk), order_id (fk orders.id), sku, name, quantity, unit_price_cents.
- **refunds**: id (pk), order_id (fk orders.id), amount_cents, currency, reason, created_at, processed_by (fk users.id).
- **feature_flags**: id (pk), key (unique), description, enabled, rollout_type (global/percentage/user), rollout_value (e.g., 50%), created_at, updated_at.
- **feature_flag_overrides**: id (pk), feature_flag_id (fk feature_flags.id), user_id (fk users.id) nullable, role_id (fk roles.id) nullable, enabled, created_at.
- **audit_logs**: id (pk), actor_user_id (fk users.id), action, entity_type, entity_id, metadata (json), ip_address, user_agent, created_at.

## API Endpoints (REST Examples)
- **Auth & Sessions**
  - `POST /api/v1/auth/login`: issue token; log login event.
  - `POST /api/v1/auth/logout`: revoke session.
  - `POST /api/v1/auth/refresh`: rotate tokens.
  - `GET /api/v1/sessions`: list active sessions (RBAC: `session:view`).
  - `POST /api/v1/sessions/:id/terminate`: terminate session (RBAC: `session:terminate`).

- **Users & Roles**
  - `GET /api/v1/users`: list users (filters by status, role, search).
  - `POST /api/v1/users`: create user; triggers invitation/reset flow.
  - `GET /api/v1/users/:id`: get user detail.
  - `PATCH /api/v1/users/:id`: update profile, status, MFA flag.
  - `POST /api/v1/users/:id/reset-password`: initiate reset.
  - `GET /api/v1/roles`: list roles and permissions.
  - `POST /api/v1/roles`: create role.
  - `PATCH /api/v1/roles/:id`: update role and permissions.
  - `DELETE /api/v1/roles/:id`: delete role (with constraints).

- **Sales**
  - `GET /api/v1/orders`: list orders with pagination and filters.
  - `GET /api/v1/orders/:id`: order detail (items, customer, refunds).
  - `PATCH /api/v1/orders/:id`: update status, add notes.
  - `POST /api/v1/orders/:id/refunds`: create refund (RBAC: `sales:refund`).
  - `GET /api/v1/customers`: list/search customers.
  - `GET /api/v1/customers/:id`: customer detail with orders.

- **Feature Flags**
  - `GET /api/v1/feature-flags`: list all flags and overrides.
  - `POST /api/v1/feature-flags`: create flag.
  - `PATCH /api/v1/feature-flags/:id`: toggle/adjust rollout.
  - `POST /api/v1/feature-flags/:id/overrides`: add override (user/role).
  - `DELETE /api/v1/feature-flags/:id/overrides/:overrideId`: remove override.

- **Audit Logs**
  - `GET /api/v1/audit-logs`: paginated query with filters (actor, action, date range, entity).
  - `GET /api/v1/audit-logs/export`: download CSV/JSON (RBAC: `audit:export`).

## Frontend Implementation Steps
1. **Scaffold SPA** with routing for Dashboard, Users, Roles, Orders, Customers, Sessions, Feature Flags, Audit Logs, Settings.
2. **Authentication flow**: login form, token storage, refresh handling, 401 interceptor redirecting to login.
3. **RBAC-aware UI**: fetch current user profile + permissions; build `Can` component/hook to conditionally render actions; hide/disable forbidden actions.
4. **Layouts and Navigation**: sidebar with sections; top bar with user menu and quick search; breadcrumbs per page.
5. **User Management Screens**: table with filters; user detail drawer/form; role assignment modal; MFA and status toggles; audit trail panel.
6. **Role & Permission Screen**: role list, permission matrix, create/edit modal with diff preview.
7. **Sales Screens**: order list with search filters (status/date/customer); order detail view with items, customer card, refund flow; customer detail page with order history.
8. **Session Oversight**: list active sessions, terminate action, session detail with geo/IP info; login history view with success/failure filter.
9. **Feature Flags**: list flags, create/edit form, rollout type selector, overrides table; flag evaluation preview for a given user/role.
10. **Audit Log Viewer**: table with filter by actor/action/entity/date; detail side panel rendering metadata; export action.
11. **Observability/Errors**: global error boundary, toast notifications, loading states; integrate client-side logging.
12. **Accessibility/UX**: keyboard navigation, focus traps for modals, ARIA labels; responsive design.

## Backend Implementation Steps
1. **Set up auth middleware**: JWT verification, session lookup, token rotation; enforce MFA if enabled.
2. **RBAC middleware**: map routes to permissions; deny-by-default with standardized error codes.
3. **Request validation**: schema validation for all payloads (e.g., JSON Schema/Zod/Yup); sanitize inputs.
4. **Audit logging middleware**: capture actor, action, entity, payload diff, IP/user-agent; async dispatch to queue/table.
5. **Feature flag service**: evaluate flags based on rollout strategy and overrides; cache results; admin endpoints for mutations.
6. **Session management**: persist sessions in DB; termination updates `is_active` and writes audit log; throttle login attempts; store login events.
7. **Sales domain handlers**: ensure idempotent refund creation; status transitions with validation; currency handling; totals recomputation.
8. **User domain handlers**: invitation/password reset via signed tokens; role assignment atomic updates; status transitions (active/suspended/deleted) with constraints.
9. **Pagination/filtering**: consistent query helpers for list endpoints; server-side sorting; export endpoints streaming results.
10. **Testing hooks**: seed script for permissions/roles; fixtures for sales data; deterministic clock helpers.

## Sample Test Cases
- **Auth & Sessions**
  - Successful login returns tokens and logs event; invalid password returns 401 and logs failure reason.
  - Refresh rotates tokens and invalidates prior refresh token.
  - Session termination marks session inactive, records `terminated_by`, emits audit log.
  - Unauthorized access to protected route returns 403 when permission missing.
- **RBAC**
  - Users with `sales:view` can fetch orders; without it receive 403.
  - Role update API persists permission set atomically and logs audit entry.
- **Feature Flags**
  - Creating a flag requires `feature:toggle`; rollout types behave as configured (global, percentage, per-user/role overrides).
  - Evaluation respects user and role overrides; cache invalidated on flag change.
- **Users**
  - Creating a user sends invitation/reset token and logs action; duplicate email rejected.
  - Updating status to suspended prevents new logins but keeps existing sessions until expiry (or force-terminate flow tested separately).
- **Sales**
  - Order listing supports filters/pagination; refund creation validates status and amounts; double-refund prevented (idempotency key check).
  - Customer detail endpoint returns orders and refunds aggregated.
- **Audit Logs**
  - All mutating endpoints write audit entries with actor, action, entity, and metadata; export endpoint requires `audit:export`.
- **Accessibility/UX (frontend)**
  - Keyboard navigation works for modals and menus; focus trap tests; ARIA labels present for interactive elements.

## Deployment and Ops Considerations
- Environment configs for database, auth secrets, and logging sinks.
- Background worker for email and audit log processing.
- Rate limiting and WAF rules around auth endpoints.
- Regular backups of relational DB and log retention policies for audit data.
