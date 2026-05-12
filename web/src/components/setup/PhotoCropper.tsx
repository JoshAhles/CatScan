import { useEffect, useRef } from "react";

async function maskToCircle(img: HTMLImageElement, size = 512): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

interface PhotoCropperProps {
  file: File;
  onAccept: (blob: Blob) => void;
}

export function PhotoCropper({ file, onAccept }: PhotoCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 256;
      canvas.height = 256;
      ctx.drawImage(img, 0, 0, 256, 256);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleAccept() {
    const img = imgRef.current;
    // Image hasn't loaded yet (or load failed) — refuse the click rather than
    // emit an empty/circle-masked blank canvas.
    if (!img) return;
    const blob = await maskToCircle(img);
    onAccept(blob);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #1a2d3a", borderRadius: "50%", width: 128, height: 128 }}
      />
      <button
        onClick={handleAccept}
        style={{
          padding: "0.5rem 1rem",
          background: "#1ee0c9",
          color: "#06080d",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Crop &amp; Accept
      </button>
    </div>
  );
}
