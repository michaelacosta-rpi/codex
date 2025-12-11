import { createEl, formatDate, formatMoney } from './components/utils.js';
import { clientProfile, libraryItems, invoices, supportTickets, timeline } from './data/clientData.js';
import { adminPortalOrigin } from './config.js';

const routes = [
  { path: '', label: 'Overview' },
  { path: 'library', label: 'Library' },
  { path: 'billing', label: 'Billing' },
  { path: 'support', label: 'Support' }
];

function getRoute() {
  return window.location.hash.replace('#/', '') || '';
}

function render() {
  const app = document.getElementById('client-app');
  app.innerHTML = '';
  app.appendChild(renderHero());
  app.appendChild(renderNav());
  app.appendChild(renderContent());
}

function renderHero() {
  const hero = createEl('div', 'client-hero');
  const meta = createEl('div', 'hero-meta', [
    createEl('h1', null, [`${clientProfile.company} Client Portal`]),
    createEl('div', 'muted', [`Primary contact: ${clientProfile.contact} · ${clientProfile.email}`]),
    createEl('div', null, [`Customer success: ${clientProfile.successManager}`])
  ]);

  const actions = createEl('div', 'hero-actions', [
    createEl('button', 'button primary', ['New upload']),
    createEl('button', 'button outline', [`Admin portal (${adminPortalOrigin})`])
  ]);

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
  const section = createEl('div', 'grid');
  section.appendChild(createStatCard('Plan', `${clientProfile.plan} · ${clientProfile.supportLevel} support`, `Renews ${formatDate(clientProfile.renewalDate)}`));
  section.appendChild(
    createStatCard('Seats', `${clientProfile.seatsUsed}/${clientProfile.seatsTotal} used`, `${clientProfile.seatsTotal - clientProfile.seatsUsed} seats available`)
  );
  section.appendChild(
    createStatCard('Storage', `${clientProfile.storageUsedGb} GB`, `of ${clientProfile.storageTotalGb} GB allocated`)
  );

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
      createTimeline()
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
            <td>${item.views.toLocaleString()}</td>
            <td>${formatDate(item.updatedAt)}</td>
          </tr>`
        )
        .join('')}
    </tbody>`;
  section.appendChild(table);
  return section;
}

function renderBilling() {
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
  const section = createEl('div', 'grid');
  const cases = createEl('div', 'card');
  cases.appendChild(createEl('div', 'section-header', [createEl('h3', null, ['Open cases']), createPills([clientProfile.supportLevel, 'SLA tracked'])]));
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

  const cta = createEl('div', 'card');
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

function createTimeline() {
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

window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', render);
