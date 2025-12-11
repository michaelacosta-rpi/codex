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

const parties = [
  { id: 'pty-1', name: 'Jordan Lee', role: 'Plaintiff' },
  { id: 'pty-2', name: 'Riley Chen', role: 'Defendant' },
  { id: 'pty-3', name: 'Alex Morgan', role: 'Mediator' }
];

const mediatorParty = parties.find((p) => p.role === 'Mediator');

let uploadedDocuments = [
  {
    id: 'doc-1001',
    name: 'Settlement Agreement Draft.pdf',
    type: 'Settlement agreement',
    uploadedAt: '2025-02-10T15:45:00Z',
    ownerPartyId: 'pty-1',
    sharedWith: ['pty-1', 'pty-2', 'pty-3'],
    signatures: [{ id: 'sig-900', partyId: 'pty-1', name: 'Jordan Lee', signedAt: '2025-02-11T09:05:00Z' }]
  },
  {
    id: 'doc-1002',
    name: 'Mediator Statement.txt',
    type: 'Mediator statement',
    uploadedAt: '2025-02-09T12:30:00Z',
    ownerPartyId: 'pty-3',
    sharedWith: ['pty-1', 'pty-2', 'pty-3'],
    signatures: []
  }
];

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

function getParty(partyId) {
  return parties.find((p) => p.id === partyId);
}

function getSidePartyIds(role) {
  return parties.filter((p) => p.role === role).map((p) => p.id);
}

function getOpposingSidePartyIds(partyId) {
  const owner = getParty(partyId);
  if (!owner) return [];
  return parties.filter((p) => p.role !== owner.role && p.role !== 'Mediator').map((p) => p.id);
}

function setMediatorShare(docId, enabled) {
  uploadedDocuments = uploadedDocuments.map((doc) => {
    if (doc.id !== docId) return doc;
    const owner = getParty(doc.ownerPartyId);
    const ownerSideIds = owner ? getSidePartyIds(owner.role) : [];
    const opposingSideIds = owner ? getOpposingSidePartyIds(owner.id) : [];
    const sharedWith = new Set([...doc.sharedWith, ...ownerSideIds]);

    if (enabled) {
      sharedWith.add(mediatorParty.id);
    } else {
      sharedWith.delete(mediatorParty.id);
      opposingSideIds.forEach((id) => sharedWith.delete(id));
    }

    return { ...doc, sharedWith: Array.from(sharedWith) };
  });
  logEvent('agreement.share.mediator', { docId, enabled });
}

function setOpposingSideShare(docId, enabled) {
  uploadedDocuments = uploadedDocuments.map((doc) => {
    if (doc.id !== docId) return doc;
    const owner = getParty(doc.ownerPartyId);
    const opposingSideIds = owner ? getOpposingSidePartyIds(owner.id) : [];
    const sharedWith = new Set(doc.sharedWith);
    if (!sharedWith.has(mediatorParty.id)) return doc;

    if (enabled) {
      opposingSideIds.forEach((id) => sharedWith.add(id));
      sharedWith.add(mediatorParty.id);
    } else {
      opposingSideIds.forEach((id) => sharedWith.delete(id));
    }

    return { ...doc, sharedWith: Array.from(sharedWith) };
  });
  logEvent('agreement.share.opposing', { docId, enabled });
}

function addSignature(docId, partyId, name) {
  uploadedDocuments = uploadedDocuments.map((doc) => {
    if (doc.id !== docId) return doc;
    const signedAt = new Date().toISOString();
    const existing = doc.signatures.find((sig) => sig.partyId === partyId);
    const signatures = existing
      ? doc.signatures.map((sig) => (sig.partyId === partyId ? { ...sig, name, signedAt } : sig))
      : [...doc.signatures, { id: `sig-${Date.now()}`, partyId, name, signedAt }];
    return { ...doc, signatures };
  });
  logEvent('agreement.signed', { docId, partyId });
  recordMetric('agreement.signature', 1, { docId, partyId });
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
  const menu = createEl('div', 'user-menu stack');
  const invitationName = currentUser.invitationName || currentUser.name;
  const meta = createEl('div', 'stack', [createEl('strong', null, [currentUser.name]), createEl('span', 'muted', [currentUser.email])]);
  const settings = createEl('div', 'menu-section', [
    createEl('div', 'menu-title', ['User settings']),
    createEl('div', 'menu-row', [createEl('span', 'muted', ['Email']), createEl('span', null, [currentUser.email])]),
    createEl('div', 'menu-row', [createEl('span', 'muted', ['Name']), createEl('span', null, [currentUser.name])]),
    createEl('div', 'menu-row', [createEl('span', 'muted', ['Invitation display name']), createEl('span', null, [invitationName])])
  ]);

  const logout = createEl('button', 'button danger ghost', ['Logout']);
  logout.onclick = () => {
    logEvent('auth.logout.simulated', { userId: currentUser.id });
    recordMetric('auth.logout', 1, { userId: currentUser.id });
    alert('Auth placeholder: implement JWT flow per plan.');
  };

  menu.appendChild(meta);
  menu.appendChild(settings);
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
  section.appendChild(renderAgreementWorkflow());
  return section;
}

