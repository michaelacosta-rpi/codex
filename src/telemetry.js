const metrics = new Map();
const events = [];
const sinks = new Set();
let getContext = () => ({ });
let initialized = false;

function stableKey(labels) {
  const entries = Object.entries(labels || {}).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export function recordMetric(name, value = 1, labels = {}) {
  const measurement = { name, value: Number(value) || 0, labels, context: getContext(), at: new Date().toISOString() };
  const key = `${name}::${stableKey(labels)}`;
  const metric = metrics.get(key) || { name, labels, count: 0, total: 0 };
  metric.count += 1;
  metric.total += measurement.value;
  metrics.set(key, metric);
  console.info('[metric]', { ...measurement, count: metric.count, total: metric.total });
  notifySinks('metric', measurement);
  return metric;
}

export function logEvent(name, detail = {}, context = getContext()) {
  const entry = { name, detail, context, at: new Date().toISOString() };
  events.push(entry);
  console.info('[event]', entry);
  notifySinks('event', entry);
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

export function initTelemetry({ getContext: contextProvider, sinks: initialSinks = [] } = {}) {
  if (initialized) return;
  if (typeof contextProvider === 'function') {
    getContext = contextProvider;
  }
  initialSinks.forEach(registerTelemetrySink);
  document.addEventListener('click', onGlobalClick, true);
  window.addEventListener('hashchange', onHashChange);
  initialized = true;
  logEvent('telemetry.initialized');
}

export function registerTelemetrySink(sink) {
  if (!sink) return () => {};
  const safeSink = {
    name: sink.name || 'custom',
    onEvent: typeof sink.onEvent === 'function' ? sink.onEvent : null,
    onMetric: typeof sink.onMetric === 'function' ? sink.onMetric : null
  };
  sinks.add(safeSink);
  return () => sinks.delete(safeSink);
}

function notifySinks(type, payload) {
  sinks.forEach((sink) => {
    const handler = type === 'event' ? sink.onEvent : sink.onMetric;
    if (!handler) return;
    try {
      handler(payload);
    } catch (err) {
      console.warn(`[telemetry:${sink.name}] handler failed`, err);
    }
  });
}

function mergePayload(entry) {
  return { ...entry.detail, ...entry.context, event_at: entry.at };
}

export function createAmplitudeSink({ instanceProvider } = {}) {
  const getInstance = instanceProvider || (() => window?.amplitude?.getInstance?.());
  return {
    name: 'amplitude',
    onEvent: (entry) => {
      const amplitude = getInstance();
      if (!amplitude?.logEvent) return;
      amplitude.logEvent(entry.name, mergePayload(entry));
    },
    onMetric: (measurement) => {
      const amplitude = getInstance();
      if (!amplitude?.logEvent) return;
      amplitude.logEvent(`metric.${measurement.name}`, {
        ...measurement.labels,
        value: measurement.value,
        context: measurement.context,
        event_at: measurement.at
      });
    }
  };
}

export function createFullStorySink({ apiProvider } = {}) {
  const getFullStory = apiProvider || (() => window?.FS);
  return {
    name: 'fullstory',
    onEvent: (entry) => {
      const fs = getFullStory();
      if (!fs?.event) return;
      fs.event(entry.name, mergePayload(entry));
    },
    onMetric: (measurement) => {
      const fs = getFullStory();
      if (!fs?.event) return;
      fs.event(`metric.${measurement.name}`, {
        ...measurement.labels,
        value: measurement.value,
        context: measurement.context,
        event_at: measurement.at
      });
    }
  };
}

export function createDataLayerSink({ provider } = {}) {
  const getDataLayer = provider || (() => window?.dataLayer);
  return {
    name: 'dataLayer',
    onEvent: (entry) => {
      const layer = getDataLayer();
      if (!Array.isArray(layer)) return;
      layer.push({
        event: entry.name,
        detail: entry.detail,
        context: entry.context,
        event_at: entry.at
      });
    },
    onMetric: (measurement) => {
      const layer = getDataLayer();
      if (!Array.isArray(layer)) return;
      layer.push({
        event: `metric.${measurement.name}`,
        value: measurement.value,
        labels: measurement.labels,
        context: measurement.context,
        event_at: measurement.at
      });
    }
  };
}
