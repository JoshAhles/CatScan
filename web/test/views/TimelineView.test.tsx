import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { TimelineView } from "../../src/views/TimelineView";

const mockTimeline = [
  { room: "Bedroom", from: 1000, to: 2000 },
  { room: "Kitchen", from: 2000, to: 3500 },
  { room: "Office", from: 3500, to: null }, // open segment
];

beforeEach(() => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => mockTimeline,
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("fetches timeline on mount and renders room ribbons", async () => {
  render(<TimelineView catId={1} date="2026-05-11" />);
  await waitFor(() => {
    expect(screen.getByText(/Bedroom/i)).toBeInTheDocument();
  });
  expect(screen.getByText(/Kitchen/i)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/timeline?catId=1&date=2026-05-11"),
    expect.any(Object)
  );
});

it("renders a ribbon bar for each segment", async () => {
  render(<TimelineView catId={1} date="2026-05-11" />);
  await waitFor(() => {
    expect(screen.getByText(/Bedroom/i)).toBeInTheDocument();
  });
  const bars = document.querySelectorAll("[data-testid='timeline-segment']");
  expect(bars.length).toBeGreaterThanOrEqual(2);
});
