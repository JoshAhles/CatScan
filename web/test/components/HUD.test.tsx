import { render, screen, fireEvent } from "@testing-library/react";
import { HUD } from "../../src/components/HUD";
import { TabBar } from "../../src/components/TabBar";

it("renders brand, online count, live indicator", () => {
  render(<HUD onlineNodeCount={5} totalNodes={6} sessionTime="14:23:55" uptimeSec={123} />);
  expect(screen.getByText(/CATSCAN/)).toBeInTheDocument();
  expect(screen.getByText(/5\/6 NODES/)).toBeInTheDocument();
  expect(screen.getByText("LIVE")).toBeInTheDocument();
});

it("TabBar renders 4 tabs and marks the active one", () => {
  const onClick = vi.fn();
  render(<TabBar active="LIVE" tabs={["LIVE", "TIMELINE", "HEATMAP", "SETUP"]} onTabChange={onClick} />);
  expect(screen.getByText("LIVE")).toBeInTheDocument();
  expect(screen.getByText("TIMELINE")).toBeInTheDocument();
  expect(screen.getByText("HEATMAP")).toBeInTheDocument();
  expect(screen.getByText("SETUP")).toBeInTheDocument();
  const liveBtn = screen.getByText("LIVE").closest("button")!;
  expect(liveBtn.getAttribute("aria-current")).toBe("page");
});

it("TabBar calls onClick when a non-active tab is clicked", () => {
  const onClick = vi.fn();
  render(<TabBar active="LIVE" tabs={["LIVE", "TIMELINE", "HEATMAP", "SETUP"]} onTabChange={onClick} />);
  fireEvent.click(screen.getByText("TIMELINE"));
  expect(onClick).toHaveBeenCalledWith("TIMELINE");
});
