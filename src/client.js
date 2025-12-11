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
    cacheMinutes: 30
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await hydrate();
  render();
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
        cacheMinutes: primarySession.cacheMinutes || 30
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

  const waitingList = createEl('div', 'waiting-room');
  (session.sides || []).forEach((side) => {
    const sideRow = createEl('div', 'waiting-row', [
      createEl('div', 'stack', [createEl('strong', null, [side.label || 'Party side']), createEl('span', 'muted', [`${side.waitingGuests || 0} guest(s) waiting`])]),
      createEl('div', 'row', [
        createEl('span', 'pill', ['Admit unauthenticated guest']),
        createEl('button', 'button primary', ['Admit now'])
      ])
    ]);
    waitingList.appendChild(sideRow);
  });
  waitingCard.appendChild(waitingList);

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

  layout.appendChild(schedulingCard);
  layout.appendChild(verificationCard);
  layout.appendChild(waitingCard);
  layout.appendChild(rosterCard);
  return layout;
}

function updateVideoSetting(key, value) {
  state.videoUi = { ...state.videoUi, [key]: value };
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
