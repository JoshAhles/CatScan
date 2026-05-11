import { useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { serverEventSchema } from "../types/contracts";
import { useWsStore } from "../stores/wsStore";

export type ConnectionStatus = "connecting" | "open" | "closed";

const STATUS_MAP: Record<ReadyState, ConnectionStatus> = {
  [ReadyState.CONNECTING]: "connecting",
  [ReadyState.OPEN]: "open",
  [ReadyState.CLOSING]: "closed",
  [ReadyState.CLOSED]: "closed",
  [ReadyState.UNINSTANTIATED]: "connecting",
};

export function useCatScanSocket(url: string): ConnectionStatus {
  const applyEvent = useWsStore((s) => s.applyEvent);

  const onMessage = useCallback(
    (msg: MessageEvent<string>) => {
      try {
        const raw: unknown = JSON.parse(msg.data);
        const result = serverEventSchema.safeParse(raw);
        if (result.success) {
          applyEvent(result.data);
        } else {
          console.warn("[ws] invalid event", result.error.issues[0]);
        }
      } catch (e) {
        console.warn("[ws] parse error", e);
      }
    },
    [applyEvent]
  );

  const { readyState } = useWebSocket(url, {
    onMessage,
    shouldReconnect: () => true,
    reconnectAttempts: Infinity,
    reconnectInterval: 3000,
  });

  return STATUS_MAP[readyState] ?? "connecting";
}
