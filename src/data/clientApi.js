import { clientApiOrigin } from '../config.js';

async function fetchJson(path, options = {}) {
  const response = await fetch(`${clientApiOrigin}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

const fallbackVideoSessions = [
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
      {
        id: 'brk-100',
        name: 'Plaintiff caucus',
        participants: ['Dana Johnson', 'Leah Kim'],
        createdAt: Date.now() - 20 * 60 * 1000
      },
      {
        id: 'brk-101',
        name: 'Carrier caucus',
        participants: ['Chris Patel'],
        createdAt: Date.now() - 10 * 60 * 1000
      }
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
];

const fallbackMediations = [
  {
    id: 'mediation-4801',
    name: 'Dawson v. Hilliard — property damage',
    participants: ['N. Dawson', 'M. Hilliard', 'Mediator'],
    timeframe: 'upcoming',
    invitesSent: true,
    rsvp: { accepted: 2, total: 3 },
    status: 'Calendar invites sent'
  },
  {
    id: 'mediation-4800',
    name: 'Kensington Logistics breach claim',
    participants: ['T. Alvarez', 'S. Greene', 'Mediator'],
    timeframe: 'upcoming',
    invitesSent: false,
    rsvp: { accepted: 0, total: 3 },
    status: 'Invites ready'
  },
  {
    id: 'mediation-4799',
    name: 'Brighton Health v. Lindholm — billing dispute',
    participants: ['Brighton Health', 'Lindholm counsel', 'Mediator'],
    timeframe: 'completed',
    durationMinutes: 95,
    joinedCount: 3,
    invitesSent: true,
    rsvp: { accepted: 3, total: 3 },
    outcome: 'Settled',
    signaturesComplete: true,
    settlementConfirmed: true,
    settledInSession: true
  },
  {
    id: 'mediation-4798',
    name: 'Orchard Supply v. Ferrell — employment',
    participants: ['Orchard Supply', 'Ferrell counsel', 'Mediator'],
    timeframe: 'completed',
    durationMinutes: 120,
    joinedCount: 2,
    invitesSent: true,
    rsvp: { accepted: 2, total: 3 },
    outcome: 'Pending confirmation',
    signaturesComplete: true,
    settlementConfirmed: false,
    settledInSession: false
  },
  {
    id: 'mediation-4797',
    name: 'Linden coverage review',
    participants: ['Linden Risk', 'Carrier panel', 'Mediator'],
    timeframe: 'completed',
    durationMinutes: 70,
    joinedCount: 3,
    invitesSent: true,
    rsvp: { accepted: 3, total: 4 },
    outcome: 'Unresolved',
    signaturesComplete: false,
    settlementConfirmed: false,
    settledInSession: false
  }
];

async function fetchWithFallback(path, fallback) {
  try {
    return await fetchJson(path);
  } catch (err) {
    console.warn(`Falling back to local data for ${path}:`, err);
    return fallback;
  }
}

export async function fetchClientPortalData() {
  const [profile, library, invoices, supportTickets, timeline, videoSessions, mediations] = await Promise.all([
    fetchJson('/profile'),
    fetchJson('/library'),
    fetchJson('/invoices'),
    fetchJson('/support'),
    fetchJson('/timeline'),
    fetchWithFallback('/video-sessions', fallbackVideoSessions),
    fetchWithFallback('/mediations', fallbackMediations)
  ]);

  return { profile, library, invoices, supportTickets, timeline, videoSessions, mediations };
}
