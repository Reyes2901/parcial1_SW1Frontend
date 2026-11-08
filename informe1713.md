# Informe 1713 — Fase 1: Instrumentación de Logs de Colaboración

**Fecha:** 2026-11-06  
**Fase:** 1 (de 4) — Instrumentación. Sin cambios de lógica.  
**Estado:** ✅ Completado. Frontend y Backend compilan sin errores TypeScript.

---

## Resumen ejecutivo

Se agregaron logs de diagnóstico en los 4 archivos indicados en `promptFix.md` Fase 1.
Cero cambios de lógica. Solo `console.log` / `console.warn` estratégicos para poder
rastrear el flujo completo de un mensaje Yjs desde que Apollon lo emite en el cliente A
hasta que el cliente B lo aplica.

---

## Archivos modificados

### 1. `Backend/src/modules/collaboration/ws.routes.ts`

| Log agregado | Dónde | Qué revela |
|---|---|---|
| `[ws-in] diagram=... len=... first40=...` | `socket.on('message', ...)` — primera línea | Si el server recibe el mensaje del cliente |
| `[ws-broadcast] diagram=... to=N peers len=...` | `broadcastBase64()` | Cuántos peers reciben el update y de qué tamaño |
| `[ws-awareness-removal] diagram=... removing=N clientIds` | `broadcastAwarenessRemoval()` | Cuántos clientIds se remueven al desconectar |
| `[ws-init-state] diagramId=... docLen=... awarenessClients=N` | `sendCurrentStateToSocket()` | Si el Y.Doc del server tiene estado al reconectar (crítico para Test C) |
| `[ws-apply-error] diagram=... err=... payloadFirst40=...` | catches de `applyAwarenessUpdate` y `Y.applyUpdate` | Si Apollon manda un formato que Yjs no reconoce |

**Cambio anterior (antes):** los catches usaban mensajes genéricos de `[ws]` y no incluían `payloadFirst40`.

---

### 2. `Frontend/src/components/uml/ApollonCanvas.tsx`

| Log agregado | Dónde | Qué revela |
|---|---|---|
| `[apollon-mount] time=...` | inicio de `handleMount` | Cuándo se monta el editor (detecta re-mounts) |
| `[apollon-out] len=... first40=... ts=...` | callback de `sendBroadcastMessage` | Que Apollon emitió un update y su tamaño |
| `[apollon-apply] editorReady=... raw=...` | inicio de `applyMessage` | Si el editor existe al momento de aplicar; si `editorReady=false` → el mensaje se encoló |
| `[apollon-apply-error]` | catch de `applyMessage` | Si falló el parse o el `receiveBroadcastedMessage` |

---

### 3. `Frontend/src/hooks/useCollaboration.ts`

| Log agregado | Dónde | Qué revela |
|---|---|---|
| `[ws-open]` | `ws.onopen` | Que la conexión WebSocket se abrió |
| `[ws-recv] len=... first40=...` | `ws.onmessage` — primera línea | Que el cliente recibió algo por WebSocket |
| `[ws-close] code=...` | `ws.onclose` | Con qué código cerró (1000=normal, 1006=abrupto) |
| `[ws-send] len=... first40=...` | inicio de `send()` | Que el cliente intentó enviar al server |

---

### 4. `Frontend/src/app/routes/editor/EditorPage.tsx`

| Log agregado | Dónde | Qué revela |
|---|---|---|
| `[editor-recv] id=... len=...` | `onMessage` callback de `useCollaboration` | Que el mensaje llegó al EditorPage (N.° secuencial) |
| `[editor-model-change] classes=N relations=M isCollab=...` | `handleModelChange` | Que el modelo cambió y si estábamos en modo colaborativo |

---

## Análisis del `apollon-adapter.ts` (Paso 1.1)

### `toApollon(model: UMLModel) → ApollonUMLModel`
Convierte el modelo de dominio MCU al formato que Apollon entiende:
- Mapea `UMLClass[]` → `ApollonNode[]` (tipo `'class'`, con atributos y métodos formateados como strings UML `+ name: Type`)
- Mapea `UMLRelation[]` → `ApollonEdge[]` (tipos como `ClassBidirectional`, `ClassInheritance`, etc.)
- Inyecta `type: 'ClassDiagram'` y `version: '4.0.0'`
- Guarda los objetos MCU originales en `data._mcuClass`, `data._mcuAttribute`, `data._mcuMethod`, `data._mcuRelation` para recuperarlos sin pérdida en `fromApollon`

