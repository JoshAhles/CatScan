import { useState } from "react";
import { useWsStore } from "../../stores/wsStore";
import { api } from "../../api/client";

export function NodeNamer() {
  const nodes = useWsStore((s) => s.nodes);
  const unnamed = nodes.filter((n) => n.roomName === null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  async function handleSave(nodeId: string) {
    const name = names[nodeId]?.trim();
    if (!name) return;
    setSaving((s) => ({ ...s, [nodeId]: true }));
    try {
      await api(`/api/nodes/${nodeId}`, { method: "PATCH", body: JSON.stringify({ roomName: name }) });
    } finally {
      setSaving((s) => ({ ...s, [nodeId]: false }));
    }
  }

  if (unnamed.length === 0) {
    return (
      <p style={{ color: "#6a8090", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
        All nodes are named.
      </p>
    );
  }

  return (
    <div>
      <h3 style={{ color: "#1ee0c9", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        Unnamed Nodes
      </h3>
      {unnamed.map((node) => (
        <div key={node.id} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", color: "#6a8090", flex: 1 }}>
            {node.id}
          </span>
          <input
            value={names[node.id] ?? ""}
            onChange={(e) => setNames((n) => ({ ...n, [node.id]: e.target.value }))}
            placeholder="Room name"
            style={{
              background: "#0d1520", border: "1px solid #1a2d3a", color: "#c8d8e8",
              padding: "0.25rem 0.5rem", borderRadius: 3, fontFamily: "ui-monospace, monospace", fontSize: "0.75rem",
              minHeight: 44,
            }}
          />
          <button
            onClick={() => handleSave(node.id)}
            disabled={saving[node.id]}
            style={{
              padding: "0.25rem 0.75rem", background: "#1ee0c9", color: "#06080d",
              border: "none", borderRadius: 3, cursor: "pointer", minHeight: 44,
              fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", letterSpacing: "0.08em",
            }}
          >
            {saving[node.id] ? "…" : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
