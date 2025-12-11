import { createEl, formatDate, formatMoney } from './components/utils.js';
import { fetchClientPortalData } from './data/clientApi.js';
import { adminPortalOrigin } from './config.js';

const routes = [
  { path: '', label: 'Overview' },
  { path: 'library', label: 'Library' },
  { path: 'billing', label: 'Billing' },
  { path: 'video', label: 'Video sessions' },
  { path: 'support', label: 'Support' }
];

const state = {
  loading: true,
  error: null,
  data: null,
  videoUi: {
    accessPolicy: 'verified',
    verificationMethod: 'magic_link',
    cacheMinutes: 30,
    meetingAdmins: [],
    guestName: '',
    guestSide: '',
    guestError: null,
    attemptsByGuest: {},
    waitingEntries: [],
    verifiedGuests: [],
    cameraCovered: false,
    remindVideoOn: true,
    coMediatorName: '',
    coMediatorEmail: '',
    coMediatorNotes: '',
    coMediatorError: null
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await hydrate();
  render();
  setInterval(() => {
    pruneWaitingEntries();
    render();
  }, 30000);
});

window.addEventListener('hashchange', render);

async function hydrate() {
  state.loading = true;
  state.error = null;
  render();

  try {
    state.data = await fetchClientPortalData();
    const primarySession = state.data?.videoSessions?.[0];
    if (primarySession) {
      state.videoUi = {
        accessPolicy: primarySession.accessPolicy || 'verified',
        verificationMethod: primarySession.verificationMethod || 'magic_link',
        cacheMinutes: primarySession.cacheMinutes || 30,
        meetingAdmins: primarySession.meetingAdmins || [],
        guestName: '',
        guestSide: primarySession.sides?.[0]?.label || '',
        guestError: null,
        attemptsByGuest: {},
        waitingEntries: normalizeWaitingEntries(primarySession.sides || []),
        verifiedGuests: [],
        cameraCovered: false,
        remindVideoOn: true,
        coMediatorName: '',
        coMediatorEmail: '',
        coMediatorNotes: '',
        coMediatorError: null
      };
    }
  } catch (err) {
    state.error = err;
  } finally {
    state.loading = false;
  }
}

function getRoute() {
  return window.location.hash.replace('#/', '') || '';
}

function render() {
  const app = document.getElementById('client-app');
  if (!app) return;

  app.innerHTML = '';
  app.appendChild(renderBackdrop());

  if (state.loading) {
    app.appendChild(renderLoading());
    return;
  }

  if (state.error) {
    app.appendChild(renderError());
    return;
  }

  app.appendChild(renderHero());
  app.appendChild(renderNav());
  app.appendChild(renderContent());
}

function renderBackdrop() {
  return createEl('div', 'client-backdrop');
}

function renderLoading() {
  const shell = createEl('div', 'card shell');
  shell.appendChild(createEl('div', 'shimmer title')); 
  shell.appendChild(createEl('div', 'shimmer body')); 
  shell.appendChild(createEl('div', 'shimmer body long')); 
  return createEl('div', 'client-layout', [shell]);
}

function renderError() {
  const retry = createEl('button', 'button primary', ['Retry']);
  retry.onclick = async () => {
    await hydrate();
    render();
  };

  return createEl('div', 'client-layout', [
    createEl('div', 'card error-card', [
      createEl('div', 'section-header', [createEl('h3', null, ['Unable to load portal']), createEl('span', 'badge warning', ['Service'])]),
      createEl('p', 'muted', ['Something went wrong while contacting the client API. Check connectivity or try again.']),
      createEl('div', 'hero-actions', [retry])
    ])
  ]);
}

