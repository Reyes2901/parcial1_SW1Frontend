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

  // Refs para diagramId y token: evita que connect() se re-cree cuando
  // estos valores cambian referencia sin cambiar semánticamente.
  const diagramIdRef = useRef(diagramId);
  const tokenRef = useRef(token);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { diagramIdRef.current = diagramId; }, [diagramId]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const connect = useCallback(() => {
    const currentToken = tokenRef.current;
    const currentDiagramId = diagramIdRef.current;

    if (!currentToken) {
      setState('disconnected');
      return;
    }

    // Cerrar conexión anterior si existía
    if (wsRef.current) {
      wsRef.current.onclose = null; // Evitar setState('disconnected') al cerrar manualmente
      wsRef.current.close();
      wsRef.current = null;
    }

    setState('connecting');
    const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000';
    const url = `${wsUrl}/ws/diagrams/${currentDiagramId}?token=${encodeURIComponent(currentToken)}`;
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
        // Mensajes de control JSON pasan al handler normal
      } catch { /* no es JSON, es Yjs base64 */ }
      onMessageRef.current(e.data);
    };
    ws.onclose = () => setState('disconnected');
    ws.onerror = () => setState('error');
  // connect es estable: no tiene deps del valor actual (usa refs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conectar al montar. Reconectar solo si cambia diagramId o token (valores reales).
  const prevDiagramIdRef = useRef<string | null>(null);
  const prevTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const didChange =
      prevDiagramIdRef.current !== diagramId ||
      prevTokenRef.current !== token;

    prevDiagramIdRef.current = diagramId;
    prevTokenRef.current = token;

    if (didChange) {
      connect();
    }

    return () => {
      // No cerrar en cleanup de deps: connect() ya lo hace.
      // Cerrar solo al desmontar completamente (el useEffect de abajo lo hace).
    };
  }, [diagramId, token, connect]);

  // Cleanup al desmontar
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

    // Si es JSON de control (handshake, etc.), enviarlo tal cual
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
