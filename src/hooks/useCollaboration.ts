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
  const [initialPeerCount, setInitialPeerCount] = useState<number | null>(null);
  const onMessageRef = useRef(onMessage);

  const diagramIdRef = useRef(diagramId);
  const tokenRef = useRef(token);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { diagramIdRef.current = diagramId; }, [diagramId]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Reset del initialPeerCount SOLO al cambiar diagrama. Nunca al reconectar.
  useEffect(() => {
    setInitialPeerCount(null);
  }, [diagramId]);

  const connect = useCallback(() => {
    const currentToken = tokenRef.current;
    const currentDiagramId = diagramIdRef.current;

    if (!currentToken) {
      setState('disconnected');
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setState('connecting');
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000';
    const url = `${wsUrl}/ws/diagrams/${currentDiagramId}?token=${encodeURIComponent(currentToken)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ws-open]');
      setState('connected');
    };
    ws.onmessage = (e) => {
      console.log(`[ws-recv] len=${e.data.length} first40=${String(e.data).slice(0, 40)}`);
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === 'joined') {
          const peers = parsed.peers as number;
          setPeerCount(peers);
          // Capturar SOLO el primer joined de esta conexión inicial.
          setInitialPeerCount((prev) => (prev === null ? peers : prev));
          return;
        }
      } catch { /* no es JSON */ }
      onMessageRef.current(e.data);
    };
    ws.onclose = (e) => {
      console.log(`[ws-close] code=${e.code}`);
      setState('disconnected');
      // NO resetear initialPeerCount aquí.
    };
    ws.onerror = () => {
      setState('error');
      // NO resetear initialPeerCount aquí.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevDiagramIdRef = useRef<string | null>(null);
  const prevTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const didChange =
      prevDiagramIdRef.current !== diagramId ||
      prevTokenRef.current !== token;
    prevDiagramIdRef.current = diagramId;
    prevTokenRef.current = token;
    if (didChange) connect();
  }, [diagramId, token, connect]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    console.log(`[ws-send] len=${data.length} first40=${data.slice(0, 40)}`);
    try {
      JSON.parse(data);
      wsRef.current.send(data);
      return;
    } catch {
      wsRef.current.send(JSON.stringify({ diagramData: data }));
    }
  }, []);

  return { state, peerCount, initialPeerCount, send, reconnect: connect };
}