**No hay lógica de reset/clear.** No toca el Y.Doc de Apollon.

### `fromApollon(apollonModel) → UMLModel`
Inversión:
- Recupera los objetos MCU de `data._mcu*` si existen; si no, parsea los strings formateados
- Preserva `width`/`height` del nodo para persistir tamaño
- **No interactúa con el Y.Doc.** Es una transformación pura de datos.

### Conclusión: el adapter NO es el origen del bug
El adapter es transformación pura (MCU ↔ Apollon). No toca Yjs, no hace `clear`, no reinicia el modelo. El flujo Yjs ocurre exclusivamente dentro de `@tumaet/apollon` (caja negra) y es orquestado por `sendBroadcastMessage` / `receiveBroadcastedMessage`.

---

## Instrucciones para Fase 2 — Test controlado

### Setup
```bash
# Terminal 1
cd Backend && npm run dev

# Terminal 2
cd Frontend && npm run dev
```

Abrir **2 navegadores distintos** (ej: Chrome normal + Chrome incógnito) en `http://localhost:5173`.  
Login con **2 usuarios distintos**. Entrar al **mismo diagrama**.  
Ambos deben mostrar: `Conectado (2 usuarios)`.

Abrir DevTools → Console en ambos. En la console del server, mantener el log visible.

---

### Test A — Un solo edit

1. En **navegador A**: esperar 3 segundos.
2. En **navegador A**: agregar UNA clase al canvas (doble click en área vacía o toolbar).
3. Esperar 3 segundos.
4. Capturar:

**Server (filtrar por):**
```
[ws-in]  [ws-broadcast]  [ws-apply-error]  [ws-init-state]
```

**Console navegador A (filtrar por):**
```
[apollon-out]  [ws-send]  [editor-model-change]
```

**Console navegador B (filtrar por):**
```
[ws-recv]  [apollon-apply]  [editor-recv]
```

---

### Test B — Mover clase existente

Mismo procedimiento pero arrastrando una clase que **ya existe** en ambos clientes (no agregando una nueva).

---

### Test C — Refresh

1. En A, agregar 2 clases.
2. Refrescar navegador B (F5).
3. Capturar: log del server (10s post-refresh, buscar `[ws-init-state]`) + console de B (`[ws-recv]`, `[apollon-apply]`, `[apollon-mount]`).

**Lo que busca este test:** si `docLen=0` en `[ws-init-state]` → el Y.Doc del server está vacío (nunca recibió el update de A). Si `docLen > 100` pero B no ve nada → el bug está en cómo B aplica el estado inicial.

---

### Test D — `receiveBroadcastedMessage` aislado (opcional)

En la console del **navegador B**, después del Test A:
1. Copiar el valor `first40=...` del log `[apollon-out]` del navegador A.
2. En React DevTools → buscar el componente `ApollonCanvasInner` → acceder a `editorRef`.
3. Si se puede acceder: llamar `editor.receiveBroadcastedMessage(<base64 completo del log de A>)`.
4. Reportar si la clase aparece en B.

Si no se puede acceder desde DevTools, saltar este test.

---

## Preguntas que responderá la Fase 3 con los logs

1. ¿El `len` en `[apollon-out]` coincide con el `len` en `[ws-in]`? Si no → algo entre `send()` y el server altera el payload.
2. ¿Aparece `[ws-broadcast] to=1`? Si `to=0` → el server perdió la referencia al socket B.
3. ¿Aparece `[ws-recv]` en B? Si no → el mensaje nunca llega a B.
4. ¿Aparece `[apollon-apply] editorReady=false`? Si sí → el mensaje llegó antes de que el editor estuviera listo (bug de cola, ya corregido con `pendingMessagesRef`).
5. ¿Aparece `[ws-apply-error]`? Si sí → Apollon manda un formato que el Y.Doc del server no puede aplicar.
6. ¿`docLen` en `[ws-init-state]` es `> 2` al hacer F5? Si es `0` o `2` → el server no tiene estado, es el bug principal del Test C.

---

## Lo que NO se cambió

- Lógica de envío/recepción de mensajes: intacta.
- Protocolo de handshake (generateInitialSyncMessage, generateInitialAwarenessSyncMessage): intacto.
- Lógica de cola de mensajes pendientes (`pendingMessagesRef`): intacta.
- Lógica de Y.applyUpdate / applyAwarenessUpdate: intacta.
- Contrato de mensajes base64: intacto.
- `apollon-adapter.ts`: no modificado.

