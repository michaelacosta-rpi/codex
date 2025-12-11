# Virtual Mediation Platform Plan

## Confidentiality and security posture
- Mediations and their outcomes are extremely confidential; all system components must preserve privacy by design.
- Enforce strict access controls, encryption, and tenant isolation across portals, APIs, storage, media paths, and observability pipelines.
- Redact or anonymize any mediation details when creating logs, metrics, demos, or support artifacts; treat recordings and transcripts as highly sensitive evidence.

## High-Level Architecture
- **Client applications**
  - **Admin portal (web)**: case intake, mediator assignment, compliance, billing, and operational dashboards.
  - **Client portal (web/mobile)**: guided intake, scheduling, document sharing, secure messaging, and session entry.
- **API layer**
  - Public-facing REST/GraphQL API for portals with OAuth2/OpenID Connect (OIDC) and role-based access control (RBAC).
  - Internal service API for worker queues (notifications, recordings, analytics) and media control events.
- **Core services**
  - **User & Identity Service**: account lifecycle, roles, MFA, SSO via OIDC/SAML, consent tracking.
  - **Case Management Service**: matters, parties, timelines, tasks, agreements, document workflows.
  - **Scheduling Service**: availability, calendar sync (Google/Microsoft), reminders, and room/session allocation.
  - **Media Service**: WebRTC/SFU (e.g., Janus/mediasoup/LiveKit) for secure video, breakout rooms, recording, and moderation hooks.
  - **Messaging/Notification Service**: in-app chat, SMS/email push through queue workers, templated content, and read receipts.
  - **Document Service**: encrypted storage (KMS-managed keys), e-signature integration, virus scanning, and audit trails.
  - **Payments/Billing Service**: fee schedules, invoices, refunds, and revenue reports for admins.
- **Data & storage**
  - Primary relational store (PostgreSQL) for transactional data; Redis for sessions/short-lived tokens; object storage (S3-compatible) for recordings/documents.
  - Analytics/observability pipeline (OpenTelemetry) exporting to warehouse (e.g., BigQuery/Snowflake) and dashboards (Grafana/Looker).
- **Security & compliance**
  - End-to-end TLS, short-lived tokens, hardware-backed keys, encrypted media paths, PII minimization, and per-tenant data segregation.
  - DLP hooks on uploads and chat, continuous audit logging, and retention policies tailored to mediation rules.
- **Deployment**
  - Containerized services orchestrated via Kubernetes with GitOps deployment, blue/green rollouts, and WAF in front of API gateways.

## Local container topology
- **Admin**: the admin portal SPA container for operations teams.
- **Client**: a companion SPA container mirroring the end-user portal.
- **Video hosting service**: placeholder media service container for session entry points.
- **Database**: PostgreSQL container for local data and feature demos.

## Admin Portal Priorities
- **Operations dashboard**: live sessions, breakout usage, mediator load, SLA alerts.
- **Case lifecycle**: intake triage, party verification/KYC, mediator assignment, scheduling, agreement drafting, and archival.
- **Compliance**: audit log review, consent artifacts, retention controls, export for regulators.
- **Billing**: fee schedule configuration, automated invoicing, refunds/credits, and payout reconciliation.

## Client Portal Priorities
- **Onboarding**: guided intake, identity verification, consent collection, and dispute-type templates.
- **Scheduling**: wizard to pick slots, timezone-safe reminders, rescheduling, and waitlists.
- **Session access**: single-use join links, lobby with device checks, and pre-session questionnaires.
- **Collaboration**: secure chat, document exchange with e-sign, and breakout participation.

## Secure Video & Breakout Rooms
- **Topology**: SFU with regional edges; TURN for NAT traversal; media encryption enforced; optional E2EE rooms.
- **Rooms**
  - **Main session** with moderator controls (mute, remove, hand-raise) and evidence sharing.
  - **Breakout rooms** created by admins/mediators with participant move/recall, timers, and private chat.
  - **Recording**: server-side with consent gates and watermarking; protected playback URLs.
- **Access control**
  - Per-room ACLs scoped to case and role; single-use join tokens bound to device/browser fingerprints.
  - Background jobs to revoke tokens when sessions end or compliance policies require.
- **Resilience & monitoring**
  - QoS metrics (bitrate, RTT, jitter) surfaced to admins; adaptive video profiles; degraded-mode audio fallback.
  - Health checks for SFU nodes, autoscaling on active session counts, and chaos testing hooks.

## Core Data Models (relational sketch)
- **User** `(id, email, hashed_password, auth_provider, mfa_enabled, status)`
- **Profile** `(user_id, name, locale, timezone, contact_info)`
- **Role** `(id, key, description)` with **UserRole** join `(user_id, role_id, org_id)`
- **Organization** `(id, name, tier, settings_json, billing_account_id)`
- **Case** `(id, org_id, title, type, status, opened_at, closed_at, lead_mediator_id, metadata_json)`
- **Party** `(id, case_id, user_id, party_type, verified_at)`
- **Session** `(id, case_id, scheduled_for, duration_minutes, status, video_room_id, access_policy_json)`
- **BreakoutRoom** `(id, session_id, name, created_by, status, video_room_id)`
- **RoomParticipant** `(id, session_id, user_id, role, join_token, joined_at, left_at)`
- **Message** `(id, session_id, sender_id, room_scope, content, attachments_json, created_at)`
- **Document** `(id, case_id, uploaded_by, storage_path, checksum, virus_scan_status, signed_at, retention_policy)`
- **Notification** `(id, user_id, channel, template_key, payload_json, sent_at, read_at)`
- **AuditLog** `(id, actor_id, org_id, action, target_type, target_id, ip, user_agent, created_at)`
- **Payment** `(id, org_id, case_id, amount_cents, currency, status, invoice_id, refunded_at)`

## Milestones
1. **Foundation (Weeks 0-4)**
   - Identity/RBAC service, tenant-aware Postgres schema, org and user provisioning flows.
   - API gateway with OAuth2/OIDC, audit logging scaffold, and CI/CD baseline.
2. **Core Case Operations (Weeks 5-8)**
   - Case management CRUD, intake templates, scheduling service, and admin dashboard skeleton.
   - Document storage with scanning and signed URLs; notifications (email/SMS) via queue workers.
3. **Media & Sessions (Weeks 9-12)**
   - SFU integration, lobby/device check UI, main session controls, and breakout room creation/move flows.
   - Join-token issuance/revocation, recording with consent, QoS metrics surfaced to admins.
4. **Portals GA (Weeks 13-16)**
   - Client portal onboarding/scheduling, secure chat, document workflows, and e-sign integration.
   - Admin portal reporting (utilization, billing), billing flows (invoicing/refunds), and compliance exports.
5. **Hardening & Compliance (Weeks 17-20)**
   - DLP policies, data retention/erasure workflows, chaos testing, autoscaling rules, and playbooks.
   - Third-party security review, SOC2 readiness artifacts, and operational runbooks.
