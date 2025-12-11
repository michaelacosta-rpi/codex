const metrics = new Map();
const events = [];
let getContext = () => ({ });
let initialized = false;

function stableKey(labels) {
  const entries = Object.entries(labels || {}).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export function recordMetric(name, value = 1, labels = {}) {
  const key = `${name}::${stableKey(labels)}`;
  const metric = metrics.get(key) || { name, labels, count: 0, total: 0 };
  metric.count += 1;
  metric.total += Number(value) || 0;
  metrics.set(key, metric);
  console.info('[metric]', { name, value, labels, count: metric.count, total: metric.total });
  return metric;
}

export function logEvent(name, detail = {}, context = getContext()) {
  const entry = { name, detail, context, at: new Date().toISOString() };
  events.push(entry);
  console.info('[event]', entry);
  return entry;
}

export function getEventHistory() {
  return [...events];
}

export function getMetricsSnapshot() {
  return Array.from(metrics.values());
}

function onGlobalClick(event) {
  const target = event.target.closest('button, a');
  if (!target) return;
  const route = typeof window !== 'undefined' ? window.location.hash.replace('#/', '').split('?')[0] : '';
  const detail = {
    tag: target.tagName.toLowerCase(),
    text: (target.textContent || '').trim(),
    href: target.tagName.toLowerCase() === 'a' ? target.getAttribute('href') : undefined,
    id: target.id || undefined,
    action: target.dataset.action || target.getAttribute('aria-label') || undefined,
    route
  };
  logEvent('ui.click', detail);
  recordMetric('ui.click', 1, { tag: detail.tag, route: detail.route || 'dashboard' });
}

function onHashChange() {
  const route = typeof window !== 'undefined' ? window.location.hash.replace('#/', '').split('?')[0] : '';
  logEvent('navigation.hashchange', { route });
  recordMetric('navigation.view', 1, { route: route || 'dashboard' });
}

export function initTelemetry({ getContext: contextProvider } = {}) {
  if (initialized) return;
  if (typeof contextProvider === 'function') {
    getContext = contextProvider;
  }
  document.addEventListener('click', onGlobalClick, true);
  window.addEventListener('hashchange', onHashChange);
  initialized = true;
  logEvent('telemetry.initialized');
}
