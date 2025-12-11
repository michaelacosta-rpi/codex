const http = require('node:http');
const { URL } = require('node:url');
const { randomUUID } = require('node:crypto');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const joinBase = process.env.VIDEO_JOIN_BASE || 'https://video.codex.local/room';

const json = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
};

const html = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.end(body);
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

const sessions = new Map();

const createSession = ({
  id,
  title,
  scheduledFor,
  durationMinutes = 60,
  accessPolicy = 'verified',
  verificationMethod = 'magic_link',
  cacheMinutes = 60,
  participants = [],
  sides = [],
  breakoutRooms = [],
  meetingAdmins = []
} = {}) => {
  const sessionId = id || `med-${Math.floor(Math.random() * 4000) + 5000}`;
  const now = new Date();
  const scheduledDate = scheduledFor ? new Date(scheduledFor) : new Date(now.getTime() + 3600_000);

  const session = {
    id: sessionId,
    title: title || 'Virtual mediation',
    scheduledFor: scheduledDate.toISOString(),
    durationMinutes,
    status: 'Scheduled',
    joinLink: `${joinBase}/${sessionId}`,
    accessPolicy,
    verificationMethod,
    cacheMinutes,
    startedAt: null,
    createdAt: now.toISOString(),
    sides: sides.length
      ? sides
      : [
          { label: 'Policyholder side', waitingGuests: [] },
          { label: 'Carrier side', waitingGuests: [] }
        ],
    participants,
    breakoutRooms,
    meetingAdmins: meetingAdmins.length
      ? meetingAdmins
      : [
          {
            name: 'Jordan Ellis',
            email: 'jordan.ellis@northwindmediators.com',
            designation: 'Mediator host',
            permissions: ['Admit/remove', 'Breakout control', 'Recording', 'Reset join tokens'],
            addedBy: 'Case intake automation'
          }
        ],
    invites: [],
    issuedTokens: []
  };

  sessions.set(sessionId, session);
  return session;
};

const seedSession = () => {
  const base = createSession({
    id: 'med-5001',
    title: 'Johnson v. Northwind — coverage dispute',
    scheduledFor: '2025-02-18T15:00:00Z',
    durationMinutes: 90,
    sides: [
      { label: 'Policyholder side', waitingGuests: [{ name: 'Alex (guest)' }, { name: 'Taylor (guest)' }] },
      { label: 'Carrier side', waitingGuests: [] }
    ],
    participants: [
      { name: 'Dana Johnson', designation: 'Client', authenticated: true },
      { name: 'Leah Kim', designation: 'Counsel', authenticated: true },
      { name: 'Jordan Ellis', designation: 'Mediator', authenticated: true },
      { name: 'Chris Patel', designation: 'Carrier representative', authenticated: false }
    ],
    breakoutRooms: [
      { id: 'brk-100', name: 'Plaintiff caucus', participants: ['Dana Johnson', 'Leah Kim'], createdAt: Date.now() - 20 * 60 * 1000 },
      { id: 'brk-101', name: 'Carrier caucus', participants: ['Chris Patel'], createdAt: Date.now() - 10 * 60 * 1000 }
    ]
  });

  base.invites = [
    {
      id: randomUUID(),
      email: 'alex@policyholder.example',
      name: 'Alex',
      side: 'Policyholder',
      role: 'Guest',
      status: 'pending'
    },
    {
      id: randomUUID(),
      email: 'carrier.rep@example',
      name: 'Chris Patel',
      side: 'Carrier',
      role: 'Carrier representative',
      status: 'delivered'
    }
  ];

  sessions.set(base.id, base);
};

seedSession();

const findSession = (id) => sessions.get(id);

const createToken = (sessionId, name, role) => {
  const token = randomUUID();
  return {
    id: token,
    sessionId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    name,
    role,
    joinUrl: `${joinBase}/${sessionId}?token=${token}`
  };
};

