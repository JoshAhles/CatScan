import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { useWsStore } from "../../stores/wsStore";

export function CatPairing() {
  const cats = useWsStore((s) => s.cats);
  const [pairingCatId, setPairingCatId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (pairingCatId === null) return;
    const id = window.setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setPairingCatId(null);
          setResult("Pairing window closed. Check the Live view to see if it worked.");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pairingCatId]);

  async function startPairing(catId: number) {
    setResult(null);
    try {
      await api(`/api/cats/${catId}/pair`, { method: "POST" });
      setPairingCatId(catId);
      setCountdown(60);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Failed to start pairing");
    }
  }

  if (cats.length === 0) {
    return (
      <p style={{ fontFamily: "ui-monospace, monospace", color: "#7e93a8", fontSize: "0.8rem" }}>
        No cats registered yet. Add them via the API or database.
      </p>
    );
  }

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h3 style={{ color: "#1ee0c9", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
        Pair Tiles to Cats
      </h3>

      {result && <p style={{ color: "#ffcc4d", fontSize: "0.75rem" }}>{result}</p>}

      {pairingCatId !== null && (
        <div style={{
          background: "#2a1a10", border: "1px solid #ff8c4d", borderRadius: 6,
          padding: "1rem", color: "#ffcc4d", fontSize: "0.8rem", lineHeight: 1.6,
        }}>
          Hold the Tile Sticker close to any ESP32 node for the next minute so CatScan can detect and pair it.
          <div style={{ color: "#1ee0c9", fontSize: "1.5rem", textAlign: "center", marginTop: "0.5rem" }}>
            {countdown}s
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {cats.map((cat) => (
          <div
            key={cat.id}
            style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.5rem 0.75rem", background: "#152334", border: "1px solid #2a3d52", borderRadius: 4,
            }}
          >
            <span
              style={{
                width: 12, height: 12, borderRadius: "50%",
                background: cat.color, flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: "#d2dfeb", fontSize: "0.8rem" }}>
              {cat.name}
            </span>
            <button
              disabled={pairingCatId !== null}
              onClick={() => startPairing(cat.id)}
              style={{
                padding: "0.25rem 0.75rem", background: pairingCatId === cat.id ? "#ffcc4d" : "#1ee0c9",
                color: "#0c1422", border: "none", borderRadius: 3, cursor: pairingCatId !== null ? "default" : "pointer",
                minHeight: 44, fontFamily: "ui-monospace, monospace", fontSize: "0.7rem",
                letterSpacing: "0.08em", opacity: pairingCatId !== null && pairingCatId !== cat.id ? 0.4 : 1,
              }}
            >
              {pairingCatId === cat.id ? `Pairing… ${countdown}s` : "Pair Tile"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