function renderHero() {
  const profile = state.data?.profile || {};
  const hero = createEl('div', 'client-hero');
  const meta = createEl('div', 'hero-meta', [
    createEl('div', 'eyebrow', ['Client workspace']),
    createEl('h1', null, [`${profile.company || 'Client'} Portal`]),
    createEl('div', 'muted', [`Primary contact: ${profile.contact || '—'} · ${profile.email || ''}`]),
    createEl('div', null, [`Customer success: ${profile.successManager || '—'}`])
  ]);

  const actions = createEl('div', 'hero-actions', [
    createEl('button', 'button primary', ['New upload']),
    createEl('a', 'button ghost', [`Admin portal (${adminPortalOrigin})`])
  ]);

  actions.lastChild.href = adminPortalOrigin;

  hero.appendChild(meta);
  hero.appendChild(actions);
  return hero;
}

function renderNav() {
  const nav = createEl('div', 'navbar');
  const active = getRoute();

  routes.forEach((route) => {
    const link = createEl('a', `nav-item ${route.path === active ? 'active' : ''}`.trim(), [route.label]);
    link.href = `#/${route.path}`;
    nav.appendChild(link);
  });

  return nav;
}

function renderContent() {
  const content = createEl('div', 'client-content');
  const route = getRoute();

  switch (route) {
    case 'library':
      content.appendChild(renderLibrary());
      break;
    case 'billing':
      content.appendChild(renderBilling());
      break;
    case 'video':
      content.appendChild(renderVideoPortal());
      break;
    case 'support':
      content.appendChild(renderSupport());
      break;
    default:
      content.appendChild(renderOverview());
  }

  return content;
}

function renderOverview() {
  const profile = state.data?.profile || {};
  const timeline = state.data?.timeline || [];
  const section = createEl('div', 'grid');
  section.appendChild(createStatCard('Plan', `${profile.plan || '—'} · ${profile.supportLevel || 'Support'}`, `Renews ${formatDate(profile.renewalDate)}`));
  section.appendChild(createStatCard('Seats', `${profile.seatsUsed || 0}/${profile.seatsTotal || 0} used`, `${(profile.seatsTotal || 0) - (profile.seatsUsed || 0)} seats available`));
  section.appendChild(createStatCard('Storage', `${profile.storageUsedGb || 0} GB`, `of ${profile.storageTotalGb || 0} GB allocated`));

  const guardrails = createEl('div', 'grid');
  guardrails.appendChild(
    createEl('div', 'card', [
      createEl('div', 'section-header', [createEl('h3', null, ['Access & Security']), createPills(['SSO enabled', 'MFA enforced'])]),
      createEl('p', 'muted', ['Managed access with SSO, SCIM provisioning, and MFA enforcement across viewers.'])
    ])
  );
  guardrails.appendChild(
    createEl('div', 'card', [
      createEl('div', 'section-header', [createEl('h3', null, ['Recent activity']), createEl('span', 'muted', ['Automated updates'])]),
      createTimeline(timeline)
    ])
  );
  guardrails.appendChild(
    createEl('div', 'card', [
      createEl('div', 'section-header', [createEl('h3', null, ['Upcoming']), createEl('span', 'muted', ['Customer success'])]),
      createEl('p', null, ['Success manager will share a Q2 adoption plan with recommended feature flags next week.'])
    ])
  );

  const wrapper = createEl('div', 'grid');
  wrapper.appendChild(section);
  wrapper.appendChild(guardrails);
  return wrapper;
}