const routes = async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const segments = pathname.split('/').filter(Boolean);
  const method = req.method.toUpperCase();

  if (method === 'HEAD' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('codex-video-hosting');
    return;
  }

  if (method === 'GET' && pathname === '/') {
    html(
      res,
      200,
      `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Codex Video Hosting Service</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; color: #0f172a; }
          code { background: #f1f5f9; padding: 0.15rem 0.35rem; border-radius: 4px; }
          h1 { margin-bottom: 0.25rem; }
          p { max-width: 720px; line-height: 1.55; color: #334155; }
          ul { color: #334155; }
        </style>
      </head>
      <body>
        <h1>Codex Video Hosting Service</h1>
        <p>This container hosts the purpose-built video meeting platform for the mediation portals. It provides APIs for session lifecycle, invitations, token issuance, and health checks used by the client and admin experiences.</p>
        <p>Key endpoints:</p>
        <ul>
          <li><code>GET /health</code> — lightweight uptime probe.</li>
          <li><code>GET /status</code> — service metadata and counts.</li>
          <li><code>GET /sessions</code> — list active and scheduled sessions.</li>
          <li><code>POST /sessions</code> — create a new mediation session.</li>
          <li><code>POST /sessions/:id/join-token</code> — issue a shareable join link.</li>
          <li><code>POST /sessions/:id/invite</code> — queue invitations for participants.</li>
        </ul>
        <p>Sessions are stored in-memory for local demos. The backing API maintains breakout room metadata, invitations, and issued tokens alongside scheduling details.</p>
      </body>
      </html>`
    );
    return;
  }

  if (method === 'GET' && pathname === '/health') {
    json(res, 200, {
      status: 'ok',
      service: 'codex-video-hosting',
      uptimeSeconds: Math.round(process.uptime()),
      sessions: sessions.size
    });
    return;
  }

  if (method === 'HEAD' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (method === 'GET' && pathname === '/status') {
    const active = Array.from(sessions.values());
    json(res, 200, {
      status: 'ok',
      service: 'codex-video-hosting',
      joinBase,
      uptimeSeconds: Math.round(process.uptime()),
      sessions: {
        total: active.length,
        inProgress: active.filter((session) => session.status === 'In progress').length,
        scheduled: active.filter((session) => session.status === 'Scheduled').length
      },
      breakouts: active.reduce((total, session) => total + (session.breakoutRooms?.length || 0), 0),
      lastUpdated: new Date().toISOString()
    });
    return;
  }

  if (method === 'GET' && pathname === '/sessions') {
    json(res, 200, { sessions: Array.from(sessions.values()) });
    return;
  }

  if (method === 'POST' && pathname === '/sessions') {
    try {
      const body = await readJsonBody(req);
      if (!body.title) throw new Error('title is required');
      const session = createSession(body);
      json(res, 201, { session });
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (segments[0] === 'sessions' && segments[1]) {
    const sessionId = segments[1];
    const session = findSession(sessionId);

    if (!session) {
      json(res, 404, { error: 'Session not found' });
      return;
    }

    if (method === 'GET' && segments.length === 2) {
      json(res, 200, { session });
      return;
    }

    if (method === 'POST' && segments[2] === 'start') {
      session.status = 'In progress';
      session.startedAt = session.startedAt || new Date().toISOString();
      json(res, 200, { session });
      return;
    }

    if (method === 'POST' && segments[2] === 'complete') {
      session.status = 'Completed';
      json(res, 200, { session });
      return;
    }

    if (method === 'POST' && segments[2] === 'invite') {
      try {
        const body = await readJsonBody(req);
        if (!body.email || !body.name) {
          throw new Error('name and email are required');
        }

        const invite = {
          id: randomUUID(),
          email: body.email,
          name: body.name,
          side: body.side || 'General',
          role: body.role || 'Guest',
          status: 'pending',
          requestedAt: new Date().toISOString()
        };

        session.invites = [invite, ...(session.invites || [])];
        const side = session.sides?.find((s) => s.label?.toLowerCase().includes((body.side || '').toLowerCase()));
        if (side) {
          side.waitingGuests = side.waitingGuests || [];
          side.waitingGuests.push({ name: invite.name });
        }

        json(res, 201, { invite, sessionId });
      } catch (error) {
        json(res, 400, { error: error.message });
      }
      return;
    }

    if (method === 'POST' && segments[2] === 'join-token') {
      try {
        const body = await readJsonBody(req);
        const name = body.name || 'Guest';
        const role = body.role || 'participant';
        const token = createToken(sessionId, name, role);
        session.issuedTokens.unshift(token);
        json(res, 201, { token, sessionId });
      } catch (error) {
        json(res, 400, { error: error.message });
      }
      return;
    }

    if (method === 'POST' && segments[2] === 'breakouts') {
      try {
        const body = await readJsonBody(req);
        if (!body.name) throw new Error('name is required');

        const room = {
          id: `brk-${Math.floor(Math.random() * 900 + 100)}`,
          name: body.name,
          participants: body.participants || [],
          createdAt: Date.now()
        };

        session.breakoutRooms = [room, ...(session.breakoutRooms || [])];
        json(res, 201, { room, sessionId });
      } catch (error) {
        json(res, 400, { error: error.message });
      }
      return;
    }
  }

  json(res, 404, { error: 'Not found' });
};

const server = http.createServer((req, res) => {
  routes(req, res).catch((error) => {
    console.error('[video-hosting-service] unexpected error', error);
    json(res, 500, { error: 'Internal server error' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[video-hosting-service] listening on http://${HOST}:${PORT}`);
});
