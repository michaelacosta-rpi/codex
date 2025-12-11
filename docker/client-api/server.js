const http = require('node:http');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const basePath = '/api/client';

const json = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const data = {
  profile: {
    company: 'Sierra Glass',
    contact: 'Ava Winters',
    email: 'ava@sierra-glass.example',
    successManager: 'Jordan Singh',
    plan: 'Enterprise',
    supportLevel: 'Premium',
    renewalDate: '2025-05-15T00:00:00Z',
    seatsUsed: 148,
    seatsTotal: 200,
    storageUsedGb: 420,
    storageTotalGb: 1024
  },
  library: [
    {
      id: 'lib-101',
      title: 'Johnson v. Northwind — opening statements',
      visibility: 'Internal',
      status: 'Processing',
      views: 1225,
      updatedAt: '2025-02-10T13:20:00Z'
    },
    {
      id: 'lib-102',
      title: 'Carrier mediation highlights',
      visibility: 'External (Link)',
      status: 'Published',
      views: 4481,
      updatedAt: '2025-02-09T09:00:00Z'
    },
    {
      id: 'lib-103',
      title: 'Policyholder briefing — Q1 update',
      visibility: 'External (Embed)',
      status: 'Published',
      views: 3098,
      updatedAt: '2025-02-05T16:45:00Z'
    }
  ],
  invoices: [
    {
      id: 'INV-2025-021',
      period: 'Jan 2025',
      status: 'Paid',
      dueAt: '2025-02-05T00:00:00Z',
      total: 124500,
      currency: 'USD'
    },
    {
      id: 'INV-2025-022',
      period: 'Feb 2025',
      status: 'Open',
      dueAt: '2025-03-05T00:00:00Z',
      total: 119900,
      currency: 'USD'
    }
  ],
  support: [
    {
      id: 'CASE-991',
      subject: 'Video upload stalled',
      priority: 'High',
      state: 'Investigating',
      openedAt: '2025-02-11T02:30:00Z',
      sla: '2h'
    },
    {
      id: 'CASE-990',
      subject: 'SSO metadata refresh',
      priority: 'Medium',
      state: 'Resolved',
      openedAt: '2025-02-09T18:05:00Z',
      sla: 'Next business day'
    }
  ],
  timeline: [
    { label: 'Video Johnson v. Northwind published', timestamp: '2025-02-10T17:45:00Z' },
    { label: 'New mediator invited: Jordan Ellis', timestamp: '2025-02-10T11:15:00Z' },
    { label: 'Plan upgraded to Enterprise', timestamp: '2025-02-08T09:30:00Z' }
  ],
  videoSessions: [
    {
      id: 'med-5001',
      title: 'Johnson v. Northwind — coverage dispute',
      scheduledFor: '2025-02-18T15:00:00Z',
      durationMinutes: 90,
      status: 'Scheduled',
      joinLink: 'https://video.codex.local/room/med-5001',
      accessPolicy: 'verified',
      verificationMethod: 'magic_link',
      cacheMinutes: 60,
      startedAt: null,
      sides: [
        {
          label: 'Policyholder side',
          waitingGuests: [
            { name: 'Alex (guest)' },
            { name: 'Taylor (guest)' }
          ]
        },
        { label: 'Carrier side', waitingGuests: [] }
      ],
      participants: [
        { name: 'Dana Johnson', designation: 'Client', authenticated: true },
        { name: 'Leah Kim', designation: 'Counsel', authenticated: true },
        { name: 'Jordan Ellis', designation: 'Mediator', authenticated: true },
        { name: 'Chris Patel', designation: 'Carrier representative', authenticated: false }
      ]
    }
  ]
};

const routes = {
  [`${basePath}/profile`]: () => ({ status: 200, body: data.profile }),
  [`${basePath}/library`]: () => ({ status: 200, body: data.library }),
  [`${basePath}/invoices`]: () => ({ status: 200, body: data.invoices }),
  [`${basePath}/support`]: () => ({ status: 200, body: data.support }),
  [`${basePath}/timeline`]: () => ({ status: 200, body: data.timeline }),
  [`${basePath}/video-sessions`]: () => ({ status: 200, body: data.videoSessions }),
  [`${basePath}/health`]: () => ({ status: 200, body: { status: 'ok' } })
};

const server = http.createServer((req, res) => {
  const handler = routes[req.url];
  if (!handler) {
    json(res, 404, { error: 'Not found' });
    return;
  }

  const { status, body } = handler();
  json(res, status, body);
});

server.listen(PORT, HOST, () => {
  console.log(`[client-api] listening on http://${HOST}:${PORT}${basePath}`);
});
