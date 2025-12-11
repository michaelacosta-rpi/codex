# Telemetry and analytics hooks

The admin SPA exposes lightweight telemetry primitives in `src/telemetry.js` so runtime events can be forwarded to external
analytics tools without rewriting UI components. Events and metrics are still logged to the console and stored in memory, but you
can now register sinks that relay payloads to trackers such as Amplitude or FullStory.

## Confidentiality and security reminders
- Mediations and their outcomes are extremely confidential. Do not emit party names, case identifiers, transcripts, or outcome details in telemetry payloads.
- Ensure telemetry sinks transmit over encrypted channels, strip or hash identifiers where possible, and respect least-privilege access to downstream analytics tools.
- Default sinks and custom handlers should favor anonymized event properties and avoid persisting raw media or chat content.

## Core APIs

- `logEvent(name, detail, context)` — records a timestamped event and dispatches it to all registered sinks.
- `recordMetric(name, value, labels)` — tracks counters/aggregations and dispatches the raw measurement to sinks.
- `initTelemetry({ getContext, sinks })` — primes the telemetry layer, accepts a context provider, and registers sink adapters.
- `registerTelemetrySink({ name, onEvent, onMetric })` — add/remove sink handlers at runtime; the return value unregisters the sink.

## Built-in sink adapters

Use the provided factories to wire common analytics trackers with minimal boilerplate. Each factory safely no-ops when the global
API is absent, so they can be included even before the vendor script loads.

```js
import {
  createAmplitudeSink,
  createDataLayerSink,
  createFullStorySink,
  initTelemetry
} from './telemetry.js';

initTelemetry({
  getContext: () => ({ userId, userRoles, route: window.location.hash }),
  sinks: [
    createAmplitudeSink(), // forwards events/metrics via amplitude.getInstance().logEvent
    createFullStorySink(), // forwards to FS.event
    createDataLayerSink()  // pushes analytics-friendly objects onto window.dataLayer
  ]
});
```

### Amplitude
- Loads the active instance via `window.amplitude.getInstance()` by default.
- Sends events as-is and metrics as `metric.<name>` with labels, value, and context merged into the payload.
- Override the instance with `createAmplitudeSink({ instanceProvider: () => customInstance })` if needed.

### FullStory
- Forwards events and metrics through `FS.event`, merging `detail` and `context` for consistent attribution.
- Provide a custom accessor with `createFullStorySink({ apiProvider })` when using sandboxed environments.

### Data layer / tag managers
- `createDataLayerSink` appends normalized objects to `window.dataLayer` for GTM or similar tools.
- Supply a different data layer with `createDataLayerSink({ provider: () => myLayer })`.

## Adding additional trackers

Use `registerTelemetrySink` to add bespoke handlers. Both `onEvent` and `onMetric` receive the structured payload used by the
built-in adapters, so you can forward them to any downstream collector or network call without changing UI code.
