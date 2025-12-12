const http = require('node:http');
const { randomUUID } = require('node:crypto');
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

const videoServiceUrl = process.env.VIDEO_SERVICE_URL || 'http://video-hosting-service:8080';

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

    CREATE TABLE IF NOT EXISTS portal_profile (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      contact TEXT NOT NULL,
      email TEXT NOT NULL,
      success_manager TEXT NOT NULL,
      plan TEXT NOT NULL,
      support_level TEXT NOT NULL,
      renewal_date TIMESTAMPTZ NOT NULL,
      seats_used INTEGER NOT NULL,
      seats_total INTEGER NOT NULL,
      storage_used_gb INTEGER NOT NULL,
      storage_total_gb INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      visibility TEXT NOT NULL,
      status TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      status TEXT NOT NULL,
      due_at TIMESTAMPTZ NOT NULL,
      total INTEGER NOT NULL,
      currency TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_cases (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      priority TEXT NOT NULL,
      state TEXT NOT NULL,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sla TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows: userRows } = await pool.query('SELECT COUNT(*)::int AS count FROM portal_users;');
  if (userRows[0].count === 0) {
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
  }

  const { rows: profileRows } = await pool.query('SELECT COUNT(*)::int AS count FROM portal_profile;');
  if (profileRows[0].count === 0) {
    const profile = seedData.profile;
    await pool.query(
      `INSERT INTO portal_profile (
        company,
        contact,
        email,
        success_manager,
        plan,
        support_level,
        renewal_date,
        seats_used,
        seats_total,
        storage_used_gb,
        storage_total_gb
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);`,
      [
        profile.company,
        profile.contact,
        profile.email,
        profile.successManager,
        profile.plan,
        profile.supportLevel,
        profile.renewalDate,
        profile.seatsUsed,
        profile.seatsTotal,
        profile.storageUsedGb,
        profile.storageTotalGb
      ]
    );
  }

  const { rows: libraryRows } = await pool.query('SELECT COUNT(*)::int AS count FROM library_items;');
  if (libraryRows[0].count === 0) {
    const values = seedData.library.flatMap((item) => [item.id, item.title, item.visibility, item.status, item.views, item.updatedAt]);
    const placeholders = seedData.library
      .map((_, idx) => `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`)
      .join(',');
    await pool.query(
      `INSERT INTO library_items (id, title, visibility, status, views, updated_at) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING;`,
      values
    );
  }

  const { rows: invoiceRows } = await pool.query('SELECT COUNT(*)::int AS count FROM invoices;');
  if (invoiceRows[0].count === 0) {
    const values = seedData.invoices.flatMap((invoice) => [invoice.id, invoice.period, invoice.status, invoice.dueAt, invoice.total, invoice.currency]);
    const placeholders = seedData.invoices
      .map((_, idx) => `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`)
      .join(',');
    await pool.query(`INSERT INTO invoices (id, period, status, due_at, total, currency) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING;`, values);
  }

  const { rows: supportRows } = await pool.query('SELECT COUNT(*)::int AS count FROM support_cases;');
  if (supportRows[0].count === 0) {
    const values = seedData.support.flatMap((item) => [item.id, item.subject, item.priority, item.state, item.openedAt, item.sla]);
    const placeholders = seedData.support
      .map((_, idx) => `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`)
      .join(',');
    await pool.query(
      `INSERT INTO support_cases (id, subject, priority, state, opened_at, sla) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING;`,
      values
    );
  }

  const { rows: timelineRows } = await pool.query('SELECT COUNT(*)::int AS count FROM timeline_events;');
  if (timelineRows[0].count === 0) {
    const values = seedData.timeline.flatMap((item) => [item.label, item.timestamp]);
    const placeholders = seedData.timeline
      .map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
      .join(',');
    await pool.query(`INSERT INTO timeline_events (label, happened_at) VALUES ${placeholders};`, values);
  }
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

const getProfile = async () => {
  const { rows } = await pool.query(
    `SELECT
      company,
      contact,
      email,
      success_manager AS "successManager",
      plan,
      support_level AS "supportLevel",
      renewal_date AS "renewalDate",
      seats_used AS "seatsUsed",
      seats_total AS "seatsTotal",
      storage_used_gb AS "storageUsedGb",
      storage_total_gb AS "storageTotalGb"
    FROM portal_profile
    LIMIT 1;`
  );

  if (!rows[0]) {
    throw new Error('Portal profile not configured');
  }

  return rows[0];
};

const getLibraryItems = async () => {
  const { rows } = await pool.query(
    `SELECT id, title, visibility, status, views, updated_at AS "updatedAt"
     FROM library_items
     ORDER BY updated_at DESC;`
  );
  return rows;
};

const createLibraryItem = async ({ title, visibility, status, views = 0, updatedAt }) => {
  if (!title || !visibility || !status) {
    throw new Error('title, visibility, and status are required');
  }

  const id = `lib-${randomUUID()}`;
  const updated = updatedAt || new Date().toISOString();

  const { rows } = await pool.query(
    `INSERT INTO library_items (id, title, visibility, status, views, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, visibility, status, views, updated_at AS "updatedAt";`,
    [id, title, visibility, status, views, updated]
  );

  return rows[0];
};

const getInvoices = async () => {
  const { rows } = await pool.query(
    `SELECT id, period, status, due_at AS "dueAt", total, currency
     FROM invoices
     ORDER BY due_at DESC;`
  );
  return rows;
};

const getSupportCases = async () => {
  const { rows } = await pool.query(
    `SELECT id, subject, priority, state, opened_at AS "openedAt", sla
     FROM support_cases
     ORDER BY opened_at DESC;`
  );
  return rows;
};

const createSupportCase = async ({ subject, priority = 'Medium', state = 'New', sla = 'Next business day', openedAt }) => {
  if (!subject) {
    throw new Error('subject is required');
  }

  const id = `CASE-${Date.now()}`;
  const opened = openedAt || new Date().toISOString();

  const { rows } = await pool.query(
    `INSERT INTO support_cases (id, subject, priority, state, opened_at, sla)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, subject, priority, state, opened_at AS "openedAt", sla;`,
    [id, subject, priority, state, opened, sla]
  );

  return rows[0];
};

const getTimelineEvents = async () => {
  const { rows } = await pool.query(
    `SELECT label, happened_at AS "timestamp"
     FROM timeline_events
     ORDER BY happened_at DESC;`
  );
  return rows;
};

const addTimelineEvent = async ({ label, timestamp }) => {
  if (!label) {
    throw new Error('label is required');
  }

  const happenedAt = timestamp || new Date().toISOString();

  const { rows } = await pool.query(
    `INSERT INTO timeline_events (label, happened_at)
     VALUES ($1, $2)
     RETURNING label, happened_at AS "timestamp";`,
    [label, happenedAt]
  );

  return rows[0];
};

const seedData = {
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
      meetingAdmins: [
        {
          name: 'Jordan Ellis',
          email: 'jordan.ellis@northwindmediators.com',
          designation: 'Mediator host',
          permissions: ['Admit/remove', 'Breakout control', 'Recording', 'Reset join tokens'],
          addedBy: 'Case intake automation'
        }
      ],
      breakoutRooms: [
        { id: 'brk-100', name: 'Plaintiff caucus', participants: ['Dana Johnson', 'Leah Kim'], createdAt: Date.now() - 20 * 60 * 1000 },
        { id: 'brk-101', name: 'Carrier caucus', participants: ['Chris Patel'], createdAt: Date.now() - 10 * 60 * 1000 }
      ],
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

const fetchVideoSessions = async () => {
  const response = await fetch(`${videoServiceUrl}/sessions`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Video service returned status ${response.status}`);
  }

  const payload = await response.json();
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : payload;
  if (!Array.isArray(sessions)) {
    throw new Error('Video service response malformed');
  }

  return sessions.map((session) => ({
    ...session,
    joinLink: session.joinLink || `${videoServiceUrl}/room/${session.id}`
  }));
};

const routes = {
  GET: {
    [`${basePath}/profile`]: async () => ({ status: 200, body: await getProfile() }),
    [`${basePath}/library`]: async () => ({ status: 200, body: await getLibraryItems() }),
    [`${basePath}/invoices`]: async () => ({ status: 200, body: await getInvoices() }),
    [`${basePath}/support`]: async () => ({ status: 200, body: await getSupportCases() }),
    [`${basePath}/timeline`]: async () => ({ status: 200, body: await getTimelineEvents() }),
    [`${basePath}/video-sessions`]: async () => {
      try {
        const sessions = await fetchVideoSessions();
        return { status: 200, body: sessions };
      } catch (error) {
        console.warn('[client-api] falling back to local video sessions', error.message);
        return { status: 200, body: seedData.videoSessions };
      }
    }
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

const fetchWithTimeout = async (url, { timeoutMs = 3000, method = 'HEAD' } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { method, signal: controller.signal });
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

  if (method === 'POST' && pathname === `${basePath}/library`) {
    try {
      const body = await readJsonBody(req);
      const item = await createLibraryItem(body);
      json(res, 201, { item });
    } catch (error) {
      console.error('[client-api] failed to create library item', error.message);
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (method === 'POST' && pathname === `${basePath}/support`) {
    try {
      const body = await readJsonBody(req);
      const ticket = await createSupportCase(body);
      json(res, 201, { ticket });
    } catch (error) {
      console.error('[client-api] failed to create support case', error.message);
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (method === 'POST' && pathname === `${basePath}/timeline`) {
    try {
      const body = await readJsonBody(req);
      const event = await addTimelineEvent(body);
      json(res, 201, { event });
    } catch (error) {
      console.error('[client-api] failed to add timeline event', error.message);
      json(res, 400, { error: error.message });
    }
    return;
  }

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

    const videoProbe = await fetchWithTimeout(`${videoServiceUrl}/health`, { method: 'GET' });
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
