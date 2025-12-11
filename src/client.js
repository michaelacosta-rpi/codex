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

const optionalRoles = ['Carrier', 'Counsel', 'Defendant', 'Plaintiff'];
const partySides = ['Plaintiff', 'Defendant'];
const defaultBreakoutTemplates = [
  { id: 'brk-default-plaintiff', name: 'Plaintiff' },
  { id: 'brk-default-defendant', name: 'Defendant' },
  { id: 'brk-default-mediator', name: 'Mediator' }
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
    coMediatorError: null,
    invitationEmail: '',
    invitationSide: 'Plaintiff',
    invitationRole: '',
    invitationError: null,
    invitationStatus: null,
    pendingInvites: [],
    guestRole: '',
    summons: [],
    messages: [],
    messageDraft: '',
    messageRecipients: ['all'],
    messageError: null,
    breakoutRooms: createDefaultBreakoutRooms(),
    breakoutName: '',
    breakoutSelection: [],
    breakoutError: null
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
        ...state.videoUi,
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
        coMediatorError: null,
        invitationEmail: '',
        invitationSide: 'Plaintiff',
        invitationRole: '',
        invitationError: null,
        invitationStatus: null,
        pendingInvites: [],
        guestRole: '',
        summons: primarySession.summons || createDefaultSummons(primarySession),
        messages: primarySession.messages || createDefaultMessages(primarySession),
        messageDraft: '',
        messageRecipients: ['all'],
        messageError: null,
        breakoutRooms: normalizeBreakoutRooms(primarySession),
        breakoutName: '',
        breakoutSelection: [],
        breakoutError: null
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
    createEl('div', 'eyebrow', ['virtual mediation hosting']),
    createEl('h1', null, [`${profile.company || 'Client'} workspace`]),
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
  schedulingCard.appendChild(renderInvitationComposer());

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
  layout.appendChild(renderBreakoutManager(session));
  layout.appendChild(mediatorCard);
  layout.appendChild(renderMediatorMessaging(session));
  return layout;
}

function renderInvitationComposer() {
  const card = createEl('div', 'invitation-composer');
  card.appendChild(
    createEl('div', 'section-header', [
      createEl('h4', null, ['Invitations & party tags']),
      createEl('span', 'badge success', ['Plaintiff/defendant required'])
    ])
  );

  card.appendChild(
    createEl('p', 'muted', [
      'Enter email addresses to send invitations while scheduling. Tag each recipient as plaintiff or defendant. Roles such as carrier or counsel are optional now and can be refined later when participants join the video portal.'
    ])
  );

  const formRow = createEl('div', 'invitation-row');

  const emailInput = createEl('input');
  emailInput.type = 'email';
  emailInput.placeholder = 'Participant email (required)';
  emailInput.value = state.videoUi.invitationEmail;
  emailInput.oninput = (e) => updateInvitationField('invitationEmail', e.target.value);

  const sideSelect = createEl('select');
  partySides.forEach((side) => {
    const opt = createEl('option');
    opt.value = side;
    opt.textContent = side;
    sideSelect.appendChild(opt);
  });
  sideSelect.value = state.videoUi.invitationSide || partySides[0];
  sideSelect.onchange = (e) => updateInvitationField('invitationSide', e.target.value);

  const roleSelect = createEl('select');
  const placeholder = createEl('option');
  placeholder.value = '';
  placeholder.textContent = 'Role (optional)';
  roleSelect.appendChild(placeholder);
  optionalRoles.forEach((role) => {
    const opt = createEl('option');
    opt.value = role;
    opt.textContent = role;
    roleSelect.appendChild(opt);
  });
  roleSelect.value = state.videoUi.invitationRole;
  roleSelect.onchange = (e) => updateInvitationField('invitationRole', e.target.value);

  const addButton = createEl('button', 'button primary', ['Add invite']);
  addButton.onclick = addInvitation;

  formRow.appendChild(emailInput);
  formRow.appendChild(sideSelect);
  formRow.appendChild(roleSelect);
  formRow.appendChild(addButton);
  card.appendChild(formRow);

  const helper = createEl('div', 'muted small', [
    'Plaintiff/defendant tagging is required for every invitation. Roles help the mediator prepare but stay optional until participants join.'
  ]);
  card.appendChild(helper);

  card.appendChild(renderInvitationList());

  if (state.videoUi.invitationError) {
    card.appendChild(createEl('div', 'notice warning', [state.videoUi.invitationError]));
  }
  if (state.videoUi.invitationStatus) {
    card.appendChild(createEl('div', 'notice success', [state.videoUi.invitationStatus]));
  }

  return card;
}

