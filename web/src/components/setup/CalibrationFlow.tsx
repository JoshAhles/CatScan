import { useState } from "react";
import { useWsStore } from "../../stores/wsStore";
import { api } from "../../api/client";
import { floorPlanConfig } from "../../floorPlan/config";

type CalibStatus = "pending" | "capturing" | "saved";

interface RoomState {
  status: CalibStatus;
  samples: number;
  target: number;
}

export function CalibrationFlow() {
  const rooms = floorPlanConfig.rooms;
  const calibration = useWsStore((s) => s.calibration);
  const [roomStates, setRoomStates] = useState<Record<string, RoomState>>(() => {
    const init: Record<string, RoomState> = {};
    for (const r of rooms) {
      init[r.name] = { status: calibration[r.name] === "calibrated" ? "saved" : "pending", samples: 0, target: 30 };
    }
    return init;
  });

  async function startCalibration(roomName: string) {
    setRoomStates((s) => ({ ...s, [roomName]: { ...s[roomName]!, status: "capturing" } }));
    try {
      await api("/api/calibration/start", { method: "POST", body: JSON.stringify({ room: roomName }) });
    } catch (e) {
      setRoomStates((s) => ({ ...s, [roomName]: { ...s[roomName]!, status: "pending" } }));
    }
  }

  return (
    <div style={{ fontFamily: "ui-monospace, monospace" }}>
      {/* Prominent reminder banner */}
      <div style={{
        background: "#1a2010", border: "1px solid #4a8040", borderRadius: 6,
        padding: "0.875rem 1rem", marginBottom: "1rem", color: "#80c070", fontSize: "0.8rem",
        lineHeight: 1.6,
      }}>
        Detach one AirTag from a collar before starting. Move your iPhone to another room for the duration. Re-attach when finished.
      </div>

      <h3 style={{ color: "#1ee0c9", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        Calibration — Walk Room by Room
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rooms.map((room) => {
          const state = roomStates[room.name] ?? { status: "pending" as CalibStatus, samples: 0, target: 30 };
          return (
            <div
              key={room.name}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.5rem 0.75rem", background: "#152334", border: "1px solid #2a3d52", borderRadius: 4,
              }}
            >
              <span style={{ flex: 1, color: state.status === "saved" ? "#1ee0c9" : "#d2dfeb", fontSize: "0.8rem" }}>
                {room.name}
              </span>
              {state.status === "saved" && (
                <span style={{ color: "#1ee0c9", fontSize: "0.7rem" }}>CALIBRATED</span>
              )}
              {state.status === "capturing" && (
                <span style={{ color: "#ffcc4d", fontSize: "0.7rem" }}>
                  {state.samples}/{state.target} samples…
                </span>
              )}
              {state.status === "pending" && (
                <button
                  onClick={() => startCalibration(room.name)}
                  style={{
                    padding: "0.25rem 0.75rem", background: "#1ee0c9", color: "#0c1422",
                    border: "none", borderRadius: 3, cursor: "pointer", minHeight: 44,
                    fontFamily: "ui-monospace, monospace", fontSize: "0.7rem", letterSpacing: "0.08em",
                  }}
                >
                  I'm in {room.name}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
