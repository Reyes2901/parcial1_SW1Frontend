CONTEXTO
Proyecto: C:\Users\Toshiba\Desktop\SW1_parcial1. El colaborativo del canvas (Yjs + @tumaet/apollon) no funciona. Ya se instrumentó con logs y se ejecutaron Tests A/B/C con 2 navegadores. Los logs completos del cliente A, cliente B y servidor están en el chat del usuario.

DIAGNÓSTICO (confirmado por logs, no es hipótesis)
Bug 1 — lib0 roto en el servidor
Evidencia:

text
[ws-init-state] diagramId=852d9218... docLen=2 awarenessClients=1   ← doc SIEMPRE vacío
[ws-apply-error] err=contentRefs[(info & binary__namespace.BITS5)] is not a function
[ws-init-state] docLen=2 en todas las conexiones. 2 = Y.encodeStateAsUpdate(new Y.Doc()). El servidor nunca almacena estado.

Y.applyUpdate y applyAwarenessUpdate fallan en el 100% de los mensajes con error contentRefs[...] is not a function.

El error viene de lib0/decoding.js → readVarUint → contentRefs[(info & binary.BITS5)]. Significa que contentRefs[BITS5] no está inicializado. lib0 no está funcionando en runtime aunque compile.

Verificación ya hecha:

text
npm ls lib0        → lib0@0.2.119 (deduplicado)
npm ls yjs         → yjs@13.6.33
npm ls y-protocols → y-protocols@1.0.7
Una sola versión de cada uno, deduplicados. Aun así falla en runtime.

Hipótesis concretas (en orden de probabilidad):

lib0@0.2.119 + yjs@13.6.33 son incompatibles en runtime aunque semver diga lo contrario — hay precedentes de bugs específicos entre esas versiones exactas.

tsconfig.json del backend rompe la resolución de módulos — esModuleInterop, module, target, o moduleResolution mal configurados hacen que import * as decoding from 'lib0/decoding' se resuelva a algo distinto en compile vs runtime.

node_modules corrupto — instalación previa interrumpida o cache inconsistente.

Bug 2 — Doble-envoltura de mensajes
Evidencia:

