import { render, screen } from "@testing-library/react";
import { FloorPlan } from "../../src/components/FloorPlan";
import type { CatState } from "../../src/types/contracts";

const cats: CatState[] = [
  { id: 1, name: "Ollie", color: "#ffcc4d", room: "Bedroom", since: 1, silent: false, lastRoom: null, lastSeen: null, photoPath: null },
  { id: 2, name: "Hope", color: "#fb7185", room: "Office", since: 1, silent: false, lastRoom: null, lastSeen: null, photoPath: null },
];

it("renders the floor plan SVG", () => {
  render(<FloorPlan cats={cats} />);
  const svg = document.querySelector("svg");
  expect(svg).toBeInTheDocument();
});

it("renders cat markers for each cat", () => {
  render(<FloorPlan cats={cats} />);
  expect(screen.getByLabelText("Ollie")).toBeInTheDocument();
  expect(screen.getByLabelText("Hope")).toBeInTheDocument();
});

it("renders room polygons for each room in config", () => {
  render(<FloorPlan cats={cats} />);
  // 5 rooms from config
  const polygons = document.querySelectorAll("polygon, rect");
  expect(polygons.length).toBeGreaterThanOrEqual(5);
});
