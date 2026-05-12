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
  useWsStore.setState({ cats: [], nodes: [], calibration: {}, events: [] });

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

  return () => {
    window.clearInterval(transitionTimer);
    window.clearInterval(rssiTimer);
  };
}

/** Stable identifiers so other code (e.g. views) can target a known cat. */
export const DEMO_CAT_IDS = {
  ollie: DEMO_CATS.ollie.id,
  hope: DEMO_CATS.hope.id,
};
