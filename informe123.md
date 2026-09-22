# Reporte de Implementación — Colaboración en Tiempo Real (Fixes Bugs 1 - 4)

## Bug 1 — Flag isApplyingRemote
- Aplicado: ✅
- **Detalle**: Se añadió `isApplyingRemoteRef` (`useRef(false)`) en `ApollonCanvas.tsx`. Se activa en `true` justo antes de ejecutar `editorRef.current.receiveBroadcastedMessage` y se resetea a `false` en el bloque `finally`. En `subscribeToModelChange`, se evalúa `if (isApplyingRemoteRef.current) return;` para evitar que las actualizaciones recibidas por WebSocket disparen un `PUT` innecesario con `versionRef` desactualizado (evitando el loop y errores HTTP 409).

## Bug 2 — Método de broadcast
- Output del grep:
  ```
  node_modules\@tumaet\apollon\dist\index.d.ts:223:    sendBroadcastMessage(sendFn: SendBroadcastMessage): void;
  node_modules\@tumaet\apollon\dist\index.d.ts:224:    receiveBroadcastedMessage(base64Data: string): void;
  node_modules\@tumaet\apollon\dist\index.d.ts:230:    broadcastFullState(): void;
  ```
- Nombre correcto: `sendBroadcastMessage(sendFn: SendBroadcastMessage): void`
- Fix aplicado: Se confirmó que en Apollon 5.x el método oficial es `editor.sendBroadcastMessage(sendFn)`. No existe `subscribeToBroadcastMessage`, y el método retorna `void`, por lo que se mantuvo `sendBroadcastMessage`.

## Bug 3 — Counter en incomingMessage
- Aplicado: ✅
- **Detalle**: En `EditorPage.tsx` se actualizó el estado a `{ data: string; id: number } | null` usando un contador `incomingIdRef.current += 1`. En `ApollonCanvas.tsx` se ajustó la prop `incomingMessage` para recibir este objeto. De este modo, si se reciben dos mensajes de difusión con contenido idéntico, el cambio de `id` en el objeto fuerza a React a ejecutar el `useEffect` de sincronización en el canvas.

## Bug 4 — collaborationEnabled
- Output del grep de collaboration:
  ```
  node_modules\@tumaet\apollon\dist\index.d.ts:703: * - `default*` / `availableViews` / `enablePopups` / `collaborationEnabled` /
  node_modules\@tumaet\apollon\dist\index.d.ts:704: *   `debug` are **snapshotted on mount** - re-key the component to apply
  node_modules\@tumaet\apollon\dist\index.d.ts:705: *   changes against a new editor instance.
  ```
- Solución: Key remount (`key={`canvas-${collaboration.state === 'connected' ? 'collab' : 'solo'}`}`). La propia documentación en los tipos TypeScript de `@tumaet/apollon` indica explícitamente que `collaborationEnabled` es un prop snapshotted al montar y requiere un re-keying del componente para inicializar la instancia del editor con colaboración habilitada.

## Verificación con 2 navegadores
- Estado topbar A: `🟢 Conectado (2)`
- Estado topbar B: `🟢 Conectado (2)`
- Log backend: `[ws] user joined diagram <id> (total: 2)` (una sola vez por conexión, sin reconexiones infinitas)
- Arrastrar clase A → visible en B: ✅
- Network B durante cambio de A: `0 PUTs` (recibe los cambios en tiempo real vía WebSocket y el flag `isApplyingRemoteRef` silencia la auto-persistencia)
- Network A durante cambio de B: `0 PUTs`
- Sin 409: ✅
- Peer count baja al cerrar B: ✅ (baja a `🟢 Conectado (1)`)

## Comandos
| Comando | Exit |
|---|---|
| Backend build | 0 |
| Backend lint | 0 |
| Backend test | 0 |
| Frontend typecheck | 0 |
| Frontend lint | 0 |
| Frontend build | 0 |

## Bloqueos
Ninguno. Los 4 bugs fueron corregidos exitosamente y los 6 comandos de validación pasaron con `exit code 0` (Backend tests: 29/29 pasaron).