function renderInvitationList() {
  const container = createEl('div', 'invitation-list');
  if (!state.videoUi.pendingInvites.length) {
    container.appendChild(
      createEl('div', 'notice muted', ['No invitations queued. Add emails to send invites with the required plaintiff/defendant tag.'])
    );
    return container;
  }

  const table = createEl('table', 'table');
  table.innerHTML = `
    <thead><tr><th>Email</th><th>Party</th><th>Role (optional)</th><th></th></tr></thead>
    <tbody>
      ${state.videoUi.pendingInvites
        .map(
          (invite) => `
            <tr>
              <td>${invite.email}</td>
              <td><span class="pill">${invite.side}</span></td>
              <td>${invite.role || 'Not set'}</td>
              <td><button class="button ghost" data-id="${invite.id}">Remove</button></td>
            </tr>`
        )
        .join('')}
    </tbody>
  `;

  container.appendChild(table);

  table.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.onclick = () => removeInvitation(btn.dataset.id);
  });

  const sendRow = createEl('div', 'row');
  const sendButton = createEl('button', 'button outline', [`Send ${state.videoUi.pendingInvites.length} invitation(s)`]);
  sendButton.onclick = sendInvitations;
  sendRow.appendChild(sendButton);
  sendRow.appendChild(createEl('span', 'muted small', ['Emails will include the plaintiff/defendant tag for clarity.']));
  container.appendChild(sendRow);

  return container;
}

function updateInvitationField(key, value) {
  state.videoUi = { ...state.videoUi, [key]: value, invitationError: null, invitationStatus: null };
  render();
}

function addInvitation() {
  const email = (state.videoUi.invitationEmail || '').trim();
  const side = (state.videoUi.invitationSide || '').trim();
  const role = (state.videoUi.invitationRole || '').trim();

  if (!email || !validateEmail(email)) {
    updateInvitationField('invitationError', 'A valid email address is required to send an invitation.');
    return;
  }

  if (!side) {
    updateInvitationField('invitationError', 'Every invitation must be tagged as plaintiff or defendant.');
    return;
  }

  const invite = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email,
    side,
    role
  };

  state.videoUi = {
    ...state.videoUi,
    pendingInvites: [...state.videoUi.pendingInvites, invite],
    invitationEmail: '',
    invitationRole: '',
    invitationStatus: null,
    invitationError: null
  };

  render();
}

function removeInvitation(id) {
  state.videoUi = {
    ...state.videoUi,
    pendingInvites: state.videoUi.pendingInvites.filter((invite) => invite.id !== id),
    invitationStatus: null
  };
  render();
}

function sendInvitations() {
  if (!state.videoUi.pendingInvites.length) {
    updateInvitationField('invitationError', 'Add at least one email to send invitations.');
    return;
  }

  state.videoUi = {
    ...state.videoUi,
    invitationStatus: `Invitations ready to send for ${state.videoUi.pendingInvites.length} recipient(s). Plaintiff/defendant tags will be included.`,
    invitationError: null
  };
  render();
}