function renderAgreementWorkflow() {
  const card = createEl('div', 'card stack');
  card.appendChild(createEl('h3', null, ['Agreements & signatures for parties']));
  card.appendChild(
    createEl('p', 'muted', [
      'Upload settlement agreements or mediator statements, choose who can view them, and capture click-to-sign acknowledgements.'
    ])
  );

  const uploadForm = document.createElement('form');
  uploadForm.className = 'agreement-upload';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.doc,.docx,.txt';
  fileInput.required = true;

  const uploaderSelect = document.createElement('select');
  parties.forEach((party) => {
    const option = document.createElement('option');
    option.value = party.id;
    option.textContent = `${party.name} (${party.role})`;
    uploaderSelect.appendChild(option);
  });

  const visibilitySelect = document.createElement('select');
  [
    { value: 'side', label: 'Only visible to my side until shared' },
    { value: 'mediator', label: 'Visible to mediator only (they can forward)' }
  ].forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    visibilitySelect.appendChild(option);
  });

  const typeSelect = document.createElement('select');
  ['Settlement agreement', 'Mediator statement', 'Evidence/Other'].forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });

  const uploadButton = createEl('button', 'button primary', ['Upload & share']);
  uploadButton.type = 'submit';
  uploadForm.append(
    createEl('div', 'stack grow', [createEl('label', 'label', ['Document']), fileInput, createEl('div', 'muted', ['Local-only preview; share controls below determine visibility.'])]),
    createEl('div', 'stack', [createEl('label', 'label', ['Uploaded by']), uploaderSelect]),
    createEl('div', 'stack', [createEl('label', 'label', ['Initial visibility']), visibilitySelect]),
    createEl('div', 'stack', [createEl('label', 'label', ['Type']), typeSelect]),
    createEl('div', 'stack align-end', [uploadButton])
  );

  uploadForm.onsubmit = (e) => {
    e.preventDefault();
    if (!fileInput.files?.length) return;
    const file = fileInput.files[0];
    const owner = getParty(uploaderSelect.value) || parties[0];
    const ownerSideIds = owner ? getSidePartyIds(owner.role) : [];
    const sharedWith = new Set(ownerSideIds);
    if (visibilitySelect.value === 'mediator' && mediatorParty) sharedWith.add(mediatorParty.id);
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type: typeSelect.value,
      uploadedAt: new Date().toISOString(),
      ownerPartyId: owner?.id,
      sharedWith: Array.from(sharedWith),
      signatures: [],
      link: URL.createObjectURL(file)
    };
    uploadedDocuments = [newDoc, ...uploadedDocuments];
    logEvent('agreement.uploaded', { docId: newDoc.id, type: newDoc.type });
    recordMetric('agreement.upload', 1, { type: newDoc.type });
    render();
  };

  card.appendChild(uploadForm);

  const list = createEl('div', 'document-list');
  uploadedDocuments.forEach((doc) => list.appendChild(renderDocumentCard(doc)));
  card.appendChild(list);
  return card;
}

