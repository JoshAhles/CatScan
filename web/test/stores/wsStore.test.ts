import { describe, it, expect } from "vitest";
import { createWsStore } from "../../src/stores/wsStore";

describe("wsStore", () => {
  it("applies a snapshot then a transition", () => {
    const store = createWsStore();
    store.getState().applyEvent({
      type: "snapshot", ts: 1, cats: [
        { id: 1, name: "Ollie", color: "#ffcc4d", room: "Bedroom", since: 1, silent: false, lastRoom: null, lastSeen: null, photoPath: null },
      ], nodes: [], calibration: {},
    });
    expect(store.getState().cats[0]?.room).toBe("Bedroom");
    store.getState().applyEvent({ type: "transition", catId: 1, from: "Bedroom", to: "Office", at: 2 });
    expect(store.getState().cats[0]?.room).toBe("Office");
    expect(store.getState().cats[0]?.since).toBe(2);
  });

  it("applies silent / unsilent transitions correctly", () => {
    const store = createWsStore();
    store.getState().applyEvent({
      type: "snapshot", ts: 1, cats: [
        { id: 1, name: "Ollie", color: "#ffcc4d", room: "Bedroom", since: 1, silent: false, lastRoom: null, lastSeen: null, photoPath: null },
      ], nodes: [], calibration: {},
    });
    store.getState().applyEvent({ type: "silent", catId: 1, lastRoom: "Bedroom", lastSeen: 5 });
    expect(store.getState().cats[0]?.silent).toBe(true);
    expect(store.getState().cats[0]?.lastRoom).toBe("Bedroom");
    store.getState().applyEvent({ type: "unsilent", catId: 1, room: "Kitchen", at: 10 });
    expect(store.getState().cats[0]?.silent).toBe(false);
    expect(store.getState().cats[0]?.room).toBe("Kitchen");
  });
});