function validateEmail(value) {
  return /.+@.+\..+/.test(value);
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

function renderBreakoutManager(session) {
  const card = createEl('div', 'card');
  card.appendChild(
    createEl('div', 'section-header', [createEl('h3', null, ['Breakout rooms']), createEl('span', 'badge success', ['Mediator controlled'])])
  );

  card.appendChild(
    createEl('p', 'muted', [
      'Plaintiff, Defendant, and Mediator breakouts are always available. Create additional caucus rooms on demand or ahead of the session through the client portal.'
    ])
  );

  card.appendChild(renderBreakoutList(session));
  card.appendChild(renderBreakoutForm(session));
  return card;
}

function renderBreakoutList(session) {
  const list = createEl('div', 'stack breakout-list');
  const rooms = state.videoUi.breakoutRooms || [];

  if (!rooms.length) {
    list.appendChild(createEl('div', 'notice muted', ['No breakout rooms yet. Mediator can add as many as needed.']));
    return list;
  }

  rooms.forEach((room) => {
    const header = createEl('div', 'row space-between', [
      createEl('strong', null, [room.name || 'Breakout room']),
      createEl('span', 'muted small', [`Created ${formatDate(room.createdAt)}`])
    ]);

    const participants = room.participants || [];
    const participantRow = createEl('div', 'pill-row');
    if (!participants.length) {
      participantRow.appendChild(createEl('span', 'pill soft', ['No one assigned yet']));
    } else {
      participants.forEach((participant) => {
        const pill = createEl('span', 'pill soft', [formatParticipantLabel(participant, session)]);
        const removeBtn = createEl('button', 'button ghost small', ['Remove']);
        removeBtn.onclick = () => removeParticipantFromBreakout(room.id, participant);
        const pillRow = createEl('div', 'pill-action');
        pillRow.appendChild(pill);
        pillRow.appendChild(removeBtn);
        participantRow.appendChild(pillRow);
      });
    }

    const available = availableParticipantsForRoom(session, room);
    const addSelect = createEl('select');
    const placeholder = createEl('option');
    placeholder.value = '';
    placeholder.textContent = available.length ? 'Add participant' : 'All participants assigned';
    addSelect.appendChild(placeholder);
    available.forEach((participant) => {
      const option = createEl('option');
      option.value = participant.id;
      option.textContent = participant.label;
      addSelect.appendChild(option);
    });

    const addButton = createEl('button', 'button outline', ['Add to room']);
    addButton.disabled = !available.length;
    addButton.onclick = () => addParticipantToBreakout(room.id, addSelect.value);

    const controls = createEl('div', 'row');
    controls.appendChild(addSelect);
    controls.appendChild(addButton);

    const roomCard = createEl('div', 'breakout-room', [header, participantRow, controls]);
    list.appendChild(roomCard);
  });

  return list;
}

function renderBreakoutForm(session) {
  const form = createEl('div', 'stack');
  form.appendChild(createEl('h4', null, ['Create a new breakout']));
  form.appendChild(createEl('div', 'muted', ['Select a name and pick which parties to move into the new room. Mediator stays out unless added.']));

  const nameInput = createEl('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Breakout room name';
  nameInput.value = state.videoUi.breakoutName;
  nameInput.oninput = (e) => updateBreakoutField('breakoutName', e.target.value);

  const participantGrid = createEl('div', 'recipient-grid');
  const participants = getParticipantOptions(session);
  if (!participants.length) {
    participantGrid.appendChild(createEl('div', 'notice muted', ['No participants available to move yet.']));
  } else {
    participants.forEach((participant) => {
      const checkbox = createEl('input');
      checkbox.type = 'checkbox';
      checkbox.value = participant.id;
      checkbox.checked = state.videoUi.breakoutSelection.includes(participant.id);
      checkbox.onchange = (e) => toggleBreakoutSelection(participant.id, e.target.checked);
      const label = createEl('label', 'pill-checkbox', [checkbox, createEl('span', null, [participant.label])]);
      participantGrid.appendChild(label);
    });
  }

  const createButton = createEl('button', 'button primary', ['Create breakout room']);
  createButton.onclick = () => addBreakoutRoom(session);

  form.appendChild(nameInput);
  form.appendChild(participantGrid);
  form.appendChild(createEl('div', 'row space-between', [createEl('span', 'muted small', ['Mediator can add more rooms anytime.']), createButton]));

  if (state.videoUi.breakoutError) {
    form.appendChild(createEl('div', 'notice warning', [state.videoUi.breakoutError]));
  }

  return form;
}

function renderMediatorMessaging(session) {
  const card = createEl('div', 'card messaging-card');
  card.appendChild(
    createEl('div', 'section-header', [
      createEl('h3', null, ['Mediator-only messaging']),
      createEl('span', 'badge success', ['Live session'])
    ])
  );

  card.appendChild(
    createEl('p', 'muted', [
      'Parties can summon the mediator for help, but only the mediator can initiate messages across sides. Summons stay separate so mediator dispatch does not slow down requests for help.'
    ])
  );

  card.appendChild(renderSummonPanel(session));
  card.appendChild(renderMessageConsole(session));
  return card;
}

function renderSummonPanel(session) {
  const panel = createEl('div', 'summon-panel');
  panel.appendChild(
    createEl('div', 'summon-header', [
      createEl('strong', null, ['Party summons']),
      createEl('span', 'pill soft', ['Side-specific requests'])
    ])
  );

  const summons = state.videoUi.summons || [];
  if (!summons.length) {
    panel.appendChild(
      createEl('div', 'notice muted', ['No summons yet. Parties can still ring the mediator even while messages are being sent.'])
    );
  }

  summons.forEach((summon) => {
    const badge = createEl('span', `badge ${summon.status === 'resolved' ? 'success' : summon.status === 'acknowledged' ? 'warning' : 'info'}`.trim(), [
      summon.status === 'resolved' ? 'Resolved' : summon.status === 'acknowledged' ? 'Acknowledged' : 'Open']
    );

    const detail = createEl('div', 'stack', [
      createEl('div', 'row space-between', [
        createEl('strong', null, [summon.side || 'Party']),
        badge
      ]),
      createEl('span', 'muted', [`Requested by ${summon.requestedBy || 'Party representative'}`]),
      createEl('span', 'muted small', [summon.note || 'Requested mediator presence']),
      createEl('span', 'muted small', [formatDate(summon.timestamp)])
    ]);

    const actions = createEl('div', 'row');
    const acknowledge = createEl('button', 'button ghost', ['Acknowledge']);
    acknowledge.disabled = summon.status !== 'open';
    acknowledge.onclick = () => updateSummonStatus(summon.id, 'acknowledged');

    const resolve = createEl('button', 'button outline', ['Mark resolved']);
    resolve.disabled = summon.status === 'resolved';
    resolve.onclick = () => updateSummonStatus(summon.id, 'resolved');

    actions.appendChild(acknowledge);
    actions.appendChild(resolve);

    panel.appendChild(createEl('div', 'summon-row', [createEl('div', 'avatar summon', [summon.side?.[0] || 'S']), detail, actions]));
  });

  const simulationRow = createEl('div', 'summon-simulation row');
  simulationRow.appendChild(createEl('span', 'muted small', ['Simulate a party summon:']));
  (session.sides || []).forEach((side) => {
    const button = createEl('button', 'button ghost', [side.label || 'Party side']);
    button.onclick = () => simulateSummon(side.label);
    simulationRow.appendChild(button);
  });
  if (simulationRow.children.length > 1) {
    panel.appendChild(simulationRow);
  }

  return panel;
}

function renderMessageConsole(session) {
  const console = createEl('div', 'messaging-console');
  console.appendChild(createEl('div', 'section-header', [createEl('h4', null, ['Send a mediator announcement']), createEl('span', 'pill', ['Mediator initiated'])]));

  const recipients = buildRecipientOptions(session);
  const recipientRow = createEl('div', 'recipient-grid');
  recipients.forEach((recipient) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = recipient.id;
    checkbox.checked = state.videoUi.messageRecipients.includes(recipient.id);
    checkbox.onchange = (e) => toggleRecipient(recipient.id, e.target.checked);
    const label = createEl('label', 'pill-checkbox', [checkbox, createEl('span', null, [recipient.label])]);
    recipientRow.appendChild(label);
  });
  console.appendChild(recipientRow);

  console.appendChild(
    createEl('div', 'notice muted', [
      'Only the mediator can start messages. Parties cannot initiate cross-side chats; they respond to mediator announcements or use the summon button above.'
    ])
  );

  const input = document.createElement('textarea');
  input.placeholder = 'Share guidance, schedule updates, or next steps. Multi-select recipients to keep sides separated.';
  input.rows = 3;
  input.value = state.videoUi.messageDraft;
  input.oninput = (e) => updateVideoSetting('messageDraft', e.target.value);

  const sendButton = createEl('button', 'button primary', ['Send message']);
  sendButton.onclick = () => sendMediatorMessage();

  const composeRow = createEl('div', 'stack messaging-compose', [input, createEl('div', 'row space-between', [createEl('span', 'muted small', ['Mediator can notify one or both sides at once; recipients are listed in the log.']), sendButton])]);
  console.appendChild(composeRow);

  if (state.videoUi.messageError) {
    console.appendChild(createEl('div', 'notice warning', [state.videoUi.messageError]));
  }

  console.appendChild(renderMessageLog());
  return console;
}

function renderMessageLog() {
  const log = createEl('div', 'message-log');
  if (!state.videoUi.messages.length) {
    log.appendChild(createEl('div', 'notice muted', ['No mediator messages sent yet. Your dispatch history will appear here.']));
    return log;
  }

  state.videoUi.messages.forEach((message) => {
    const recipients = createEl('div', 'pill-row', formatRecipients(message.recipients).map((label) => createEl('span', 'pill soft', [label])));
    const meta = createEl('div', 'row space-between', [createEl('span', 'muted small', ['Mediator']), createEl('span', 'muted small', [formatDate(message.timestamp)])]);
    const body = createEl('div', 'message-body', [message.body]);
    log.appendChild(createEl('div', 'message-item', [meta, recipients, body]));
  });
  return log;
}

function buildRecipientOptions(session) {
  const options = [{ id: 'all', label: 'All participants (both sides)' }];
  (session.sides || []).forEach((side) => {
    options.push({ id: `side-${side.label}`, label: `${side.label} only` });
  });
  (session.participants || []).forEach((participant) => {
    options.push({ id: `person-${participant.name}`, label: `${participant.name} — ${participant.designation || 'Participant'}` });
  });
  return options;
}

function toggleRecipient(id, enabled) {
  const recipients = new Set(state.videoUi.messageRecipients);
  if (enabled) {
    recipients.add(id);
  } else {
    recipients.delete(id);
  }
  const nextRecipients = recipients.size ? Array.from(recipients) : ['all'];
  state.videoUi = { ...state.videoUi, messageRecipients: nextRecipients, messageError: null };
  render();
}

function toggleBreakoutSelection(id, enabled) {
  const selection = new Set(state.videoUi.breakoutSelection);
  if (enabled) {
    selection.add(id);
  } else {
    selection.delete(id);
  }
  state.videoUi = { ...state.videoUi, breakoutSelection: Array.from(selection), breakoutError: null };
  render();
}

function addBreakoutRoom(session) {
  const name = (state.videoUi.breakoutName || '').trim();
  const participants = state.videoUi.breakoutSelection || [];

  if (!name) {
    updateVideoSetting('breakoutError', 'Name the breakout room before creating it.');
    return;
  }

  if (!participants.length) {
    updateVideoSetting('breakoutError', 'Select at least one participant to move into the breakout room.');
    return;
  }

  const duplicate = (state.videoUi.breakoutRooms || []).some((room) => room.name?.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    updateVideoSetting('breakoutError', 'Use a unique name so participants can tell rooms apart.');
    return;
  }

  const newRoom = {
    id: `brk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    participants,
    createdAt: Date.now()
  };

  state.videoUi = {
    ...state.videoUi,
    breakoutRooms: [newRoom, ...state.videoUi.breakoutRooms],
    breakoutName: '',
    breakoutSelection: [],
    breakoutError: null
  };
  render();
}

function addParticipantToBreakout(roomId, participantId) {
  if (!participantId) return;
  state.videoUi = {
    ...state.videoUi,
    breakoutRooms: state.videoUi.breakoutRooms.map((room) => {
      if (room.id !== roomId) return room;
      const currentParticipants = Array.isArray(room.participants) ? room.participants : [];
      if (currentParticipants.includes(participantId)) return room;
      return { ...room, participants: [...currentParticipants, participantId] };
    })
  };
  render();
}

function removeParticipantFromBreakout(roomId, participantId) {
  state.videoUi = {
    ...state.videoUi,
    breakoutRooms: state.videoUi.breakoutRooms.map((room) => {
      if (room.id !== roomId) return room;
      const currentParticipants = Array.isArray(room.participants) ? room.participants : [];
      return { ...room, participants: currentParticipants.filter((p) => p !== participantId) };
    })
  };
  render();
}

function availableParticipantsForRoom(session, room) {
  const options = getParticipantOptions(session);
  const current = new Set(room.participants || []);
  return options.filter((option) => !current.has(option.id));
}

function getParticipantOptions(session) {
  return (session.participants || []).map((participant) => ({
    id: participant.name,
    label: formatParticipantLabel(participant.name, session)
  }));
}

function formatParticipantLabel(participantId, session) {
  const participant = (session.participants || []).find((p) => p.name === participantId);
  if (!participant) return participantId;
  return `${participant.name} — ${participant.designation || 'Participant'}`;
}

function sendMediatorMessage() {
  const draft = (state.videoUi.messageDraft || '').trim();
  if (!draft) {
    updateVideoSetting('messageError', 'Enter a message before sending.');
    return;
  }

  const newMessage = {
    id: `msg-${Date.now()}`,
    body: draft,
    recipients: state.videoUi.messageRecipients.length ? state.videoUi.messageRecipients : ['all'],
    timestamp: Date.now()
  };

  state.videoUi = {
    ...state.videoUi,
    messages: [newMessage, ...state.videoUi.messages],
    messageDraft: '',
    messageError: null
  };
  render();
}

function updateSummonStatus(id, status) {
  const summons = state.videoUi.summons.map((summon) => (summon.id === id ? { ...summon, status } : summon));
  state.videoUi = { ...state.videoUi, summons };
  render();
}

function simulateSummon(side) {
  const summon = {
    id: `sum-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    side: side || 'Party side',
    requestedBy: `${side || 'Party'} team`,
    note: 'Requests mediator to join their caucus.',
    status: 'open',
    timestamp: Date.now()
  };
  state.videoUi = { ...state.videoUi, summons: [summon, ...state.videoUi.summons] };
  render();
}

function formatRecipients(recipients = []) {
  if (!recipients.length) return ['All participants'];
  return recipients.map((recipient) => {
    if (recipient === 'all') return 'All participants';
    if (recipient.startsWith('side-')) return `${recipient.replace('side-', '')} only`;
    if (recipient.startsWith('person-')) return recipient.replace('person-', '');
    return recipient;
  });
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
  const role = (state.videoUi.guestRole || '').trim();
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

  const entry = createWaitingEntry({ name, side, role });
  entries.push(entry);

  state.videoUi = {
    ...state.videoUi,
    guestError: null,
    attemptsByGuest: nextAttempts,
    waitingEntries: entries,
    remindVideoOn: true,
    guestRole: ''
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

function updateWaitingEntryRole(id, role) {
  const entries = state.videoUi.waitingEntries.map((entry) => (entry.id === id ? { ...entry, role } : entry));
  state.videoUi = { ...state.videoUi, waitingEntries: entries };
  render();
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
    return guests.map((guest) =>
      createWaitingEntry({ name: guest.name || 'Guest', side: side.label, role: guest.role, expiresAt: now + 5 * 60 * 1000 })
    );
  });
}

function createWaitingEntry({ name, side, expiresAt, role }) {
  return {
    id: `wait-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    side,
    role: role || '',
    expiresAt: expiresAt || Date.now() + 5 * 60 * 1000,
    status: 'waiting'
  };
}

function createDefaultBreakoutRooms(baseTime = Date.now()) {
  return defaultBreakoutTemplates.map((room, index) => ({
    id: room.id,
    name: room.name,
    participants: [],
    createdAt: baseTime - (index + 1) * 15 * 60 * 1000
  }));
}

function normalizeBreakoutRooms(session = {}) {
  const now = Date.now();
  const providedRooms = session.breakoutRooms || [];
  const normalizedProvided = providedRooms.map((room, index) => ({
    id: room.id || `brk-seed-${index}`,
    name: room.name || `Breakout ${index + 1}`,
    participants: (room.participants || []).filter(Boolean),
    createdAt: room.createdAt || now - (index + 1) * 15 * 60 * 1000
  }));

  const reservedNames = new Set(defaultBreakoutTemplates.map((room) => room.name.toLowerCase()));
  const defaultRooms = createDefaultBreakoutRooms(now).map((baseRoom) => {
    const match = normalizedProvided.find((room) => room.name.toLowerCase() === baseRoom.name.toLowerCase());
    if (!match) return baseRoom;
    return {
      ...match,
      id: match.id || baseRoom.id,
      name: baseRoom.name,
      createdAt: match.createdAt || baseRoom.createdAt
    };
  });

  const additionalRooms = normalizedProvided.filter((room) => !reservedNames.has(room.name.toLowerCase()));
  return [...defaultRooms, ...additionalRooms];
}

function createDefaultSummons(session = {}) {
  const sides = session.sides || [];
  if (!sides.length) return [];
  return sides.slice(0, 2).map((side, index) => ({
    id: `sum-seed-${index}`,
    side: side.label || 'Party side',
    requestedBy: index === 0 ? 'Plaintiff counsel' : 'Carrier adjuster',
    note: index === 0 ? 'Ready for mediator to join private caucus.' : 'Has offer update, requesting mediator.',
    status: index === 0 ? 'acknowledged' : 'open',
    timestamp: Date.now() - (index + 1) * 20 * 60 * 1000
  }));
}

function createDefaultMessages(session = {}) {
  const sides = session.sides || [];
  const firstSide = sides[0]?.label;
  const secondSide = sides[1]?.label;
  return [
    {
      id: 'msg-seed-1',
      body: 'Mediator will rotate between caucuses every 15 minutes. Respond here if you need to pause.',
      recipients: ['all'],
      timestamp: Date.now() - 45 * 60 * 1000
    },
    {
      id: 'msg-seed-2',
      body: `${firstSide || 'Side A'}: preparing to move to joint session in 5 minutes. ${secondSide || 'Side B'} will be notified separately.`,
      recipients: firstSide ? [`side-${firstSide}`] : ['all'],
      timestamp: Date.now() - 25 * 60 * 1000
    }
  ];
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

  const roleSelect = createEl('select');
  const rolePlaceholder = createEl('option');
  rolePlaceholder.value = '';
  rolePlaceholder.textContent = 'Role (optional)';
  roleSelect.appendChild(rolePlaceholder);
  optionalRoles.forEach((role) => {
    const option = createEl('option');
    option.value = role;
    option.textContent = role;
    roleSelect.appendChild(option);
  });
  roleSelect.value = state.videoUi.guestRole || '';
  roleSelect.onchange = (e) => updateVideoSetting('guestRole', e.target.value);

  const attemptCount = state.videoUi.attemptsByGuest[state.videoUi.guestName || ''] || 0;
  const verifiedAlready = state.videoUi.verifiedGuests.includes(state.videoUi.guestName?.trim());
  const authRequired = (session.accessPolicy || state.videoUi.accessPolicy) !== 'open';
  const helper = createEl('div', 'muted', [
    `${authRequired ? 'Authentication required; unauth guests go to side-specific waiting room.' : 'Open link; side selection still requested for tracking.'} Attempts: ${attemptCount}/3. ${
      verifiedAlready ? 'Verified guest may rejoin directly.' : 'Guests removed if not admitted within 5 minutes.'
    } Optional role can be set now or assigned by the mediator after admission.`
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
  row.appendChild(roleSelect);
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
          createEl('span', 'muted', [entry.status === 'admitted' ? 'Verified & can rejoin' : 'Waiting for side approval']),
          createEl('div', 'pill-row', [
            createEl('span', 'pill soft', [entry.side || 'Side not set']),
            createEl('span', 'pill', [entry.role || 'Role optional'])
          ])
        ])
      ]);
      const actions = createEl('div', 'row');
      const roleSelect = createEl('select');
      const roleOption = createEl('option');
      roleOption.value = '';
      roleOption.textContent = 'Set role (optional)';
      roleSelect.appendChild(roleOption);
      optionalRoles.forEach((role) => {
        const option = createEl('option');
        option.value = role;
        option.textContent = role;
        roleSelect.appendChild(option);
      });
      roleSelect.value = entry.role || '';
      roleSelect.onchange = (e) => updateWaitingEntryRole(entry.id, e.target.value);

      const admit = createEl('button', 'button outline', ['Admit']);
      admit.disabled = entry.status === 'admitted';
      admit.onclick = () => admitGuest(entry.id);
      actions.appendChild(roleSelect);
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

function updateBreakoutField(key, value) {
  state.videoUi = { ...state.videoUi, [key]: value, breakoutError: null };
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