text
Cliente A: [apollon-out] len=8564 first40=AQEMnvTrWgAoAQ9kaWFncmFt
Servidor:  [ws-in]      len=8586 first40={"diagramData":"AQEMu6K6uAkA     ← single-wrap, OK
Servidor:  [ws-broadcast] len=8586                                        ← single-wrap, OK
Cliente B: [ws-recv]    len=11462 first40={"diagramData":"eyJkaWFncmFtRGF0YSI6  ← DOBLE-WRAP
El first40 en B decodifica como base64 de {"diagramData":. Los 11462 bytes son base64(base64(json(update))). El cliente B intenta aplicar un JSON-como-base64-como-Yjs → falla silenciosamente.

Causa probable: el handler socket.on('message') del servidor, al relayar un mensaje JSON con diagramData, lo re-envuelve. O ApollonCanvas.applyMessage hace doble parse en el recv.

RESTRICCIONES
Cambios mínimos y quirúrgicos. Un cambio por iteración.

Sin reescribir ws.routes.ts completo. Sin cambiar la arquitectura.

Sin tocar @tumaet/apollon.

Documentar cada paso con evidencia (comando ejecutado → output → conclusión).

Español, directo, sin disculpas.

FASE 1 — Aislar el bug de lib0 (sin tocar el proyecto)
Paso 1.1 — Script de test aislado
Crear Backend/test-yjs.js en la raíz del backend:

javascript
// test-yjs.js
const Y = require('yjs');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');

console.log('=== lib0 + yjs smoke test ===');

// Test 1: readVarUint de un byte
const enc = encoding.createEncoder();
encoding.writeVarUint(enc, 42);
const bytes = encoding.toUint8Array(enc);
console.log('Encoded 42 as:', Array.from(bytes));

try {
  const dec = decoding.createDecoder(bytes);
  const value = decoding.readVarUint(dec);
  console.log('Decoded back:', value, value === 42 ? '✅' : '❌');
} catch (e) {
  console.log('DECODE FAILED:', e.message, '❌');
}

// Test 2: Y.applyUpdate
const doc1 = new Y.Doc();
doc1.getMap('test').set('key', 'value');
const update = Y.encodeStateAsUpdate(doc1);
console.log('Yjs update length:', update.length);

const doc2 = new Y.Doc();
try {
  Y.applyUpdate(doc2, update);
  console.log('Y.applyUpdate:', doc2.getMap('test').get('key') === 'value' ? '✅' : '❌');
} catch (e) {
  console.log('Y.applyUpdate FAILED:', e.message, '❌');
}

// Test 3: awareness
const awareness = require('y-protocols/awareness');
const aw1 = new awareness.Awareness(doc1);
aw1.setLocalState({ name: 'test' });
const awUpdate = awareness.encodeAwarenessUpdate(aw1, [doc1.clientID]);
console.log('Awareness update length:', awUpdate.length);

const aw2 = new awareness.Awareness(doc2);
try {
  awareness.applyAwarenessUpdate(aw2, awUpdate, 'remote');
  console.log('applyAwarenessUpdate:', '✅');
} catch (e) {
  console.log('applyAwarenessUpdate FAILED:', e.message, '❌');
}
Ejecutar: cd Backend && node test-yjs.js

Interpretación:

Si los 3 tests dan ✅ → lib0 funciona en script aislado. El problema está en cómo tsc compila o cómo Node carga los módulos en dist/server.js.

Si test 1 o 2 dan ❌ → lib0 + yjs están rotos a nivel paquete. Fix = pin de versiones.

Si test 3 da ❌ pero 1 y 2 ✅ → y-protocols específicamente tiene incompatibilidad.

Paso 1.2 — Según resultado de Fase 1
Si Fase 1 falla en test 1 o 2:

bash
cd Backend
npm install lib0@0.2.99 yjs@13.6.31 y-protocols@1.0.6 --save-exact
node test-yjs.js
Si con esas versiones da ✅, pinear en package.json sin ^:

json
"lib0": "0.2.99",
"yjs": "13.6.31",
"y-protocols": "1.0.6"
Y agregar overrides:

json
"overrides": {
  "lib0": "0.2.99",
  "yjs": "13.6.31",
  "y-protocols": "1.0.6"
}
Reinstalar con npm ci. Re-ejecutar test.

Si Fase 1 pasa en script aislado pero falla en dist/server.js:

El problema es tsc. Revisar Backend/tsconfig.json:

"module": debe ser "commonjs" o "node16" (no "esnext")

"esModuleInterop": true

"moduleResolution": "node" o "node16"

Agregar log al arranque de server.js:

javascript
import * as decoding from 'lib0/decoding';
console.log('[lib0-check] readVarUint is function:', typeof decoding.readVarUint);
Si typeof es undefined → el import * as está generando { default: { readVarUint } } en vez de { readVarUint }. Fix: cambiar a import * as decoding from 'lib0/decoding.js' (con .js) o cambiar esModuleInterop/module.

FASE 2 — Aislar el bug de doble-wrap
Paso 2.1 — Identificar dónde se dobla
En el servidor, agregar log temporal en socket.on('message') (si no está ya):

javascript
socket.on('message', (raw) => {
  const msg = raw.toString('utf-8');
  const len = msg.length;
  const first = msg.slice(0, 40);
  console.log(`[ws-in-debug] len=${len} first=${first}`);
  // ... resto del handler
});
En el cliente, en applyMessage:

javascript
console.log(`[apollon-apply-debug] raw=${raw.slice(0, 60)} len=${raw.length}`);
Ejecutar Test A (agregar 1 clase en A, capturar logs en server y en B).

Comparación:

Métrica	Server recibe de A	Server manda a B	B recibe
len	X	Y	Z
Si Z === Y → no hay doble-wrap en el relay. El bug está en applyMessage que doble-parsea en B.

Si Z > Y → el relay del server está envolviendo.

Si Y > X → el server envuelve al reenviar.

Paso 2.2 — Fix según resultado
Si Y > X (server envuelve al reenviar):

En ws.routes.ts, cuando recibe {diagramData: b64}, el handler actual decodifica a bytes, aplica al doc, y rebroadcast envuelve de nuevo con envelopeBase64(payload). Pero el payload ya era bytes decodificados del base64 original. Si el payload original era JSON, ahora es bytes de JSON, y se re-envuelve en base64. Doble wrap.

Fix: guardar el mensaje original (message string) y relayarlo tal cual, sin re-envolver:

typescript
// Cuando se recibe un JSON con diagramData, relayar el mensaje original
if (jsonEnvelope && typeof jsonEnvelope.diagramData === 'string') {
  // ... apply al doc, etc
  broadcastRaw(diagramId, message, socket);  // ← relayar el mensaje original
  return;
}
Si Z > Y (B recibe doble-wrap aunque server mandó single-wrap):

El bug está en useCollaboration.onmessage o en applyMessage. Revisar el log de [ws-recv] en B:

text
len=11462 first40={"diagramData":"eyJkaWFncmFtRGF0YSI6
len=11462 para un mensaje que el server mandó con len=8586. El +2876 es base64 extra. Es doble-wrap. ¿Dónde? Probablemente en useCollaboration.onmessage que recibe e.data, lo procesa, y luego onMessage lo vuelve a envolver. Revisar el código de useCollaboration.ts línea por línea.

FASE 3 — Verificación final
Después de aplicar los fixes de Fase 1 y Fase 2, correr:

Test A: 2 clientes, A agrega 1 clase → B debe verla en <1s.

Verificar en logs del server:

[ws-init-state] docLen= debe ser > 2 después de que A haga la primera edición (antes de que B se conecte o después de que se reconecte).

NO debe aparecer [ws-apply-error] en ningún mensaje.

Los len en [ws-in], [ws-broadcast] y [ws-recv] deben ser consistentes para el mismo update.

Test B: A agrega clase, B agrega clase distinta, esperar 15s (para que el interval PUT corra), refrescar B → B debe ver ambas clases.

Test C: A arrastra una clase → B la ve moverse.

Test D: A y B conectados con cambios → B cierra pestaña → B reabre → B ve todos los cambios.

CRITERIOS DE ÉXITO
□ Script test-yjs.js da ✅ en los 3 tests.
□ Server log: docLen > 2 después de una edición.
□ Server log: cero [ws-apply-error] en 5 minutos de uso.
□ Cliente B: [ws-recv] no tiene doble-wrap (len coincide con server).
□ Test A: sync < 1s.
□ Test B: refresh no pierde cambios.
□ Test C: drag sincroniza.
□ Test D: reconexión recupera estado.
LO QUE NO DEBE HACER EL AGENTE
No reescribir ws.routes.ts completo.

No eliminar Yjs del servidor (el server debe mantener su Y.Doc funcional).

No cambiar la arquitectura.

No proponer "relay puro" (ya se intentó y rompió más).

No dar disculpas. No relleno. Solo diagnóstico + código + verificación.

