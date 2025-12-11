import { createEl, formatDate, formatMoney } from './components/utils.js';
import { fetchClientPortalData } from './data/clientApi.js';
import { adminPortalOrigin } from './config.js';

const routes = [
  { path: '', label: 'Overview' },
  { path: 'library', label: 'Library' },
  { path: 'billing', label: 'Billing' },
  { path: 'support', label: 'Support' }
];

const state = {
  loading: true,
  error: null,
  data: null
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
