import { roles, users, orders, sessions, featureFlags, auditLogs, loginEvents, ssoConnections } from './data/referenceData.js';
import { formatMoney, formatDate, createEl } from './components/utils.js';
import { adminPortalOrigin } from './config.js';
import { createAmplitudeSink, createDataLayerSink, createFullStorySink, initTelemetry, logEvent, recordMetric } from './telemetry.js';

const routes = [
  { path: '', label: 'Dashboard', icon: '🧭', permissions: [] },
  { path: 'users', label: 'Users', icon: '👤', permissions: ['user:view'] },
  { path: 'roles', label: 'Roles', icon: '🛡️', permissions: ['role:manage'] },
  { path: 'orders', label: 'Orders', icon: '🧾', permissions: ['sales:view'] },
  { path: 'sessions', label: 'Sessions', icon: '🔒', permissions: ['session:view'] },
  { path: 'flags', label: 'Feature Flags', icon: '🚩', permissions: ['feature:view'] },
  { path: 'sso', label: 'SSO', icon: '🔐', permissions: ['sso:manage'] },
  { path: 'audit', label: 'Audit Logs', icon: '📜', permissions: ['audit:view'] }
];

let currentUser = users[0];

const getRouteKey = () => (window.location.hash.replace('#/', '') || '').split('?')[0];

initTelemetry({
  getContext: () => ({ userId: currentUser.id, userRoles: currentUser.roles, route: getRouteKey() }),
  sinks: [createAmplitudeSink(), createFullStorySink(), createDataLayerSink()]
});

function hasPermission(permission) {
  if (permission.length === 0) return true;
  const userPermissions = currentUser.roles.flatMap((roleId) => roles.find((r) => r.id === roleId)?.permissions || []);
  return permission.every((p) => userPermissions.includes(p));
}

function can(permission) {
  return hasPermission(Array.isArray(permission) ? permission : [permission]);
}

function setRoute(path) {
  window.location.hash = `#/${path}`;
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const sidebar = renderSidebar();
  const main = renderMain();
  app.appendChild(sidebar);
  app.appendChild(main);
}

