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
    sides: [
      { label: 'Policyholder side', waitingGuests: 1 },
      { label: 'Carrier side', waitingGuests: 0 }
    ],
    participants: [
      { name: 'Dana Johnson', designation: 'Client', authenticated: true },
      { name: 'Leah Kim', designation: 'Counsel', authenticated: true },
      { name: 'Jordan Ellis', designation: 'Mediator', authenticated: true },
      { name: 'Chris Patel', designation: 'Carrier representative', authenticated: false }
    ]
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
  const [profile, library, invoices, supportTickets, timeline, videoSessions] = await Promise.all([
    fetchJson('/profile'),
    fetchJson('/library'),
    fetchJson('/invoices'),
    fetchJson('/support'),
    fetchJson('/timeline'),
    fetchWithFallback('/video-sessions', fallbackVideoSessions)
  ]);

  return { profile, library, invoices, supportTickets, timeline, videoSessions };
}
