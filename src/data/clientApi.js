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

export async function fetchClientPortalData() {
  const [profile, library, invoices, supportTickets, timeline] = await Promise.all([
    fetchJson('/profile'),
    fetchJson('/library'),
    fetchJson('/invoices'),
    fetchJson('/support'),
    fetchJson('/timeline')
  ]);

  return { profile, library, invoices, supportTickets, timeline };
}
