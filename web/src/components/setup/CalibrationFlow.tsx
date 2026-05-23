import { useWsStore } from "../../stores/wsStore";
import { api } from "../../api/client";
import { floorPlanConfig } from "../../floorPlan/config";

export function CalibrationFlow() {
  const rooms = floorPlanConfig.rooms;
  const calibration = useWsStore((s) => s.calibration);
  const progress = useWsStore((s) => s.calibrationProgress);

  async function startCalibration(roomName: string) {
    try {
      await api("/api/calibration/start", { method: "POST", body: JSON.stringify({ room: roomName }) });
    } catch {
      // ignore — server will broadcast progress if it starts
    }
  }

  return (
    <div style={{ fontFamily: "ui-monospace, monospace" }}>
      <div style={{
        background: "#1a2010", border: "1px solid #4a8040", borderRadius: 6,
        padding: "0.875rem 1rem", marginBottom: "1rem", color: "#80c070", fontSize: "0.8rem",
        lineHeight: 1.6,
      }}>
        Take one Tile Sticker to each room. Press the button, wait for samples to fill, then move to the next room.
      </div>

      <h3 style={{ color: "#1ee0c9", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        Calibration — Walk Room by Room
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rooms.map((room) => {
          const isCalibrated = calibration[room.name] === "calibrated";
          const isCapturing = progress?.room === room.name;
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
                <span style={{ color: "#ffcc4d", fontSize: "0.7rem" }}>
                  {progress.samples}/{progress.target} samples…
                </span>
              )}
              {!isCapturing && (
                <>
                  {isCalibrated && (
                    <span style={{ color: "#1ee0c9", fontSize: "0.7rem", marginRight: "0.25rem" }}>CALIBRATED</span>
                  )}
                  <button
                    onClick={async () => {
                      if (isCalibrated) {
                        await api(`/api/calibration/${encodeURIComponent(room.name)}`, { method: "DELETE" });
                      }
                      startCalibration(room.name);
                    }}
                    style={{
                      padding: "0.25rem 0.75rem", background: isCalibrated ? "#2a3d52" : "#1ee0c9",
                      color: isCalibrated ? "#d2dfeb" : "#0c1422",
                      border: "none", borderRadius: 3, cursor: "pointer", minHeight: 44,
                      fontFamily: "ui-monospace, monospace", fontSize: "0.7rem", letterSpacing: "0.08em",
                    }}
                  >
                    {isCalibrated ? "Recalibrate" : `I'm in ${room.name}`}
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
