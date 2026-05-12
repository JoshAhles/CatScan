import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useWsStore } from "../stores/wsStore";
import styles from "../styles/mission.module.css";

interface TimelineSegment {
  room: string;
  from: number;
  to: number | null;
}

interface TimelineViewProps {
  catId: number;
  date: string;
}

const ROOM_COLORS: Record<string, string> = {
  "Living Room": "#1a2840",
  Kitchen: "#3a2e10",
  "Master Bedroom": "#103a32",
  Office: "#1a2a20",
  "Cat Room": "#2a201a",
};

function roomColor(room: string): string {
  return ROOM_COLORS[room] ?? "#1a2030";
}

function roomAccent(room: string): string {
  return ROOM_COLORS[room] ? "#1ee0c9" : "#6a8090";
}

export function TimelineView({ catId, date }: TimelineViewProps) {
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api<TimelineSegment[]>(`/api/timeline?catId=${catId}&date=${date}`)
      .then((data) => {
        setSegments(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      });
  }, [catId, date]);

  // Subscribe to transition events to extend the open segment in real time
  const cats = useWsStore((s) => s.cats);
  useEffect(() => {
    // When the cat transitions, extend open segment or add new one
    // We track this by watching the cat's current room change
    const cat = cats.find((c) => c.id === catId);
    if (!cat || cat.silent) return;
    const nowSec = Math.floor(Date.now() / 1000);
    setSegments((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (!last) return prev;
      if (last.room === cat.room) {
        // Still in same room, update the open end
        return [...prev.slice(0, -1), { ...last, to: null }];
      }
      if (last.to === null) {
        // Cat moved to new room — close old segment and open new one
        return [
          ...prev.slice(0, -1),
          { ...last, to: cat.since ?? nowSec },
          { room: cat.room, from: cat.since ?? nowSec, to: null },
        ];
      }
      return prev;
    });
  }, [cats, catId]);

  if (loading) {
    return (
      <div style={{ padding: "1rem", color: "#6a8090", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
        LOADING…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#ff4d6a", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
        ERROR: {error}
      </div>
    );
  }

  // Compute total time span for proportional widths
  const nowSec = Math.floor(Date.now() / 1000);
  const firstFrom = segments[0]?.from ?? nowSec;
  const lastTo = segments[segments.length - 1]?.to ?? nowSec;
  const totalSpan = Math.max(1, lastTo - firstFrom);

  return (
    <div style={{ padding: "1rem", fontFamily: "ui-monospace, monospace" }}>
      <div
        style={{ display: "flex", height: "40px", borderRadius: 4, overflow: "hidden", border: "1px solid #1a2d3a" }}
      >
        {segments.map((seg, i) => {
          const segTo = seg.to ?? nowSec;
          const width = ((segTo - seg.from) / totalSpan) * 100;
          return (
            <div
              key={i}
              data-testid="timeline-segment"
              title={`${seg.room}: ${seg.from}–${segTo}`}
              style={{
                width: `${width}%`,
                minWidth: 4,
                background: roomColor(seg.room),
                borderRight: "1px solid #0d1520",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {width > 8 && (
                <span
                  style={{
                    fontSize: "0.6rem",
                    color: roomAccent(seg.room),
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    padding: "0 4px",
                  }}
                >
                  {seg.room}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
        {Array.from(new Set(segments.map((s) => s.room))).map((room) => (
          <div key={room} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <div
              style={{
                width: 10, height: 10, borderRadius: 2,
                background: roomColor(room), border: "1px solid #1a2d3a",
              }}
            />
            <span style={{ fontSize: "0.65rem", color: "#6a8090", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {room}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
