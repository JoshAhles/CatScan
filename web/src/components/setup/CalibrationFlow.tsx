import { useWsStore } from "../../stores/wsStore";
import { api } from "../../api/client";
import { floorPlanConfig } from "../../floorPlan/config";

export function CalibrationFlow() {
  const rooms = floorPlanConfig.rooms;
  const calibration = useWsStore((s) => s.calibration);
  const progress = useWsStore((s) => s.calibrationProgress);

  async function startCalibration(roomName: string) {
    try {
      if (calibration[roomName] === "calibrated") {
        await api(`/api/calibration/${encodeURIComponent(roomName)}`, { method: "DELETE" });
      }
    } catch { /* proceed anyway */ }
    try {
      await api("/api/calibration/start", { method: "POST", body: JSON.stringify({ room: roomName }) });
    } catch { /* server will broadcast progress if it starts */ }
  }

  async function stopCalibration() {
    try {
      await api("/api/calibration/stop", { method: "POST" });
    } catch { /* ignore */ }
  }

  const btnStyle = {
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: 3,
    cursor: "pointer",
    minHeight: 48,
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.8rem",
    letterSpacing: "0.08em",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation" as const,
  };

  return (
    <div style={{ fontFamily: "ui-monospace, monospace" }}>
      <div style={{
        background: "#1a2010", border: "1px solid #4a8040", borderRadius: 6,
        padding: "0.875rem 1rem", marginBottom: "1rem", color: "#80c070", fontSize: "0.8rem",
        lineHeight: 1.6,
      }}>
        Take one Tile Sticker to each room. Press Start, walk around the room slowly, then press Stop when done.
      </div>

      <h3 style={{ color: "#1ee0c9", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        Calibration — Walk Room by Room
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rooms.map((room) => {
          const isCalibrated = calibration[room.name] === "calibrated";
          const isCapturing = progress?.room === room.name;
          const anotherCapturing = progress !== null && progress.room !== room.name;
          return (
            <div
              key={room.name}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.5rem 0.75rem", background: "#152334", border: "1px solid #2a3d52", borderRadius: 4,
              }}
            >
              <span style={{ flex: 1, color: isCalibrated ? "#1ee0c9" : "#d2dfeb", fontSize: "0.8rem" }}>
                {room.name}
              </span>
              {isCapturing && (
                <>
                  <span style={{ color: "#ffcc4d", fontSize: "0.75rem" }}>
                    {progress.samples} samples
                  </span>
                  <button
                    onClick={stopCalibration}
                    style={{ ...btnStyle, background: "#ff8c4d", color: "#0c1422" }}
                  >
                    Stop & Save
                  </button>
                </>
              )}
              {!isCapturing && (
                <>
                  {isCalibrated && (
                    <span style={{ color: "#1ee0c9", fontSize: "0.7rem", marginRight: "0.25rem" }}>CALIBRATED</span>
                  )}
                  <button
                    disabled={anotherCapturing}
                    onClick={() => startCalibration(room.name)}
                    style={{
                      ...btnStyle,
                      background: anotherCapturing ? "#1a2533" : isCalibrated ? "#2a3d52" : "#1ee0c9",
                      color: anotherCapturing ? "#4a5568" : isCalibrated ? "#d2dfeb" : "#0c1422",
                      cursor: anotherCapturing ? "default" : "pointer",
                    }}
                  >
                    {isCalibrated ? "Recalibrate" : "Start"}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
