import { useEffect, useRef, useState, useCallback } from 'react';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface CollaborationOptions {
  diagramId: string;
  token: string | null;
  onMessage: (data: string) => void;
}

export function useCollaboration({ diagramId, token, onMessage }: CollaborationOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<ConnectionState>('connecting');
  const [peerCount, setPeerCount] = useState(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (!token) {
      setState('disconnected');
      return;
    }
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000';
    const url = `${wsUrl}/ws/diagrams/${diagramId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setState('connected');
    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === 'joined') {
          setPeerCount(parsed.peers);
          return;
        }
      } catch { /* no es JSON, es Yjs */ }
      onMessageRef.current(e.data);
    };
    ws.onclose = () => setState('disconnected');
    ws.onerror = () => setState('error');
  }, [diagramId, token]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    // Si es JSON de control (request-full-state), enviarlo tal cual
    try {
      JSON.parse(data);
      wsRef.current.send(data);
      return;
    } catch {
      // No es JSON → es Yjs base64 → envolver en el envelope del servidor
      wsRef.current.send(JSON.stringify({ diagramData: data }));
    }
  }, []);

  return { state, peerCount, send, reconnect: connect };
}
