import { render, screen, fireEvent } from "@testing-library/react";
import { SetupView } from "../../src/views/SetupView";

it("renders setup tabs", () => {
  render(<SetupView />);
  expect(screen.getByText("NODES")).toBeInTheDocument();
  expect(screen.getByText("CATS")).toBeInTheDocument();
  expect(screen.getByText("CALIBRATE")).toBeInTheDocument();
});

it("switches to CATS tab and shows cat pairing form", () => {
  render(<SetupView />);
  fireEvent.click(screen.getByText("CATS"));
  expect(screen.getByText(/Pair AirTag/i)).toBeInTheDocument();
});

it("switches to CALIBRATE tab and shows iPhone reminder", () => {
  render(<SetupView />);
  fireEvent.click(screen.getByText("CALIBRATE"));
  expect(screen.getByText(/Detach one AirTag/i)).toBeInTheDocument();
  expect(screen.getByText(/iPhone/i)).toBeInTheDocument();
});
