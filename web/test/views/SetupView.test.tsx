import { render, screen, fireEvent } from "@testing-library/react";
import { SetupView } from "../../src/views/SetupView";

it("renders setup tabs", () => {
  render(<SetupView />);
  expect(screen.getByText("CATS")).toBeInTheDocument();
  expect(screen.getByText("CALIBRATE")).toBeInTheDocument();
});

it("shows cat pairing on default tab", () => {
  render(<SetupView />);
  expect(screen.getByText(/Pair Tiles to Cats/i)).toBeInTheDocument();
});

it("switches to CALIBRATE tab and shows calibration instructions", () => {
  render(<SetupView />);
  fireEvent.click(screen.getByText("CALIBRATE"));
  expect(screen.getByText(/Tile Sticker/i)).toBeInTheDocument();
});
