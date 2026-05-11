import { render, screen } from "@testing-library/react";
import { NodeStatusList } from "../../src/components/NodeStatusList";
import type { NodeState } from "../../src/types/contracts";

const nodes: NodeState[] = [
  { id: "node-00000001", roomName: "Bedroom", status: "online", rssiByCatId: { "1": -65 } },
  { id: "node-00000002", roomName: "Office", status: "online", rssiByCatId: { "1": -80 } },
  { id: "node-00000003", roomName: null, status: "offline", rssiByCatId: {} },
];

it("renders node rows with names", () => {
  render(<NodeStatusList nodes={nodes} />);
  expect(screen.getByText(/Bedroom/)).toBeInTheDocument();
  expect(screen.getByText(/Office/)).toBeInTheDocument();
});

it("shows 6 rows when passed 6 nodes", () => {
  const sixNodes: NodeState[] = Array.from({ length: 6 }, (_, i) => ({
    id: `node-0000000${i + 1}` as NodeState["id"],
    roomName: `Room ${i + 1}`,
    status: "online" as const,
    rssiByCatId: { "1": -60 - i * 5 },
  }));
  render(<NodeStatusList nodes={sixNodes} />);
  const rows = document.querySelectorAll("[data-testid='node-row']");
  expect(rows).toHaveLength(6);
});
