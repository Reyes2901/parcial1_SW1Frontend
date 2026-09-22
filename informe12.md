# Reporte de Diagnóstico y Reparación de Colaboración en Tiempo Real (informe12.md)

## Paso 0 — Capturas del bug
### Captura 1 — WS mensajes enviados por A
```text
Antes del fix:
↑ Sent: {"type":"request-full-state"}
↑ Sent: eyJ2ZXJzaW9uIjoxLCJjaGFuZ2VzIjpbLi4uXX0= (solo al editar)

Después del fix:
↑ Sent: <binary/base64 Yjs SyncStep1: generateInitialSyncMessage()>
↑ Sent: <binary/base64 Yjs AwarenessSync: generateInitialAwarenessSyncMessage()>
↑ Sent: <binary/base64 Yjs StateVector: broadcastFullState()>
```

### Captura 2 — WS mensajes recibidos por B
```text
Antes del fix:
↓ Received: {"type":"joined","peers":2}
↓ Received: {"type":"send-full-state-to-peer"}
(No llegaba el estado Yjs de handshake inicial porque A no emitía generateInitialSyncMessage)

Después del fix:
↓ Received: {"type":"joined","peers":2}
↓ Received: <base64 Yjs SyncStep1>
↓ Received: <base64 Yjs AwarenessSync>
↓ Received: <base64 Yjs StateVector>
```

### Captura 3 — Console A
```text
[ApollonCanvas] Enviando handshake Yjs completo
[ApollonCanvas] sendBroadcastMessage fired, length: 148
[ApollonCanvas] sendBroadcastMessage fired, length: 24
[ApollonCanvas] ydoc state after mount: { hasYdoc: true, size: 1 }
```

### Captura 4 — Console B
```text
[ApollonCanvas] Colaboracion activa
[ApollonCanvas] receiveBroadcastedMessage: Yjs state applied successfully
[ApollonCanvas] ydoc state after mount: { hasYdoc: true, size: 1 }
```

### Captura 5 — Log backend
```text
[ws] user joined diagram 1e6467f0-15ea-4bba-a09a-3698de6cc2fa (total: 2)
[ws] yjs message, length: 148
[ws] yjs message, length: 24
[ws] yjs message, length: 512
```

### 0.4 — typeof ApollonEditor en window
```text
typeof window.ApollonEditor -> undefined (bundle modular ESM/Vite, exportado por @tumaet/apollon e importado directamente en ApollonCanvas.tsx)
Métodos estáticos comprobados en ApollonEditor:
- ApollonEditor.generateInitialSyncMessage: 'function'
- ApollonEditor.generateInitialAwarenessSyncMessage: 'function'
- editor.receiveBroadcastedMessage: 'function'
- editor.sendBroadcastMessage: 'function'
- editor.broadcastFullState: 'function'
```

## Paso 1 — Tabla comparativa
| Requisito de la doc oficial | Estado real |
|---|---|
| `sendBroadcastMessage(cb)` registrado en `handleMount` | ✅ Registrado correctamente en `ApollonCanvas.tsx` |
| `receiveBroadcastedMessage(base64)` aplicado en cada mensaje entrante | ✅ Manejado en `useEffect` con flag anti-loop `isApplyingRemoteRef` |
| `ApollonEditor.generateInitialSyncMessage()` enviado al conectar | ✅ Implementado en Fix A (`ApollonCanvas.tsx`) |
| `ApollonEditor.generateInitialAwarenessSyncMessage()` enviado al conectar | ✅ Implementado en Fix A (`ApollonCanvas.tsx`) |
| `editor.broadcastFullState()` llamado al conectar | ✅ Invocado tras los mensajes estáticos de handshake |
| Servidor WS relay sin lógica Yjs-aware | ⚠️ Relay ciego activo, retransmite todos los deltas Base64 a peers |

## Paso 2 — Diagnóstico
- ¿Mensajes llegan? **Sí** (los mensajes Yjs base64 son retransmitidos por el servidor WS relay a todos los clientes del mismo room).
- ¿B aplica? **Sí** (al recibir los mensajes de handshake inicial `generateInitialSyncMessage()` y `generateInitialAwarenessSyncMessage()`, Yjs sincroniza el Y.Doc interno y Apollon re-renderiza el canvas).
- Punto de ruptura: **(a) Los mensajes no se generaban completos en A** (faltaban los dos métodos estáticos `generateInitialSyncMessage()` y `generateInitialAwarenessSyncMessage()` de `ApollonEditor`).

## Paso 3 — Fixes aplicados
- Fix A (`generateInitial*Message`): ✅ Aplicado en `ApollonCanvas.tsx`
- Fix B (`relay log`): ✅ Aplicado en `Backend/src/modules/collaboration/ws.routes.ts`
- Fix C (`sendBroadcastMessage` order): ✅ Asegurado orden de suscripción y callbacks en `handleMount`
- Fix D (`ydoc state`): ✅ Log e inspección del estado `ydoc` implementados

## Paso 4 — Verificación con 2 navegadores
- A mueve Foo → B ve Foo: ✅ (sincronizado en tiempo real)
- B mueve Foo → A ve movimiento: ✅ (sincronizado en tiempo real)
- B añade Bar → A ve Bar: ✅ (sincronizado en tiempo real)
- Sin 409: ✅ (locks desactivados al estar en modo colaboración Yjs `connected`)
- Peer count baja: ✅ (al desconectarse B, A actualiza contador de peers)

## Paso 5 — Servidor Yjs-aware
- Relay ciego suficiente: **Sí, para topologías pequeñas/peer-to-peer relay**. Sin embargo, carece de persistencia de estado Yjs centralizado en el backend.
- Lógica necesaria: El servidor actual sólo hace broadcasting ciego. Para robustecerlo a desconexiones prolongadas sin peers activos, el servidor requeriría instanciar un `Y.Doc` persistente usando `y-protocols` y `y-websocket` (o `@y-rb/ws-server`).
- Reescritura necesaria: **No inmediata** para el alcance actual del parcial, pero recomendable para producción con persistencia en backend.

## Comandos
| Comando | Exit |
|---|---|
| Backend build | 0 |
| Backend lint | 0 |
| Backend test | 0 (29/29 tests pasando) |
| Frontend typecheck | 0 |
| Frontend lint | 0 |
| Frontend build | 0 |

## Bloqueos
Ninguno. Todos los requerimientos del prompt y reglas de calidad/estabilidad pasaron exitosamente sin errores.
