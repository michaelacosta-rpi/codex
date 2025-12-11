export const clientProfile = {
  company: 'Sierra Glass',
  contact: 'Nia Patel',
  email: 'ops@sierra.glass',
  plan: 'Enterprise',
  renewalDate: '2025-04-01T00:00:00Z',
  mfa: true,
  sso: true,
  seatsUsed: 82,
  seatsTotal: 100,
  storageUsedGb: 680,
  storageTotalGb: 1024,
  supportLevel: 'Priority',
  successManager: 'Jordan Lee'
};

export const libraryItems = [
  {
    id: 'lib-2001',
    title: 'March Product Walkthrough',
    visibility: 'Organization',
    status: 'Published',
    views: 1842,
    updatedAt: '2025-02-10T10:00:00Z'
  },
  {
    id: 'lib-1993',
    title: 'Security Training Module',
    visibility: 'Private',
    status: 'Processing',
    views: 287,
    updatedAt: '2025-02-11T06:45:00Z'
  },
  {
    id: 'lib-1982',
    title: 'Welcome to Codex',
    visibility: 'Public link',
    status: 'Published',
    views: 6821,
    updatedAt: '2025-02-02T14:20:00Z'
  }
];

export const invoices = [
  {
    id: 'inv-3101',
    period: 'February 2025',
    total: 182500,
    currency: 'USD',
    status: 'Paid',
    dueAt: '2025-02-05T00:00:00Z'
  },
  {
    id: 'inv-3098',
    period: 'January 2025',
    total: 178200,
    currency: 'USD',
    status: 'Paid',
    dueAt: '2025-01-05T00:00:00Z'
  },
  {
    id: 'inv-3095',
    period: 'December 2024',
    total: 175000,
    currency: 'USD',
    status: 'Open',
    dueAt: '2024-12-05T00:00:00Z'
  }
];

export const supportTickets = [
  {
    id: 'case-8810',
    subject: 'Embed playback buffering',
    priority: 'High',
    state: 'Investigating',
    openedAt: '2025-02-10T15:32:00Z',
    sla: '4h response'
  },
  {
    id: 'case-8766',
    subject: 'Add seat for contractor',
    priority: 'Normal',
    state: 'Resolved',
    openedAt: '2025-02-08T09:10:00Z',
    sla: 'Next business day'
  },
  {
    id: 'case-8702',
    subject: 'SSO metadata refresh',
    priority: 'Normal',
    state: 'Waiting on customer',
    openedAt: '2025-02-05T12:00:00Z',
    sla: 'Next business day'
  }
];

export const timeline = [
  { label: 'Weekly adoption report delivered', timestamp: '2025-02-11T07:00:00Z' },
  { label: 'Seat assignment synced from SCIM', timestamp: '2025-02-10T21:00:00Z' },
  { label: 'Playback spike detected in EU region', timestamp: '2025-02-10T16:00:00Z' },
  { label: 'Renewal call scheduled with Jordan Lee', timestamp: '2025-02-09T10:30:00Z' }
];