function renderLibrary() {
  const libraryItems = state.data?.library || [];
  const section = createEl('div', 'card');
  section.appendChild(createEl('div', 'section-header', [createEl('h3', null, ['Video library']), createEl('span', 'muted', ['Processing + published assets'])]));

  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Title</th><th>Visibility</th><th>Status</th><th>Views</th><th>Updated</th></tr></thead>
    <tbody>
      ${libraryItems
        .map(
          (item) => `
          <tr>
            <td>${item.title}</td>
            <td>${item.visibility}</td>
            <td><span class="badge ${item.status === 'Published' ? 'success' : 'warning'}">${item.status}</span></td>
            <td>${(item.views || 0).toLocaleString()}</td>
            <td>${formatDate(item.updatedAt)}</td>
          </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

function renderBilling() {
  const invoices = state.data?.invoices || [];
  const section = createEl('div', 'card');
  section.appendChild(createEl('div', 'section-header', [createEl('h3', null, ['Billing & invoices']), createPills(['Auto-pay enabled'])]));

  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Invoice</th><th>Period</th><th>Status</th><th>Due</th><th>Total</th></tr></thead>
    <tbody>
      ${invoices
        .map(
          (invoice) => `
          <tr>
            <td>${invoice.id}</td>
            <td>${invoice.period}</td>
            <td><span class="badge ${invoice.status === 'Paid' ? 'success' : 'warning'}">${invoice.status}</span></td>
            <td>${formatDate(invoice.dueAt)}</td>
            <td>${formatMoney(invoice.total, invoice.currency)}</td>
          </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

function renderSupport() {
  const profile = state.data?.profile || {};
  const supportTickets = state.data?.supportTickets || [];
  const section = createEl('div', 'grid');
  const cases = createEl('div', 'card');
  cases.appendChild(createEl('div', 'section-header', [createEl('h3', null, ['Open cases']), createPills([profile.supportLevel || 'Standard', 'SLA tracked'])]));
  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Case</th><th>Subject</th><th>Priority</th><th>Status</th><th>Opened</th><th>SLA</th></tr></thead>
    <tbody>
      ${supportTickets
        .map(
          (ticket) => `
          <tr>
            <td>${ticket.id}</td>
            <td>${ticket.subject}</td>
            <td>${ticket.priority}</td>
            <td><span class="badge ${ticket.state === 'Resolved' ? 'success' : 'warning'}">${ticket.state}</span></td>
            <td>${formatDate(ticket.openedAt)}</td>
            <td>${ticket.sla}</td>
          </tr>`
        )
        .join('')}
    </tbody>`;
  cases.appendChild(table);
  section.appendChild(cases);

  const cta = createEl('div', 'card highlight');
  cta.appendChild(createEl('h3', null, ['Need faster help?']));
  cta.appendChild(createEl('p', 'muted', ['Reach your customer success manager or file a priority request for live incidents.']));
  cta.appendChild(createEl('div', 'pill-row', [createEl('span', 'pill', ['Escalation playbook']), createEl('span', 'pill', ['Incident room'])]));
  cta.appendChild(createEl('div', 'hero-actions', [createEl('button', 'button primary', ['Open priority case']), createEl('button', 'button outline', ['Schedule time'])]));
  section.appendChild(cta);

  return section;
}

function renderVideoPortal() {
  const sessions = state.data?.videoSessions || [];
  const session = sessions[0] || {};
  const editable = !session.startedAt;
  pruneWaitingEntries();
  const accessLockedBadge = createEl('span', `badge ${editable ? 'success' : 'warning'}`, [
    editable ? 'Editable until first participant joins' : 'Locked after mediation starts'
  ]);

  const layout = createEl('div', 'video-grid');

  const schedulingCard = createEl('div', 'card');
  schedulingCard.appendChild(
    createEl('div', 'section-header', [
      createEl('div', 'stack', [
        createEl('h3', null, ['Scheduling & access']),
        createEl('span', 'muted', [
          'Sessions are link-based and can be locked to verified email or open to anyone with the join link until the first join.'
        ])
      ]),
      accessLockedBadge
    ])
  );

  schedulingCard.appendChild(
    createEl('div', 'muted', [
      `Next session: ${session.scheduledFor ? formatDate(session.scheduledFor) : 'Not scheduled'} • ${
        session.durationMinutes || 60
      } minutes • `,
      createEl('strong', null, [session.title || 'Mediation session'])
    ])
  );

  const accessRow = createEl('div', 'setting-row', [createEl('div', 'muted', ['Access policy'])]);
  const accessGroup = createToggleGroup(
    [
      {
        label: 'Verified emails only',
        value: 'verified',
        helper: 'Parties validate via email link or code; mediator must be authenticated.'
      },
      {
        label: 'Anyone with the link',
        value: 'open',
        helper: 'Lobby enabled, optional waiting-room admission for unauthenticated guests.'
      }
    ],
    state.videoUi.accessPolicy,
    (value) => updateVideoSetting('accessPolicy', value),
    !editable
  );
  accessRow.appendChild(accessGroup);
  schedulingCard.appendChild(accessRow);

  const joinLink = createEl('div', 'join-link', [
    createEl('div', 'muted', ['Join link']),
    createEl('div', 'link-row', [createEl('code', null, [session.joinLink || 'https://video.codex.local/join']), createEl('span', 'pill', ['Shareable'])])
  ]);
  schedulingCard.appendChild(joinLink);

  const verificationCard = createEl('div', 'card');
  verificationCard.appendChild(
    createEl('div', 'section-header', [createEl('h3', null, ['Verification & rejoin caching']), createEl('span', 'badge muted', ['Email gate'])])
  );

  const verificationGroup = createToggleGroup(
    [
      { label: 'Magic link', value: 'magic_link', helper: 'Send a one-time link to verify email ownership.' },
      { label: 'One-time code', value: 'code', helper: 'Send a short code to enter in the lobby.' }
    ],
    state.videoUi.verificationMethod,
    (value) => updateVideoSetting('verificationMethod', value),
    !editable
  );
  verificationCard.appendChild(createEl('div', 'muted', ['Verification sent when a party attempts to join; mediator always authenticated.']));
  verificationCard.appendChild(verificationGroup);
  verificationCard.appendChild(
    createEl('div', 'notice', [
      `Verified tokens cached for ${state.videoUi.cacheMinutes} minutes so disconnected parties can rejoin without re-verifying; mediator joins always requires authentication.`
    ])
  );

  const guestCard = createEl('div', 'card');
  guestCard.appendChild(
    createEl('div', 'section-header', [
      createEl('h3', null, ['Guest join (unauthenticated flow)']),
      createEl('span', 'badge warning', ['Side selection required'])
    ])
  );

  guestCard.appendChild(
    createEl('div', 'muted', [
      'For sessions requiring authentication, guests must choose their side, enter their name, and wait for admission. They receive a preview and are removed after 5 minutes if not admitted (max 3 attempts).'
    ])
  );

  guestCard.appendChild(renderGuestForm(session));

  const waitingCard = createEl('div', 'card');
  waitingCard.appendChild(
    createEl('div', 'section-header', [
      createEl('h3', null, ['Waiting room & guest admission']),
      createEl('span', 'badge warning', ['Per-side controls'])
    ])
  );
  waitingCard.appendChild(
    createEl('p', 'muted', [
      'If authentication is required, unauthenticated guests stay in a waiting room. Mediator can admit one guest per side when mediation rules allow.'
    ])
  );

  waitingCard.appendChild(renderWaitingRoom(session));

  const rosterCard = createEl('div', 'card');
  rosterCard.appendChild(
    createEl('div', 'section-header', [createEl('h3', null, ['Participants & designations']), createEl('span', 'badge muted', ['Mediator required to authenticate'])])
  );

  const rosterTable = createEl('table', 'table');
  rosterTable.innerHTML = `
    <thead><tr><th>Name</th><th>Designation</th><th>Authentication</th><th>Status</th></tr></thead>
    <tbody>
      ${(session.participants || [])
        .map(
          (participant) => `
        <tr>
          <td>${participant.name}</td>
          <td>${participant.designation}</td>
          <td>${participant.authenticated ? 'Verified' : 'Awaiting verification'}</td>
          <td><span class="badge ${participant.authenticated ? 'success' : 'warning'}">${
            participant.designation === 'Mediator' ? 'Must be authenticated' : participant.authenticated ? 'Ready' : 'Needs check'
          }</span></td>
        </tr>`
        )
        .join('')}
    </tbody>`;
  rosterCard.appendChild(rosterTable);

  const mediatorCard = createEl('div', 'card highlight mediator-card');
  mediatorCard.appendChild(
    createEl('div', 'section-header', [createEl('h3', null, ['Mediator controls']), createEl('span', 'badge success', ['Guided'])])
  );
  mediatorCard.appendChild(
    createEl('div', 'mediator-actions', [
      createEl('button', 'button primary big', ['Start mediation (locks settings)']),
      createEl('button', 'button outline big', ['Admit next waiting guest']),
      createEl('button', 'button outline big', ['Send verification reminder'])
    ])
  );
  mediatorCard.appendChild(
    createEl('ul', 'list-stack muted', [
      createEl('li', 'list-item', [createEl('span', null, ['Video starts off for all parties; remind to enable on entry.']), createEl('span', 'badge muted', ['Video off by default'])]),
      createEl('li', 'list-item', [createEl('span', null, ['If camera cover detected, prompt guests to uncover before admission.']), createEl('span', 'badge warning', ['Camera cover check'])])
    ])
  );

  layout.appendChild(schedulingCard);
  layout.appendChild(verificationCard);
  layout.appendChild(guestCard);
  layout.appendChild(waitingCard);
  layout.appendChild(rosterCard);
  layout.appendChild(renderMeetingAdminCard(editable));
  layout.appendChild(mediatorCard);
  return layout;
}

function renderMeetingAdminCard(editable) {
  const card = createEl('div', 'card');
  card.appendChild(
    createEl('div', 'section-header', [
      createEl('h3', null, ['Meeting admins & co-mediators']),
      createEl('span', 'badge success', ['Host-level permissions'])
    ])
  );

  card.appendChild(
    createEl('p', 'muted', [
      "Mediators or their staff can delegate full host controls to a trusted co-mediator. Added admins inherit the host mediator's permissions for admission, breakouts, recordings, and removals."
    ])
  );

  const list = createEl('div', 'co-admin-list');
  if (!state.videoUi.meetingAdmins.length) {
    list.appendChild(createEl('div', 'notice muted', ['No meeting admins yet. Add a co-mediator to share hosting duties.']));
  }

  state.videoUi.meetingAdmins.forEach((admin) => {
    const badgeRow = createEl('div', 'pill-row');
    badgeRow.appendChild(createEl('span', 'pill', ['Full host controls']));
    badgeRow.appendChild(createEl('span', 'pill', [admin.designation || 'Co-mediator']));
    if (admin.addedBy) {
      badgeRow.appendChild(createEl('span', 'pill soft', [`Added by ${admin.addedBy}`]));
    }

    const detail = createEl('div', 'stack', [
      createEl('strong', null, [admin.name || 'Meeting admin']),
      createEl('span', 'muted', [admin.email || 'Email pending']),
      badgeRow,
      createEl('div', 'muted small', [
        `Permissions: ${(admin.permissions || ['Admission', 'Breakouts', 'Recording', 'Removal']).join(', ')}`
      ])
    ]);

    const avatar = createEl('div', 'avatar host', [admin.name?.[0] || 'A']);
    list.appendChild(createEl('div', 'co-admin-row', [avatar, detail]));
  });

  card.appendChild(list);

  const form = createEl('div', 'co-admin-form stack');
  form.appendChild(createEl('h4', null, ['Add a co-mediator']));
  form.appendChild(
    createEl('p', 'muted', [
      editable
        ? 'Share hosting with a second mediator or staff member. They will receive the same meeting-level permissions.'
        : 'Meeting has started. Adding co-mediators is locked until the next session.'
    ])
  );

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Full name';
  nameInput.value = state.videoUi.coMediatorName;
  nameInput.disabled = !editable;
  nameInput.oninput = (e) => updateCoMediatorField('coMediatorName', e.target.value);

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = 'Work email';
  emailInput.value = state.videoUi.coMediatorEmail;
  emailInput.disabled = !editable;
  emailInput.oninput = (e) => updateCoMediatorField('coMediatorEmail', e.target.value);

  const notesInput = document.createElement('textarea');
  notesInput.placeholder = 'Optional: role, staffing notes, or why they need host rights';
  notesInput.rows = 2;
  notesInput.value = state.videoUi.coMediatorNotes;
  notesInput.disabled = !editable;
  notesInput.oninput = (e) => updateCoMediatorField('coMediatorNotes', e.target.value);

  const addButton = createEl('button', 'button primary', ['Add co-mediator']);
  addButton.disabled = !editable;
  addButton.onclick = () => addCoMediator();

  const actionRow = createEl('div', 'row', [addButton]);
  actionRow.appendChild(
    createEl('span', 'muted small', ['Host rights include admission, breakout control, recordings, and removing participants.'])
  );

  form.appendChild(nameInput);
  form.appendChild(emailInput);
  form.appendChild(notesInput);
  form.appendChild(actionRow);

  if (state.videoUi.coMediatorError) {
    form.appendChild(createEl('div', 'notice warning', [state.videoUi.coMediatorError]));
  }

  card.appendChild(form);
  return card;
}

function addCoMediator() {
  const name = (state.videoUi.coMediatorName || '').trim();
  const email = (state.videoUi.coMediatorEmail || '').trim();

  if (!name || !email) {
    updateVideoSetting('coMediatorError', 'Name and email are required to grant host-level permissions.');
    return;
  }

  const designation = (state.videoUi.coMediatorNotes || '').trim() || 'Co-mediator';
  const permissions = ['Admission', 'Breakouts', 'Recording', 'Removal'];
  const nextMeetingAdmins = [
    ...state.videoUi.meetingAdmins,
    { name, email, designation, permissions, addedBy: 'Mediator or staff' }
  ];

  state.videoUi = {
    ...state.videoUi,
    meetingAdmins: nextMeetingAdmins,
    coMediatorName: '',
    coMediatorEmail: '',
    coMediatorNotes: '',
    coMediatorError: null
  };

  render();
}

function handleGuestJoin(session) {
  const name = (state.videoUi.guestName || '').trim();
  const side = (state.videoUi.guestSide || '').trim();
  const verified = state.videoUi.verifiedGuests.includes(name);
  if (!name || !side) {
    updateVideoSetting('guestError', 'Name and side selection are required.');
    return;
  }

  const attempts = state.videoUi.attemptsByGuest[name] || 0;
  if (attempts >= 3 && !verified) {
    updateVideoSetting('guestError', 'Maximum attempts reached. Please contact the mediator to be admitted.');
    return;
  }

  const nextAttempts = { ...state.videoUi.attemptsByGuest, [name]: attempts + (verified ? 0 : 1) };
  const entries = [...state.videoUi.waitingEntries];

  if (verified) {
    updateVideoSetting('guestError', null);
    updateVideoSetting('attemptsByGuest', nextAttempts);
    updateVideoSetting('remindVideoOn', true);
    return;
  }

  const entry = createWaitingEntry({ name, side });
  entries.push(entry);

  state.videoUi = {
    ...state.videoUi,
    guestError: null,
    attemptsByGuest: nextAttempts,
    waitingEntries: entries,
    remindVideoOn: true
  };
  render();
}

function admitGuest(id) {
  const entries = state.videoUi.waitingEntries.map((entry) =>
    entry.id === id ? { ...entry, status: 'admitted', expiresAt: Date.now() + 60 * 60 * 1000 } : entry
  );
  const admitted = entries.find((entry) => entry.id === id);
  const verifiedGuests = admitted && !state.videoUi.verifiedGuests.includes(admitted.name)
    ? [...state.videoUi.verifiedGuests, admitted.name]
    : state.videoUi.verifiedGuests;

  state.videoUi = { ...state.videoUi, waitingEntries: entries, verifiedGuests };
  render();
}

function pruneWaitingEntries() {
  const now = Date.now();
  const filtered = state.videoUi.waitingEntries.filter((entry) => entry.status === 'admitted' || entry.expiresAt > now);
  if (filtered.length !== state.videoUi.waitingEntries.length) {
    state.videoUi = { ...state.videoUi, waitingEntries: filtered };
  }
}

function groupWaitingBySide(sides = []) {
  const map = new Map();
  sides.forEach((side) => map.set(side.label, { side, entries: [] }));
  state.videoUi.waitingEntries.forEach((entry) => {
    const container = map.get(entry.side) || { side: { label: entry.side }, entries: [] };
    container.entries.push(entry);
    map.set(entry.side, container);
  });
  return Array.from(map.values()).filter((group) => group.entries.length > 0);
}

function normalizeWaitingEntries(sides = []) {
  const now = Date.now();
  return sides.flatMap((side) => {
    const guests = Array.isArray(side.waitingGuests)
      ? side.waitingGuests
      : Array.from({ length: side.waitingGuests || 0 }, (_, i) => ({ name: `Guest ${i + 1}`, side: side.label }));
    return guests.map((guest) => createWaitingEntry({ name: guest.name || 'Guest', side: side.label, expiresAt: now + 5 * 60 * 1000 }));
  });
}

function createWaitingEntry({ name, side, expiresAt }) {
  return {
    id: `wait-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    side,
    expiresAt: expiresAt || Date.now() + 5 * 60 * 1000,
    status: 'waiting'
  };
}

function renderGuestForm(session) {
  const form = createEl('div', 'guest-form');
  const row = createEl('div', 'guest-row');

  const nameInput = createEl('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Your name (required)';
  nameInput.value = state.videoUi.guestName;
  nameInput.oninput = (e) => {
    updateVideoSetting('guestName', e.target.value);
    updateVideoSetting('guestError', null);
  };

  const sideSelect = createEl('select');
  (session.sides || []).forEach((side) => {
    const option = createEl('option');
    option.value = side.label;
    option.textContent = side.label;
    sideSelect.appendChild(option);
  });
  sideSelect.value = state.videoUi.guestSide || '';
  sideSelect.onchange = (e) => {
    updateVideoSetting('guestSide', e.target.value);
    updateVideoSetting('guestError', null);
  };

  const attemptCount = state.videoUi.attemptsByGuest[state.videoUi.guestName || ''] || 0;
  const verifiedAlready = state.videoUi.verifiedGuests.includes(state.videoUi.guestName?.trim());
  const authRequired = (session.accessPolicy || state.videoUi.accessPolicy) !== 'open';
  const helper = createEl('div', 'muted', [
    `${authRequired ? 'Authentication required; unauth guests go to side-specific waiting room.' : 'Open link; side selection still requested for tracking.'} Attempts: ${attemptCount}/3. ${
      verifiedAlready ? 'Verified guest may rejoin directly.' : 'Guests removed if not admitted within 5 minutes.'
    }`
  ]);

  const preview = createEl('div', 'preview');
  const coverRow = createEl('div', 'cover-row');
  const coverCheckbox = createEl('input');
  coverCheckbox.type = 'checkbox';
  coverCheckbox.checked = state.videoUi.cameraCovered;
  coverCheckbox.onchange = (e) => updateVideoSetting('cameraCovered', e.target.checked);
  coverRow.appendChild(coverCheckbox);
  coverRow.appendChild(createEl('span', null, ['Camera cover detected? (check if preview is dark)']));
  preview.appendChild(coverRow);
  if (state.videoUi.cameraCovered) {
    preview.appendChild(createEl('div', 'notice warning', ['Remove the cover or open the lens to continue.']));
  } else {
    preview.appendChild(createEl('div', 'notice success', ['Preview looks good. You will be shown to your selected side for admission.']));
  }

  const remindRow = createEl('div', 'muted', ['Video will start off; please enable when admitted.']);

  const submit = createEl('button', 'button primary', ['Request admission']);
  submit.onclick = () => handleGuestJoin(session);
  submit.disabled = attemptCount >= 3 && !verifiedAlready;

  row.appendChild(nameInput);
  row.appendChild(sideSelect);
  row.appendChild(submit);
  form.appendChild(row);
  form.appendChild(helper);
  form.appendChild(preview);
  form.appendChild(remindRow);

  if (state.videoUi.guestError) {
    form.appendChild(createEl('div', 'notice warning', [state.videoUi.guestError]));
  }

  return form;
}

function renderWaitingRoom(session) {
  const waitingList = createEl('div', 'waiting-room');
  const grouped = groupWaitingBySide(session.sides || []);

  if (!grouped.length) {
    waitingList.appendChild(createEl('div', 'notice muted', ['No guests waiting. New unauthenticated guests will appear here for admission.']));
    return waitingList;
  }

  grouped.forEach(({ side, entries }) => {
    const sideRow = createEl('div', 'waiting-row');
    sideRow.appendChild(
      createEl('div', 'stack', [
        createEl('strong', null, [side.label || 'Party side']),
        createEl('span', 'muted', [`${entries.length} guest(s) waiting`])
      ])
    );

    const guestStack = createEl('div', 'guest-stack');
    entries.forEach((entry) => {
      const timeLeft = Math.max(0, entry.expiresAt - Date.now());
      const minutesLeft = Math.ceil(timeLeft / 60000);
      const badge = createEl('span', `pill ${entry.status === 'admitted' ? 'success' : ''}`.trim(), [
        entry.status === 'admitted' ? 'Admitted' : `Expires in ${minutesLeft} min`
      ]);
      const preview = createEl('div', 'preview-chip', [
        createEl('div', 'avatar', [entry.name?.[0] || '?']),
        createEl('div', 'stack', [
          createEl('strong', null, [entry.name || 'Guest']),
          createEl('span', 'muted', [entry.status === 'admitted' ? 'Verified & can rejoin' : 'Waiting for side approval'])
        ])
      ]);
      const actions = createEl('div', 'row');
      const admit = createEl('button', 'button outline', ['Admit']);
      admit.disabled = entry.status === 'admitted';
      admit.onclick = () => admitGuest(entry.id);
      actions.appendChild(admit);
      guestStack.appendChild(createEl('div', 'waiting-guest', [preview, badge, actions]));
    });

    sideRow.appendChild(guestStack);
    waitingList.appendChild(sideRow);
  });

  return waitingList;
}

function updateVideoSetting(key, value) {
  state.videoUi = { ...state.videoUi, [key]: value };
  render();
}

function updateCoMediatorField(key, value) {
  state.videoUi = { ...state.videoUi, [key]: value, coMediatorError: null };
  render();
}

function createToggleGroup(options, activeValue, onSelect, disabled = false) {
  const group = createEl('div', 'toggle-group');
  options.forEach((option) => {
    const button = createEl('button', `button outline ${activeValue === option.value ? 'primary' : ''}`.trim(), [
      createEl('div', 'stack', [createEl('span', null, [option.label]), createEl('span', 'muted', [option.helper || ''])])
    ]);
    button.disabled = disabled;
    button.onclick = () => onSelect(option.value);
    group.appendChild(button);
  });
  return group;
}

function createStatCard(title, value, helper) {
  const card = createEl('div', 'card');
  card.appendChild(createEl('div', 'section-header', [createEl('h3', null, [title]), createPills([helper])]));
  card.appendChild(createEl('div', 'value', [value]));
  return card;
}

function createPills(items) {
  const row = createEl('div', 'pill-row');
  items.forEach((item) => row.appendChild(createEl('span', 'pill', [item])));
  return row;
}

function createTimeline(timeline = []) {
  const list = createEl('ul', 'list-stack');
  timeline.forEach((entry) => {
    const row = createEl('li', 'list-item', [
      createEl('div', 'flex', [createEl('span', 'badge muted', ['•']), createEl('span', null, [entry.label])]),
      createEl('span', 'muted', [formatDate(entry.timestamp)])
    ]);
    list.appendChild(row);
  });
  return list;
}
