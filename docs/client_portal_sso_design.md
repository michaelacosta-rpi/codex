# Client Portal SSO Configuration Design

## Goals & scope
- Enable mediators and their staff to authenticate into the client portal via enterprise SSO providers while preserving per-organization isolation and auditability.
- Support both standard enterprise identity providers (e.g., Okta/AzureAD/GSuite via OIDC/SAML) and custom-configured IdPs for unique mediator organizations.
- Provide configuration and monitoring controls through the admin portal, which is restricted to Virtual Mediation Hosting (VMH) employees.
- Maintain parity with existing authentication (username/password + MFA) and allow per-organization rollout/rollback.

## Personas
- **Mediator org member (staff/mediator):** Signs into the client portal using their organization’s SSO or fallback local credentials.
- **VMH admin (employee-only):** Creates and manages SSO connections, reviews health/audit data, and supports tenants during rollout.
- **Security/compliance reviewer:** Consumes audit trails and sign-in policy reports for regulated mediations.

## Requirements
### Functional
- Per-organization SSO connections with the ability to:
  - Select protocol (OIDC or SAML) and common presets for major IdPs (Okta, AzureAD, Google Workspace).
  - Upload/enter discovery endpoints, metadata, certificates, client IDs/secrets, allowed domains, and attribute mappings.
  - Configure login discovery (email domain mapping and explicit “Choose your organization” option).
  - Toggle enforcement modes: **Disabled**, **Optional** (SSO + local), **Required** (SSO only), and **Pilot** (targeted groups).
  - Configure session policies: token lifetime, refresh cadence, MFA requirements (respect IdP MFA signals), and clock-skew tolerances.
  - Provide custom branding for the SSO button/text per org.
- Admin portal surface (VMH employees only):
  - Create/edit/archive SSO connections with validation and test flow ("Test sign-in" using sandbox account).
  - Health panel showing last successful/failed assertions, error codes, and IdP metadata expiry.
  - Audit log entries for all configuration changes and login events (actor, org, IdP, result, IP/user-agent).
  - Rollback capability: revert to prior connection version or disable SSO for an org.
- Client portal UX:
  - Email-based discovery that surfaces the org’s configured SSO button; fallback to username/password when allowed.
  - Error messaging for assertion issues and a recovery path when SSO is misconfigured (notify VMH support, fallback when policy allows).

### Non-functional
- Tenant isolation for secrets/metadata; per-org encryption keys and scoped access controls.
- P99 login latency targets (<1.5s for IdP-initiated redirects excluding IdP time).
- Resilience: circuit breakers on IdP calls, retry/backoff on metadata fetch, graceful degradation to local auth when policy allows.
- Compliance: log retention aligned with mediation data policies; support SCIM/Just-in-Time (JIT) provisioning in later phase.

## Architecture overview
- **Identity Service** handles SSO protocol interactions, token issuance, and user linking.
- **SSO Connector** abstraction for OIDC and SAML with provider presets (Okta, AzureAD, Google Workspace) that pre-fill endpoints and claim mappings.
- **Tenant directory** storing per-organization connection records, domain mappings, and policy flags.
- **Admin portal** exposes configuration UI backed by admin-only APIs; writes audit logs and triggers validation jobs.
- **Client portal** login page performs discovery (email domain lookup or org selector) and initiates SSO flows; consumes login policy to decide fallback availability.
- **Background jobs** refresh IdP metadata, rotate secrets, and emit alerts on health anomalies.

## User flows
1. **Login discovery**
   - User enters email on the client portal.
   - System resolves org via domain mapping; fetches login policy and renders SSO button/branding.
   - If policy is `Required`, local form is hidden; otherwise both options are shown.
2. **SSO authentication**
   - Client initiates OIDC/SAML redirect with org-specific state/nonce; Identity Service validates response, normalizes attributes (name, email, org role), and issues portal tokens.
   - On first login, a link is created between IdP subject and user record (or JIT user is created if policy allows).
