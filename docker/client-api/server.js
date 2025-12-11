const http = require('node:http');
const { URL } = require('node:url');
const { Pool } = require('pg');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const basePath = '/api/client';

const json = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const normalizeEmail = (email) => email?.trim().toLowerCase();

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DATABASE_USER || 'codex'}:${process.env.DATABASE_PASSWORD || 'codex'}@${
    process.env.DATABASE_HOST || 'database'
  }:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'codex'}`;

const videoServiceUrl = process.env.VIDEO_SERVICE_URL || 'http://video-hosting-service';

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30_000
});

const ensureSchemaAndSeed = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      portals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM portal_users;');
  if (rows[0].count > 0) return;

  await pool.query(
    `INSERT INTO portal_users (email, full_name, portals)
     VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)
     ON CONFLICT (email) DO NOTHING;`,
    [
      'ava@codex.io',
      'Ava Winters',
      ['admin', 'client'],
      'sam.sales@codex.io',
      'Sam Carter',
      ['admin'],
      'client@sierra-glass.example',
      'Sierra Glass Client',
      ['client']
    ]
  );
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
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
  GET: {
    [`${basePath}/profile`]: () => ({ status: 200, body: data.profile }),
    [`${basePath}/library`]: () => ({ status: 200, body: data.library }),
    [`${basePath}/invoices`]: () => ({ status: 200, body: data.invoices }),
    [`${basePath}/support`]: () => ({ status: 200, body: data.support }),
    [`${basePath}/timeline`]: () => ({ status: 200, body: data.timeline }),
    [`${basePath}/video-sessions`]: () => ({ status: 200, body: data.videoSessions })
  }
};

const findUserByEmail = async (email) => {
  if (!email) return null;
  const { rows } = await pool.query(
    'SELECT email, full_name AS name, portals FROM portal_users WHERE email = $1 LIMIT 1;',
    [normalizeEmail(email)]
  );
  return rows[0] || null;
};

const fetchWithTimeout = async (url, { timeoutMs = 3000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
};

const createOrUpdateUser = async ({ email, name, portals }) => {
  if (!email || !name) {
    throw new Error('Both email and name are required');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPortals = Array.isArray(portals) && portals.length ? portals : ['client'];

  const { rows } = await pool.query(
    `INSERT INTO portal_users (email, full_name, portals)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, portals = EXCLUDED.portals
     RETURNING email, full_name AS name, portals;`,
    [normalizedEmail, name, normalizedPortals]
  );

  return rows[0];
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method.toUpperCase();

  if (method === 'POST' && pathname === `${basePath}/users`) {
    try {
      const body = await readJsonBody(req);
      const user = await createOrUpdateUser(body);
      json(res, 201, { user });
    } catch (error) {
      console.error('[client-api] failed to save user', error.message);
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (method === 'POST' && pathname === `${basePath}/login`) {
    try {
      const body = await readJsonBody(req);
      const user = await findUserByEmail(body.email);
      if (!user) {
        json(res, 404, { error: 'User not found' });
        return;
      }

      if (!user.portals.includes('client')) {
        json(res, 403, { error: 'User does not have client portal access' });
        return;
      }

      json(res, 200, { message: 'Login permitted', user });
    } catch (error) {
      console.error('[client-api] login error', error.message);
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (method === 'GET' && pathname === `${basePath}/health`) {
    try {
      await pool.query('SELECT 1;');
      json(res, 200, { status: 'ok', database: 'connected' });
    } catch (error) {
      console.error('[client-api] health check failed', error.message);
      json(res, 503, { status: 'degraded', error: 'database unreachable' });
    }
    return;
  }

  if (method === 'GET' && pathname === `${basePath}/system-check`) {
    const response = {
      database: { status: 'unknown' },
      videoService: { status: 'unknown', url: videoServiceUrl }
    };

    try {
      await pool.query('SELECT 1;');
      response.database = { status: 'ok', message: 'connected' };
    } catch (error) {
      console.error('[client-api] system-check database failure', error.message);
      response.database = { status: 'degraded', error: 'database unreachable' };
    }

    const videoProbe = await fetchWithTimeout(videoServiceUrl);
    if (videoProbe.ok) {
      response.videoService = { status: 'ok', message: 'reachable', url: videoServiceUrl };
    } else {
      response.videoService = {
        status: 'unreachable',
        url: videoServiceUrl,
        error: videoProbe.error || `status ${videoProbe.status}`
      };
    }

    const degraded = response.database.status !== 'ok' || response.videoService.status !== 'ok';
    json(res, degraded ? 503 : 200, response);
    return;
  }

  const handler = routes[method]?.[pathname];
  if (!handler) {
    json(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const { status, body } = await handler();
    json(res, status, body);
  } catch (error) {
    console.error('[client-api] unexpected error', error.message);
    json(res, 500, { error: 'Internal server error' });
  }
});

ensureSchemaAndSeed()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`[client-api] listening on http://${HOST}:${PORT}${basePath}`);
    });
  })
  .catch((error) => {
    console.error('[client-api] failed to initialize database', error.message);
    process.exit(1);
  });
