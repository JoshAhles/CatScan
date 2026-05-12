import { render, screen } from "@testing-library/react";
import { CatCard } from "../../src/components/CatCard";

const baseCat = {
  id: 1,
  name: "Ollie",
  color: "#ffcc4d",
  photoPath: null,
} as const;

it("renders visible cat with room and since timestamp", () => {
  const now = Math.floor(Date.now() / 1000);
  render(
    <CatCard
      cat={{ ...baseCat, room: "Bedroom", since: now - 30, silent: false, lastRoom: null, lastSeen: null }}
      nowSec={now}
    />
  );
  // No photoPath → monogram fallback carries the cat's name via aria-label
  expect(screen.getByLabelText("Ollie")).toBeInTheDocument();
  expect(screen.getByText(/Bedroom/)).toBeInTheDocument();
});

it("renders silent cat with last seen info", () => {
  const now = Math.floor(Date.now() / 1000);
  render(
    <CatCard
      cat={{ ...baseCat, room: null, since: null, silent: true, lastRoom: "Kitchen", lastSeen: now - 120 }}
      nowSec={now}
    />
  );
  expect(screen.getByLabelText("Ollie")).toBeInTheDocument();
  expect(screen.getByText(/last seen/i)).toBeInTheDocument();
  expect(screen.getByText(/Kitchen/)).toBeInTheDocument();
  expect(screen.getByText(/ago/)).toBeInTheDocument();
});