function renderSidebar() {
  const sidebar = createEl('aside', 'sidebar');
  const brand = createEl('div', 'brand', ['virtual mediation hosting', createEl('span', 'chip', ['admin'])]);
  sidebar.appendChild(brand);

  const nav = createEl('div', 'nav-section');
  const navTitle = createEl('div', 'nav-title', ['Navigation']);
  nav.appendChild(navTitle);

  const activePath = (window.location.hash.replace('#/', '') || '').split('?')[0];

  routes.forEach((route) => {
    if (!can(route.permissions)) return;
    const link = createEl('a', 'nav-item', [createEl('span', null, [route.icon]), createEl('span', null, [route.label])]);
    link.href = `#/${route.path}`;
    if (route.path === activePath) link.classList.add('active');
    nav.appendChild(link);
  });

  sidebar.appendChild(nav);

  const profile = createEl('div', 'stack');
  const select = document.createElement('select');
  select.value = currentUser.id;
  users.forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.roles.join(', ')})`;
    select.appendChild(opt);
  });
  select.onchange = (e) => {
    currentUser = users.find((u) => u.id === e.target.value) || currentUser;
    logEvent('user.impersonate', { to: currentUser.id, email: currentUser.email });
    recordMetric('user.impersonate', 1, { userId: currentUser.id });
    render();
  };

  profile.appendChild(createEl('div', 'nav-title', ['Impersonate user']));
  profile.appendChild(select);
  profile.appendChild(createEl('div', 'notice', ['RBAC updates immediately when you switch user context.']));
  sidebar.appendChild(profile);

  return sidebar;
}

function renderMain() {
  const main = createEl('main', 'main');
  const hash = window.location.hash.replace('#/', '');
  const routeKey = hash.split('?')[0];
  const activeRoute = routes.find((r) => r.path === routeKey) || routes[0];
  logEvent('navigation.view', { route: activeRoute.path, label: activeRoute.label });
  recordMetric('navigation.view', 1, { route: activeRoute.path || 'dashboard' });
  const crumbs = createEl('div', 'breadcrumbs', [createEl('span', null, ['Home']), createEl('span', null, [activeRoute.label])]);
  const connectionChip = createEl('div', 'chip soft', [`Admin portal: ${adminPortalOrigin}`]);
  const actions = createEl('div', 'topbar-actions', [connectionChip, renderUserMenu()]);
  const topbar = createEl('div', 'topbar', [crumbs, actions]);
  main.appendChild(topbar);

  const content = createEl('div', 'content');
  switch (activeRoute.path) {
    case 'users':
      content.appendChild(renderUsers());
      break;
    case 'roles':
      content.appendChild(renderRoles());
      break;
    case 'orders':
      content.appendChild(renderOrders());
      break;
    case 'sessions':
      content.appendChild(renderSessions());
      break;
    case 'flags':
      content.appendChild(renderFlags());
      break;
    case 'sso':
      content.appendChild(renderSso());
      break;
    case 'audit':
      content.appendChild(renderAudit());
      break;
    default:
      content.appendChild(renderDashboard());
  }

  main.appendChild(content);
  return main;
}

function renderUserMenu() {
  const menu = createEl('div', 'user-menu');
  const meta = createEl('div', 'stack', [createEl('strong', null, [currentUser.name]), createEl('span', 'muted', [currentUser.email])]);
  menu.appendChild(meta);
  const logout = createEl('button', 'button', ['Simulate Logout']);
  logout.onclick = () => {
    logEvent('auth.logout.simulated', { userId: currentUser.id });
    recordMetric('auth.logout', 1, { userId: currentUser.id });
    alert('Auth placeholder: implement JWT flow per plan.');
  };
  menu.appendChild(logout);
  return menu;
}

function renderDashboard() {
  const wrapper = createEl('div', 'stack');
  wrapper.appendChild(createEl('h2', null, ['Mediation control center']));
  wrapper.appendChild(
    createEl('div', 'content-grid', [
      createMetric('Users', `${users.length} accounts`, 'MFA, status, roles'),
      createMetric('Orders', `${orders.length} orders`, 'Refund ready, status transitions'),
      createMetric('Active Sessions', `${sessions.filter((s) => s.active).length}`, 'Terminate or review'),
      createMetric('Feature Flags', `${featureFlags.length} toggles`, 'Rollouts and overrides')
    ])
  );

  const callouts = createEl('div', 'grid-2');
  callouts.appendChild(
    createEl('div', 'card stack', [
      createEl('h3', null, ['Security & RBAC']),
      createEl('div', 'row', [createEl('span', 'pill', ['Token rotation']), createEl('span', 'pill', ['MFA aware']), createEl('span', 'pill', ['Deny-by-default'])]),
      createEl('p', null, ['UI controls respect permission guards through the Can helper, mirroring backend middleware.'])
    ])
  );
  callouts.appendChild(
    createEl('div', 'card stack', [
      createEl('h3', null, ['Auditability']),
      createEl('p', null, ['Every mutating action in this demo would dispatch an audit log entry; export is restricted to audit:export.']),
      createEl('div', 'row', [createEl('span', 'pill', ['CSV/JSON export']), createEl('span', 'pill', ['Actor metadata'])])
    ])
  );
  wrapper.appendChild(callouts);
  return wrapper;
}

function createMetric(title, value, description) {
  const card = createEl('div', 'card stack');
  card.appendChild(createEl('div', 'row', [createEl('h3', null, [title]), createEl('span', 'chip', ['live'])]));
  card.appendChild(createEl('div', null, [createEl('div', 'value', [value])]))
  card.appendChild(createEl('div', 'muted', [description]));
  return card;
}

function renderUsers() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Users']))
  const metaRow = createEl('div', 'row', [
    createEl('span', 'pill', ['Filters: status, role, search']),
    createEl('span', 'pill', ['Reset password flow']),
    createEl('span', 'pill', ['MFA enforcement'])
  ]);
  section.appendChild(metaRow);

  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead>
      <tr><th>Name</th><th>Email</th><th>Status</th><th>Roles</th><th>MFA</th><th>Actions</th></tr>
    </thead>
    <tbody>
      ${users
        .map(
          (u) => `
          <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><span class="badge ${u.status === 'active' ? 'success' : 'danger'}">${u.status}</span></td>
            <td>${u.roles.join(', ')}</td>
            <td>${u.mfa ? 'Enabled' : 'Disabled'}</td>
            <td class="table-actions">
              ${can('user:edit') ? '<button class="button">Edit</button>' : ''}
              ${can('user:deactivate') ? `<button class="button danger" ${u.status !== 'active' ? 'disabled' : ''}>Deactivate</button>` : ''}
            </td>
          </tr>
        `
        )
        .join('')}
    </tbody>`;

  section.appendChild(table);
  return section;
}