function renderDocumentCard(doc) {
  const wrapper = createEl('div', 'document-card');
  const owner = doc.ownerPartyId ? getParty(doc.ownerPartyId) : null;
  const header = createEl('div', 'row space-between', [
    createEl('div', 'stack', [
      createEl('strong', null, [doc.name]),
      createEl('span', 'muted', [
        `Uploaded ${formatDate(doc.uploadedAt)}${owner ? ` · ${owner.name} (${owner.role})` : ''}`
      ])
    ]),
    createEl('span', 'pill', [doc.type])
  ]);
  wrapper.appendChild(header);

  if (doc.link) {
    const link = document.createElement('a');
    link.href = doc.link;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.className = 'pill soft';
    link.textContent = 'Open shared copy';
    wrapper.appendChild(createEl('div', 'row', [link, createEl('span', 'muted', ['Object URL retained in-memory only'])]));
  }

  const ownerSideIds = owner ? getSidePartyIds(owner.role) : [];
  const opposingSideIds = owner ? getOpposingSidePartyIds(owner.id) : [];
  const mediatorHasAccess = mediatorParty ? doc.sharedWith.includes(mediatorParty.id) : false;
  const opposingSideShared = opposingSideIds.length > 0 && opposingSideIds.every((id) => doc.sharedWith.includes(id));

  const shareRow = createEl('div', 'stack');
  shareRow.appendChild(createEl('div', 'label', ['Visibility pathway']));
  const sharePath = createEl('div', 'share-path');
  const ownerChip = createEl('div', `share-chip ${ownerSideIds.every((id) => doc.sharedWith.includes(id)) ? 'active' : ''}`, [
    createEl('strong', null, ['Owner side']),
    createEl('span', 'muted', [owner ? owner.role : 'Select owner'])
  ]);
  const mediatorChip = createEl('div', `share-chip ${mediatorHasAccess ? 'active' : 'inactive'}`, [
    createEl('strong', null, ['Mediator']),
    createEl('span', 'muted', [mediatorHasAccess ? 'Can view & coordinate' : 'Awaiting share'])
  ]);
  const opposingChip = createEl('div', `share-chip ${opposingSideShared ? 'active' : 'inactive'}`, [
    createEl('strong', null, ['Other side']),
    createEl('span', 'muted', [opposingSideShared ? 'Mediator shared' : 'Mediator gate required'])
  ]);
  [ownerChip, mediatorChip, opposingChip].forEach((chip) => sharePath.appendChild(chip));
  shareRow.appendChild(sharePath);

  const mediatorToggle = document.createElement('input');
  mediatorToggle.type = 'checkbox';
  mediatorToggle.checked = mediatorHasAccess;
  mediatorToggle.onchange = (e) => {
    setMediatorShare(doc.id, e.target.checked);
    render();
  };
  const mediatorLabel = createEl('label', 'pill-checkbox', [mediatorToggle, createEl('span', null, ['Share with mediator'])]);
  shareRow.appendChild(mediatorLabel);

  const opposingToggle = document.createElement('input');
  opposingToggle.type = 'checkbox';
  opposingToggle.checked = opposingSideShared;
  opposingToggle.disabled = !mediatorHasAccess;
  opposingToggle.onchange = (e) => {
    setOpposingSideShare(doc.id, e.target.checked);
    render();
  };
  const opposingLabel = createEl('label', `pill-checkbox ${opposingToggle.disabled ? 'disabled' : ''}`, [
    opposingToggle,
    createEl('span', null, ['Mediator shares with other side'])
  ]);
  shareRow.appendChild(opposingLabel);
  shareRow.appendChild(
    createEl('div', 'muted', [
      'Parties can keep documents private to their side, optionally involve the mediator, and the mediator decides when to release to the opposing side.'
    ])
  );
  wrapper.appendChild(shareRow);

  const signatureArea = createEl('div', 'signature-area');
  signatureArea.appendChild(createEl('div', 'label', ['Click to sign']));
  const signatureForm = document.createElement('form');
  signatureForm.className = 'signature-form';
  const partySelect = document.createElement('select');
  doc.sharedWith.forEach((partyId) => {
    const party = getParty(partyId);
    if (!party) return;
    const opt = document.createElement('option');
    opt.value = party.id;
    opt.textContent = `${party.name} (${party.role})`;
    partySelect.appendChild(opt);
  });
  if (!partySelect.children.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Share with a party to enable signing';
    partySelect.appendChild(opt);
    partySelect.disabled = true;
  }

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Enter your name as signature';
  nameInput.required = true;

  const signButton = createEl('button', 'button primary', ['Click to sign']);
  signButton.type = 'submit';
  signButton.disabled = partySelect.disabled;

  signatureForm.append(partySelect, nameInput, signButton);
  signatureForm.onsubmit = (e) => {
    e.preventDefault();
    if (!partySelect.value) return;
    const signerName = nameInput.value.trim();
    if (!signerName) {
      alert('Enter a name to sign.');
      return;
    }
    addSignature(doc.id, partySelect.value, signerName);
    nameInput.value = '';
    render();
  };
  signatureArea.appendChild(signatureForm);

  const signatureList = createEl('div', 'signature-list');
  if (!doc.signatures.length) {
    signatureList.appendChild(createEl('div', 'muted', ['No signatures captured yet.']));
  } else {
    doc.signatures.forEach((sig) => {
      const party = getParty(sig.partyId);
      signatureList.appendChild(
        createEl('div', 'signature-row', [
          createEl('div', 'stack', [createEl('strong', null, [sig.name]), createEl('span', 'muted', [party ? party.name : 'Unknown party'])]),
          createEl('span', 'pill soft', [`Signed ${formatDate(sig.signedAt)}`])
        ])
      );
    });
  }
  signatureArea.appendChild(signatureList);
  wrapper.appendChild(signatureArea);

  return wrapper;
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
