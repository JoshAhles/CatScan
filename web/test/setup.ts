import "@testing-library/jest-dom";

// jsdom does not implement matchMedia; provide a stub (includes deprecated addListener for Framer Motion)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},    // deprecated but used by Framer Motion
    removeListener: () => {},  // deprecated but used by Framer Motion
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
