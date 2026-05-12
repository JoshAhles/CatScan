import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { PhotoCropper } from "../../../src/components/setup/PhotoCropper";

// jsdom doesn't implement canvas 2D context or URL.createObjectURL — and it
// won't auto-fire <img>.onload when .src is assigned, so we patch Image so the
// cropper's load handler actually runs.
const OrigImage = global.Image;

beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:fake");
  global.URL.revokeObjectURL = vi.fn();
  const mockCtx = {
    drawImage: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    beginPath: vi.fn(),
  };
  Object.defineProperty(mockCtx, "globalCompositeOperation", {
    set: vi.fn(),
    get: vi.fn(() => "source-over"),
    configurable: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(["fake"], { type: "image/png" })));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Image = class extends OrigImage {
    constructor() {
      super();
      let _src = "";
      Object.defineProperty(this, "src", {
        get: () => _src,
        set: (v: string) => {
          _src = v;
          // Defer to next tick so the cropper has assigned onload first.
          setTimeout(() => (this as unknown as { onload?: (e: Event) => void }).onload?.(new Event("load")), 0);
        },
        configurable: true,
      });
    }
  };
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Image = OrigImage;
});

it("renders a canvas and accept button", () => {
  const onAccept = vi.fn();
  render(<PhotoCropper file={new File([""], "cat.png", { type: "image/png" })} onAccept={onAccept} />);
  expect(document.querySelector("canvas")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /crop|accept|save/i })).toBeInTheDocument();
});

it("calls onAccept with a Blob when the accept button is clicked", async () => {
  const onAccept = vi.fn();
  render(<PhotoCropper file={new File([""], "cat.png", { type: "image/png" })} onAccept={onAccept} />);
  // Let the useEffect run + patched Image fire onload + imgRef set.
  await new Promise((r) => setTimeout(r, 20));
  fireEvent.click(screen.getByRole("button", { name: /crop|accept|save/i }));
  await vi.waitFor(() => {
    expect(onAccept).toHaveBeenCalledWith(expect.any(Blob));
  });
});
