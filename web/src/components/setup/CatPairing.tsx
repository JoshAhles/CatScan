import { useState, useRef } from "react";
import { api } from "../../api/client";
import { PhotoCropper } from "./PhotoCropper";

interface CatPairingProps {
  onComplete?: () => void;
}

export function CatPairing({ onComplete }: CatPairingProps) {
  const [step, setStep] = useState<"form" | "cropping" | "pairing" | "done">("form");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ffcc4d");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pairingCountdown, setPairingCountdown] = useState(60);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setError(null);
    try {
      const cat = await api<{ id: number }>("/api/cats", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (photoBlob) {
        const form = new FormData();
        form.append("photo", photoBlob, "photo.png");
        await fetch(`/api/cats/${cat.id}/photo`, { method: "POST", body: form });
      }
      await api(`/api/cats/${cat.id}/pair`, { method: "POST" });
      setStep("pairing");
      let secs = 60;
      const interval = setInterval(() => {
        secs -= 1;
        setPairingCountdown(secs);
        if (secs <= 0) {
          clearInterval(interval);
          setStep("done");
          onComplete?.();
        }
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  if (step === "cropping" && photoFile) {
    return (
      <div>
        <h3 style={{ color: "#1ee0c9", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Crop Photo
        </h3>
        <PhotoCropper
          file={photoFile}
          onAccept={(blob) => { setPhotoBlob(blob); setStep("form"); }}
        />
      </div>
    );
  }

  if (step === "pairing") {
    return (
      <div style={{ fontFamily: "ui-monospace, monospace" }}>
        <div style={{
          background: "#2a1a10", border: "1px solid #ff8c4d", borderRadius: 6,
          padding: "1rem", marginBottom: "1rem", color: "#ffcc4d", fontSize: "0.8rem",
          lineHeight: 1.6,
        }}>
          Place your iPhone in another room (or airplane mode) for the next minute. The AirTag must be in advertising mode for CatScan to detect it.
        </div>
        <div style={{ color: "#1ee0c9", fontSize: "1.5rem", textAlign: "center" }}>
          {pairingCountdown}s
        </div>
        <p style={{ color: "#6a8090", fontSize: "0.75rem", textAlign: "center", marginTop: "0.5rem" }}>
          Hold the AirTag near any ESP32 node…
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <p style={{ color: "#1ee0c9", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
        Cat paired successfully.
      </p>
    );
  }

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h3 style={{ color: "#1ee0c9", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
        Add Cat
      </h3>
      {error && <p style={{ color: "#ff4d6a", fontSize: "0.75rem" }}>{error}</p>}
      <label style={{ color: "#6a8090", fontSize: "0.72rem" }}>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", background: "#0d1520", border: "1px solid #1a2d3a", color: "#c8d8e8", padding: "0.375rem 0.5rem", borderRadius: 3, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", width: "100%", minHeight: 44, marginTop: "0.25rem" }}
        />
      </label>
      <label style={{ color: "#6a8090", fontSize: "0.72rem" }}>
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ display: "block", width: 44, height: 44, padding: 2, background: "transparent", border: "1px solid #1a2d3a", borderRadius: 3, cursor: "pointer", marginTop: "0.25rem" }}
        />
      </label>
      <label style={{ color: "#6a8090", fontSize: "0.72rem" }}>
        Photo (optional)
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "block", marginTop: "0.25rem", color: "#c8d8e8", fontSize: "0.72rem" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setPhotoFile(f); setStep("cropping"); }
          }}
        />
      </label>
      {photoBlob && (
        <p style={{ color: "#1ee0c9", fontSize: "0.72rem" }}>Photo ready.</p>
      )}
      <button
        onClick={handleSubmit}
        style={{ padding: "0.5rem 1rem", background: "#1ee0c9", color: "#06080d", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", minHeight: 44 }}
      >
        Pair AirTag
      </button>
    </div>
  );
}
