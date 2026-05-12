/**
 * Boots the dashboard with synthetic data when VITE_DEMO_MODE is set, and
 * keeps it feeling alive via periodic transition / RSSI events.
 *
 * Every event runs through `serverEventSchema.parse` — the exact contract the
 * live WebSocket validates against — and is then handed to `applyEvent`, the
 * exact reducer that consumes real server frames. If the demo and the live
 * server ever drift, this code throws before anything reaches the UI.
 *
 * The real WS connection is bypassed in demo mode; `installDemo` returns a
 * cleanup function that stops all timers when unmounted.
 */
import { useWsStore } from "../stores/wsStore";
import { serverEventSchema, type ServerEvent } from "../types/contracts";
import {
  buildSnapshotEvent,
  buildSeedEvents,
  makeTransitionEvent,
  makeRssiUpdateEvent,
  makeSilentEvent,
  makeUnsilentEvent,
  pickNextRoom,
  DEMO_CATS,
} from "./demoData";

// Disabled under Vitest so unit tests don't pick up synthetic data via the
// API short-circuit. Toggle the flag in `web/.env.local` for the dev server.
export const DEMO_MODE =
  import.meta.env["MODE"] !== "test" &&
  (import.meta.env["VITE_DEMO_MODE"] as string | undefined)?.toLowerCase() === "true";

const TRANSITION_INTERVAL_MS = 22_000;
const RSSI_INTERVAL_MS = 5_500;
const SILENT_CYCLE_INTERVAL_MS = 95_000;
/** Probability per silent-cycle tick that a visible cat is silenced. */
const SILENT_CHANCE = 0.5;
/** Range of seconds a cat stays silent before being re-detected. */
const SILENT_DWELL_MS = { min: 18_000, max: 38_000 };
/** Occasionally do a much longer silent dwell (~6 min) so the SilentAlert
 *  threshold (5 min) actually triggers in demo — same shape as a real
 *  dead-battery / out-of-range event would produce. */
const LONG_SILENT_CHANCE = 0.18;
const LONG_SILENT_DWELL_MS = 6 * 60 * 1000;

/**
 * Validate the event against the shared schema, then dispatch it through the
 * real reducer. Throws if any field drifts from the production contract — a
 * surface-it-loudly signal during development.
 */
function dispatch(ev: ServerEvent) {
  const parsed = serverEventSchema.parse(ev);
  useWsStore.getState().applyEvent(parsed);
}

export function installDemo(): () => void {
  // Fresh slate so re-mounts (e.g. React StrictMode double-invoke) seed cleanly.
  useWsStore.setState({
    cats: [],
    nodes: [],
    calibration: {},
    events: [],
    transitions: [],
    selectedCatId: null,
  });

  // 1. Snapshot first — establishes cats / nodes / calibration so subsequent
  //    activity-log messages can resolve cat names and node room labels.
  dispatch(buildSnapshotEvent());

  // 2. Replay seed history in chronological order. Each event prepends one
  //    activity entry (newest ends up on top) and applies its state mutation
  //    via the live reducer, so the final cat/`since` values come from the
  //    last relevant event — same way live runtime accumulates state.
  for (const ev of buildSeedEvents()) {
    dispatch(ev);
  }

  // 3. Live simulator — keeps the dashboard breathing.
  const transitionTimer = window.setInterval(() => {
    const { cats } = useWsStore.getState();
    if (cats.length === 0) return;
    const cat = cats[Math.floor(Math.random() * cats.length)]!;
    if (cat.silent || !cat.room) return;
    const to = pickNextRoom(cat.room);
    if (to === cat.room) return;
    dispatch(makeTransitionEvent(cat.id, cat.room, to));
  }, TRANSITION_INTERVAL_MS);

  const rssiTimer = window.setInterval(() => {
    const { cats, nodes } = useWsStore.getState();
    dispatch(makeRssiUpdateEvent(cats, nodes));
  }, RSSI_INTERVAL_MS);

  // Occasionally silence a cat (e.g. AirTag rotated, briefly out of range)
  // then re-detect them — exercises the full silent → unsilent code path.
  const unsilentTimeouts = new Set<number>();
  const silentCycleTimer = window.setInterval(() => {
    if (Math.random() > SILENT_CHANCE) return;
    const { cats } = useWsStore.getState();
    const candidates = cats.filter((c) => !c.silent && c.room);
    if (candidates.length === 0) return;
    const cat = candidates[Math.floor(Math.random() * candidates.length)]!;
    const lastRoom = cat.room!;
    dispatch(makeSilentEvent(cat.id, lastRoom));
    const dwell = Math.random() < LONG_SILENT_CHANCE
      ? LONG_SILENT_DWELL_MS
      : SILENT_DWELL_MS.min + Math.random() * (SILENT_DWELL_MS.max - SILENT_DWELL_MS.min);
    const id = window.setTimeout(() => {
      unsilentTimeouts.delete(id);
      // Re-detect in the same room or an adjacent one — mirrors how the real
      // decider would resume after a stale window clears.
      const room = Math.random() < 0.65 ? lastRoom : pickNextRoom(lastRoom);
      dispatch(makeUnsilentEvent(cat.id, room));
    }, dwell);
    unsilentTimeouts.add(id);
  }, SILENT_CYCLE_INTERVAL_MS);

  return () => {
    window.clearInterval(transitionTimer);
    window.clearInterval(rssiTimer);
    window.clearInterval(silentCycleTimer);
    for (const id of unsilentTimeouts) window.clearTimeout(id);
    unsilentTimeouts.clear();
  };
}

/** Stable identifiers so other code (e.g. views) can target a known cat. */
export const DEMO_CAT_IDS = {
  ollie: DEMO_CATS.ollie.id,
  hope: DEMO_CATS.hope.id,
};