3. **Admin configuration**
   - VMH admin uses admin portal to create/edit a connection: choose provider preset → enter metadata/credentials → set policy → upload certificates → save draft and run “Test sign-in”.
   - Successful test allows publishing the connection; audit log captures change and reviewer.
4. **Operations/rollback**
   - Health panel surfaces errors; VMH admin can roll back to a prior version or disable SSO. Login policy updates propagate immediately and are logged.

## Data model additions (relational sketch)
- **sso_connections** `(id, org_id, protocol, provider_key, display_name, auth_url, token_url, metadata_url, audience, client_id, client_secret_enc, certificate_enc, redirect_urls, attribute_map_json, policy, status, version, created_at, updated_at)`
- **sso_domains** `(id, sso_connection_id, domain, verified_at)`
- **sso_policies** `(id, org_id, enforcement_mode, allow_local_fallback, jit_provisioning, allowed_groups_json, session_ttl_minutes, refresh_ttl_minutes, mfa_requirement, clock_skew_seconds, created_at, updated_at)`
- **sso_connection_versions** history table mirroring `sso_connections` fields plus `published_by` and `change_note`.
- **sso_login_events** `(id, org_id, user_id, sso_connection_id, protocol, result, error_code, ip, user_agent, occurred_at)`

## API surface (admin)
- `GET /admin/orgs/:orgId/sso` — fetch connection, domains, and policy details.
- `POST /admin/orgs/:orgId/sso` — create connection (draft) with validation.
- `PATCH /admin/orgs/:orgId/sso` — update metadata/policy; writes audit log and new version.
- `POST /admin/orgs/:orgId/sso/test` — run test sign-in using sandbox credentials; returns trace/error details.
- `POST /admin/orgs/:orgId/sso/publish` — publish validated connection and enforce policy toggle.
- `POST /admin/orgs/:orgId/sso/rollback` — restore prior version.
- `GET /admin/orgs/:orgId/sso/health` — recent login events, metadata expiry, error aggregates.

## Client portal UX & endpoints
- `POST /auth/discover` — resolve org by email domain; respond with SSO availability, branding, and enforcement mode.
- `GET /auth/sso/:orgKey/start` — begin OIDC/SAML flow; includes org-scoped state/nonce.
- `POST /auth/sso/:orgKey/callback` — assertion handling; maps attributes, links user, issues tokens, and records `sso_login_events` + audit log.
- `POST /auth/login` — local fallback (when allowed by policy).
- UI: branded SSO button, clear messaging when SSO required, and support links to VMH help when errors occur.

## Security & compliance considerations
- Encrypt client secrets and certificates per org with envelope encryption; restrict admin access to VMH employee roles.
- Enforce strict state/nonce validation, audience checks, and signature/issuer validation for assertions.
- Honor IdP MFA context and propagate into issued tokens; require MFA for local fallback where policy demands.
- Rate-limit login attempts (including failed SSO assertions) and alert on anomaly spikes.
- Comprehensive audit logging for config changes and login results, retained per compliance policy.

## Telemetry & health
- Metrics: success/failure counts per org/provider, metadata fetch latency, token issuance latency, and error codes.
- Alerts: metadata expiry within 7 days, consecutive failures, clock skew detected, test-sign-in failures on publish.
- Dashboards in admin portal health panel with drill-down to recent events.

## Rollout plan
1. Build SSO connector module with provider presets and validation library.
2. Add data models and migrations; seed provider presets in config.
3. Implement admin APIs + UI for create/edit/test/publish; restrict to VMH employee role.
4. Update client portal discovery/login screens to honor per-org policy and branding.
5. Add background jobs for metadata refresh and alerting; integrate observability dashboards.
6. Pilot with select mediator organizations (Optional mode), then graduate to Required after success metrics are met.

## Open questions
- Do mediator organizations require SCIM or JIT user provisioning at launch, or can we defer to a later milestone?
- Should we support IdP-initiated SSO (ACS endpoints) from day one, or only service-provider initiated flows initially?
- How should we handle organizations with multiple IdPs (e.g., subsidiaries) — allow multiple active connections per org or enforce one?
