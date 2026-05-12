import { useState, useRef, useEffect } from "react";
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
      setPairingCountdown(60);
      setStep("pairing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  // Drive the pairing countdown from an effect so the interval is cleaned up
  // when the user navigates away mid-countdown (or the component unmounts).
  useEffect(() => {
    if (step !== "pairing") return;
    const id = window.setInterval(() => {
      setPairingCountdown((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setStep("done");
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [step, onComplete]);

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
        <p style={{ color: "#7e93a8", fontSize: "0.75rem", textAlign: "center", marginTop: "0.5rem" }}>
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
      <label style={{ color: "#7e93a8", fontSize: "0.72rem" }}>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", background: "#152334", border: "1px solid #2a3d52", color: "#d2dfeb", padding: "0.375rem 0.5rem", borderRadius: 3, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", width: "100%", minHeight: 44, marginTop: "0.25rem" }}
        />
      </label>
      <label style={{ color: "#7e93a8", fontSize: "0.72rem" }}>
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ display: "block", width: 44, height: 44, padding: 2, background: "transparent", border: "1px solid #2a3d52", borderRadius: 3, cursor: "pointer", marginTop: "0.25rem" }}
        />
      </label>
      <label style={{ color: "#7e93a8", fontSize: "0.72rem" }}>
        Photo (optional)
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "block", marginTop: "0.25rem", color: "#d2dfeb", fontSize: "0.72rem" }}
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
        style={{ padding: "0.5rem 1rem", background: "#1ee0c9", color: "#0c1422", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", minHeight: 44 }}
      >
        Pair AirTag
      </button>
    </div>
  );
}