function renderRoles() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Roles & Permissions']));
  section.appendChild(createEl('div', 'notice', ['Matrix view with diff preview when editing roles.']));
  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Role</th><th>Description</th><th>Permissions</th><th>Actions</th></tr></thead>
    <tbody>
      ${roles
        .map(
          (r) => `
        <tr>
          <td>${r.name}</td>
          <td>${r.description}</td>
          <td><div class="tag-list">${r.permissions.map((p) => `<span class="tag">${p}</span>`).join('')}</div></td>
          <td class="table-actions">${can('role:manage') ? '<button class="button">Edit</button>' : ''}</td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

function renderOrders() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Orders']));
  section.appendChild(createEl('div', 'row', [createEl('span', 'pill', ['Filters: status/date/customer']), createEl('span', 'pill', ['Refund validation'])]));
  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Refunds</th><th>Actions</th></tr></thead>
    <tbody>
      ${orders
        .map(
          (o) => `
        <tr>
          <td>${o.id}</td>
          <td>${o.customer}</td>
          <td><span class="badge ${o.status === 'refunded' ? 'danger' : 'success'}">${o.status}</span></td>
          <td>${formatMoney(o.total, o.currency)}</td>
          <td>${o.refunds.length ? `${o.refunds.length} refund(s)` : '—'}</td>
          <td class="table-actions">
            ${can(['sales:edit']) ? '<button class="button">Update</button>' : ''}
            ${can(['sales:refund']) ? '<button class="button primary">Refund</button>' : ''}
          </td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

function renderSessions() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Sessions & Login Events']));
  const grid = createEl('div', 'grid-2');

  const sessionCard = createEl('div', 'card stack');
  sessionCard.appendChild(createEl('h3', null, ['Active Sessions']));
  const sessionTable = createEl('table', 'table');
  sessionTable.innerHTML = `
    <thead><tr><th>Session</th><th>User</th><th>IP</th><th>Issued</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      ${sessions
        .map((s) => {
          const user = users.find((u) => u.id === s.userId);
          return `
            <tr>
              <td>${s.id}</td>
              <td>${user?.name || 'Unknown'}</td>
              <td>${s.ip}</td>
              <td>${formatDate(s.issuedAt)}</td>
              <td><span class="badge ${s.active ? 'success' : 'warning'}">${s.active ? 'active' : 'ended'}</span></td>
              <td>${can('session:terminate') ? `<button class="button danger" ${!s.active ? 'disabled' : ''}>Terminate</button>` : ''}</td>
            </tr>`;
        })
        .join('')}
    </tbody>`;
  sessionCard.appendChild(sessionTable);
  grid.appendChild(sessionCard);

  const loginCard = createEl('div', 'card stack');
  loginCard.appendChild(createEl('h3', null, ['Login History']));
  const loginTable = createEl('table', 'table');
  loginTable.innerHTML = `
    <thead><tr><th>User</th><th>Result</th><th>Time</th><th>IP</th><th>Reason</th></tr></thead>
    <tbody>
      ${loginEvents
        .map(
          (e) => `
        <tr>
          <td>${e.user}</td>
          <td><span class="badge ${e.result === 'success' ? 'success' : 'danger'}">${e.result}</span></td>
          <td>${formatDate(e.occurredAt)}</td>
          <td>${e.ip}</td>
          <td>${e.reason || '—'}</td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  loginCard.appendChild(loginTable);
  grid.appendChild(loginCard);

  section.appendChild(grid);
  return section;
}

function renderFlags() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Feature Flags']));
  section.appendChild(createEl('div', 'notice', ['Rollout strategies supported: global, percentage, and per-user/role overrides.']));
  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Key</th><th>Description</th><th>Rollout</th><th>Overrides</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${featureFlags
        .map(
          (f) => `
        <tr>
          <td>${f.key}</td>
          <td>${f.description}</td>
          <td>${f.rollout}${f.rolloutValue ? ` (${f.rolloutValue}%)` : ''}</td>
          <td>${f.overrides.map((o) => o.target).join(', ') || '—'}</td>
          <td><span class="badge ${f.enabled ? 'success' : 'warning'}">${f.enabled ? 'enabled' : 'disabled'}</span></td>
          <td class="table-actions">${can('feature:toggle') ? '<button class="button">Toggle</button>' : ''}</td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

function renderSso() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Single Sign-On']));
  section.appendChild(
    createEl('div', 'row', [
      createEl('span', 'pill', ['OIDC + SAML connectors']),
      createEl('span', 'pill', ['Email discovery + org selector']),
      createEl('span', 'pill', ['Test sign-in, publish, rollback'])
    ])
  );

  const enforcementCounts = ssoConnections.reduce((acc, { enforcement }) => {
    acc[enforcement] = (acc[enforcement] || 0) + 1;
    return acc;
  }, {});

  const summary = createEl('div', 'content-grid');
  summary.appendChild(
    createEl('div', 'card stack', [
      createEl('div', 'row', [createEl('h3', null, ['Connections']), createEl('span', 'badge success', [`${ssoConnections.length} active`])]),
      createEl('p', 'muted', ['Per-organization SSO connectors with provider presets and versioned configuration.'])
    ])
  );
  summary.appendChild(
    createEl('div', 'card stack', [
      createEl('div', 'row', [createEl('h3', null, ['Enforcement']), createEl('span', 'badge warning', ['Policy grid'])]),
      createEl('div', 'stack',
        Object.entries(enforcementCounts).map(([mode, count]) =>
          createEl('div', 'row', [createEl('strong', null, [mode]), createEl('span', 'muted', [`${count} org${count > 1 ? 's' : ''}`])])
        )
      ),
      createEl('p', 'muted', ['Required hides local login, Optional allows fallback, Pilot rolls out to selected groups.'])
    ])
  );
  summary.appendChild(
    createEl('div', 'card stack', [
      createEl('div', 'row', [createEl('h3', null, ['Health']), createEl('span', 'chip soft', ['Telemetry'])]),
      createEl('p', 'muted', ['Metadata refresh cadence, last assertion outcome, and IdP error codes for support triage.']),
      createEl('div', 'row', [
        createEl('span', 'pill', ['Alert: metadata expiry < 7d']),
        createEl('span', 'pill', ['Rate-limit failed assertions']),
        createEl('span', 'pill', ['Clock skew tolerance configured'])
      ])
    ])
  );

  section.appendChild(summary);

  const connectionTable = createEl('table', 'table');
  connectionTable.innerHTML = `
    <thead><tr><th>Org</th><th>Protocol</th><th>Enforcement</th><th>Policy</th><th>Health</th><th>Version</th></tr></thead>
    <tbody>
      ${ssoConnections
        .map(
          (c) => `
        <tr>
          <td>${c.orgName}<div class="muted">${c.provider} preset</div></td>
          <td>${c.protocol} · ${c.providerKey}</td>
          <td><span class="badge ${c.enforcement === 'Required' ? 'danger' : 'warning'}">${c.enforcement}</span></td>
          <td>${c.policy.allowLocalFallback ? 'Fallback allowed' : 'SSO only'} · JIT ${c.policy.jitProvisioning ? 'on' : 'off'} · Groups: ${c.policy.allowedGroups.join(', ')}</td>
          <td>${c.health.lastSuccess ? `Last success ${formatDate(c.health.lastSuccess)}` : 'No success yet'}<div class="muted">Metadata expires ${formatDate(c.health.metadataExpiry)}</div></td>
          <td>v${c.version}</td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(createEl('div', 'card', [createEl('div', 'section-header', [createEl('h3', null, ['Connections & policies'])]), connectionTable]));

  const domainRows = ssoConnections.flatMap((c) =>
    c.domains.map((d) => ({ ...d, orgName: c.orgName, enforcement: c.enforcement, buttonText: c.branding?.buttonText || 'Sign in with SSO' }))
  );
  const domainTable = createEl('table', 'table');
  domainTable.innerHTML = `
    <thead><tr><th>Domain</th><th>Org</th><th>Verified</th><th>Enforcement</th><th>Branding</th></tr></thead>
    <tbody>
      ${domainRows
        .map(
          (d) => `
        <tr>
          <td>${d.domain}</td>
          <td>${d.orgName}</td>
          <td>${formatDate(d.verifiedAt)}</td>
          <td>${d.enforcement}</td>
          <td>${d.buttonText}</td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(createEl('div', 'card', [createEl('div', 'section-header', [createEl('h3', null, ['Domain discovery & branding'])]), domainTable]));

  const detailGrid = createEl('div', 'grid-2');
  ssoConnections.forEach((c) => {
    const actions = createEl('div', 'table-actions');
    const statusClass = c.status === 'Published' ? 'success' : c.status === 'Pilot' ? 'warning' : 'danger';
    const test = createEl('button', 'button', ['Test sign-in']);
    test.onclick = () => {
      logEvent('sso.test', { connectionId: c.id, orgKey: c.orgKey, protocol: c.protocol });
      recordMetric('sso.test', 1, { org: c.orgKey });
      alert('Sandbox assertion simulated. Capture trace + errors in real implementation.');
    };
    const publish = createEl('button', 'button primary', ['Publish']);
    publish.onclick = () => {
      logEvent('sso.publish', { connectionId: c.id, version: c.version });
      recordMetric('sso.publish', 1, { org: c.orgKey });
      alert('Version would be promoted and audit logged.');
    };
    const rollback = createEl('button', 'button danger', ['Rollback']);
    rollback.onclick = () => {
      logEvent('sso.rollback', { connectionId: c.id, version: c.version });
      recordMetric('sso.rollback', 1, { org: c.orgKey });
      alert('Restore prior connection version and disable misconfigured rollout.');
    };
    actions.appendChild(test);
    actions.appendChild(publish);
    actions.appendChild(rollback);

    const card = createEl('div', 'card stack');
    card.appendChild(createEl('div', 'row', [createEl('h3', null, [c.displayName]), createEl('span', `badge ${statusClass}`, [c.status])])) ;
    card.appendChild(createEl('div', 'muted', [`${c.protocol} connector with ${c.provider} preset and redirect(s) ${c.redirectUrls.join(', ')}`]));
    card.appendChild(
      createEl('div', 'tag-list', [
        createEl('span', 'tag', [`Audience: ${c.audience}`]),
        createEl('span', 'tag', [`Client ID: ${c.clientId || 'certificate based'}`]),
        createEl('span', 'tag', [`Metadata: ${c.metadataUrl ? 'auto-refresh' : 'manual'}`])
      ])
    );
    card.appendChild(
      createEl('div', 'stack', [
        createEl('strong', null, ['Attribute mapping']),
        createEl('div', 'muted', [`Email → ${c.attributeMap.email}`]),
        createEl('div', 'muted', [`Name → ${c.attributeMap.name}`]),
        createEl('div', 'muted', [`Role/Groups → ${c.attributeMap.role}`])
      ])
    );
    card.appendChild(
      createEl('div', 'stack', [
        createEl('strong', null, ['Policy & session controls']),
        createEl('div', null, [`Session TTL: ${c.policy.sessionTtlMinutes}m · Refresh TTL: ${c.policy.refreshTtlMinutes}m`]),
        createEl('div', null, [`MFA: ${c.policy.mfaRequirement} · Clock skew: ${c.policy.clockSkewSeconds}s`]),
        createEl('div', null, [`Allowed groups: ${c.policy.allowedGroups.join(', ')}`]),
        createEl('div', 'muted', [c.policy.allowLocalFallback ? 'Local login fallback available' : 'Local login hidden (Required mode)'])
      ])
    );
    card.appendChild(actions);
    detailGrid.appendChild(card);
  });

  section.appendChild(detailGrid);
  return section;
}

function renderAudit() {
  const section = createEl('div', 'stack');
  section.appendChild(createEl('h2', null, ['Audit Logs']));
  section.appendChild(createEl('div', 'row', [createEl('span', 'pill', ['Filter by actor/action/entity']), createEl('span', 'pill', ['Export requires audit:export'])]));
  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Time</th><th>Metadata</th><th>Export</th></tr></thead>
    <tbody>
      ${auditLogs
        .map(
          (log) => `
        <tr>
          <td>${log.actor}</td>
          <td>${log.action}</td>
          <td>${log.entity}</td>
          <td>${formatDate(log.timestamp)}</td>
          <td>${log.metadata}</td>
          <td>${can('audit:export') ? '<button class="button">Export</button>' : '<span class="muted">Requires audit:export</span>'}</td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

window.addEventListener('hashchange', () => {
  render();
});
document.addEventListener('DOMContentLoaded', () => {
  logEvent('app.render.start', { route: getRouteKey() });
  render();
});
