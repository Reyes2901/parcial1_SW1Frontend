MIGRACIÓN DE APOLLON A BESSER WME — PROYECTO SW1_PARCIAL1

═══════════════════════════════════════════════════════════
CONTEXTO DEL PROYECTO
═══════════════════════════════════════════════════════════

Raíz del proyecto Frontend: C:\Users\Toshiba\Desktop\SW1_parcial1\Frontend
Raíz del proyecto Backend:  C:\Users\Toshiba\Desktop\SW1_parcial1\Backend
Repo BESSER WME clonado en: C:\Users\Toshiba\Desktop\bessed\BESSER-Web-Modeling-Editor (SOLO LECTURA, referencia)

Stack Frontend:
- React 19.0.0
- Vite 5.4.8
- TypeScript 5.5.4
- Zustand, TanStack Query
- @besser/wme (recién instalado, reemplaza @tumaet/apollon que ya fue desinstalado)

Stack Backend:
- Node 20+, Fastify 4.26.1
- Prisma 5.11.0, PostgreSQL
- @fastify/websocket

DECISIÓN TOMADA Y VERIFICADA POR EVIDENCIA:
Se reemplaza @tumaet/apollon@5.5.0 (ROTO, causa corrupción de datos vía Yjs) por @besser/wme (funcional, SIN Yjs, colaboración vía JSON Patch). El análisis está cerrado — NO cuestionar la decisión, NO proponer volver a Apollon, NO proponer React Flow, NO proponer polling ni remount por key.

═══════════════════════════════════════════════════════════
EVIDENCIA DURA DEL ANÁLISIS PREVIO (NO RE-DESCUBRIR)
═══════════════════════════════════════════════════════════

1. BESSER WME NO USA YJS. Evidencia:
   grep "\bY\.|yjs|Y\.Doc|y-protocols|clientID|awareness" en packages/editor/src
   → Único match: `(y) => y.id === x.id` en svg.tsx:109 (arrow function, falso positivo).
   Esto significa que el bug `classes=N → classes=0` que sufríamos con Apollon
   NO PUEDE ocurrir en BESSER WME. Es arquitectónicamente imposible.

2. BESSER WME RESOLVIÓ EL WARNING DE REACT 19. Evidencia:
   packages/webapp/src/main/features/editors/uml/ApollonEditorComponent.tsx:38-62
   
   const pendingDestroyRef = useRef<Promise<void>>(Promise.resolve());
   const destroyEditorDeferred = useCallback((editor: ApollonEditor) => {
     const run = pendingDestroyRef.current.then(
       () => new Promise<void>((resolve) => {
         // Defer destroy to avoid React unmount race warnings during render transitions.
         setTimeout(() => {
           try { editor.destroy(); } catch (e) { console.warn(e); } finally { resolve(); }
         }, 0);
       }),
     );
     pendingDestroyRef.current = run;
     return run;
   }, []);
   
   Este patrón DEBE copiarse tal cual en nuestra integración.

3. API PÚBLICA de BESSER WME (verificada en packages/editor/src/main/apollon-editor.ts):
   - new ApollonEditor(container, options)
   - editor.nextRender (Promise)
   - editor.subscribeToModelChange(cb)
   - editor.subscribeToModelChangePatches(cb)          ← para colaboración
   - editor.subscribeToModelContinuousChangePatches(cb) ← cambios durante drag
   - editor.importPatch(patch)                          ← aplicar cambio remoto
   - editor.remoteSelect(selection)
   - editor.pruneRemoteSelectors()
   - editor.destroy()
   - ApollonEditor.generateInitialSyncMessage() (verificar si sigue existiendo)

4. BACKEND NO SE TOCA. ws.routes.ts es relay puro de mensajes. Sigue funcionando
   sin cambios porque los patches son mensajes JSON igual que antes.

5. NO SE ENCONTRÓ implementación de colaboración en packages/webapp/src/main/features/
   con patrón "*collab*". BÚSQUEDA OBLIGATORIA por el agente (ver Fase 0).

═══════════════════════════════════════════════════════════
REGLAS ABSOLUTAS — NO NEGOCIABLES
═══════════════════════════════════════════════════════════

R1. EVIDENCIA O NO EXISTE. Cada afirmación sobre código cita ruta + línea + fragmento.
    No adivinar. No "creo que". No "probablemente".

R2. LEER ANTES DE TOCAR. No modificar ningún archivo sin haberlo leído completo.

R3. UN CAMBIO POR ITERACIÓN cuando algo falla. Si un build rompe, revertir el último
    cambio, arreglar, y volver a probar. No acumular cambios rotos.

R4. NO PROPONER SOLUCIONES PALIATIVAS:
    - No polling cada N segundos.
    - No remount por key para forzar refresh.
    - No "volver a Apollon".
    - No "cambiar a React Flow" (ya se evaluó, es 42-80h).
    - No "downgrade a React 18" (rompe @base-ui/react, ya probado).
    - No "apagar StrictMode".

R5. SI ALGO NO ESTÁ CLARO, PREGUNTAR ANTES DE ESCRIBIR CÓDIGO.
    No inventar APIs que no existen. Verificar firmas con .d.ts o código fuente.

R6. VERIFICAR CON tsc --noEmit DESPUÉS DE CADA FASE. Si hay errores, arreglarlos
    antes de avanzar. No dejar el proyecto a medio compilar.

R7. NO TOCAR Backend/. Es relay puro y funciona. Cualquier cambio al backend
    requiere justificación explícita con evidencia de que es necesario.

═══════════════════════════════════════════════════════════
FASE 0 — BÚSQUEDAS OBLIGATORIAS (antes de tocar código)
═══════════════════════════════════════════════════════════

El agente DEBE ejecutar estas búsquedas y reportar resultados ANTES de proponer
cualquier cambio. El repo BESSER clonado tiene la respuesta.

A) Buscar dónde BESSER implementa la colaboración real:
   cd C:\Users\Toshiba\Desktop\bessed\BESSER-Web-Modeling-Editor
   Get-ChildItem -Path packages\webapp\src -Recurse -Include *.ts,*.tsx |
     Select-String -Pattern "importPatch|subscribeToModelChangePatches|remoteSelect|pruneRemoteSelectors" -List

B) Buscar el transporte (WebSocket, ShareDB, o lo que usen):
   Get-ChildItem -Path packages\webapp\src -Recurse -Include *.ts,*.tsx |
     Select-String -Pattern "new WebSocket|shareDB|ShareDB|share-db|WebsocketProvider" -List

C) Buscar si hay Yjs en el WEBBAPP (no en el editor):
   Get-ChildItem -Path packages\webapp\src -Recurse -Include *.ts,*.tsx |
     Select-String -Pattern "from 'yjs'|from \"yjs\"|Y\.Doc" -List

D) Listar todos los archivos de collaboration/ (puede estar con otro nombre):
   Get-ChildItem -Path packages\webapp\src -Recurse -Directory | 
     Where-Object { $_.Name -match "collab|share|sync|live|realtime|coedit" }

E) Ver la firma exacta de los métodos de patch en el editor:
   Get-Content packages\editor\src\main\apollon-editor.ts | 
     Select-String -Pattern "subscribeToModelChangePatches|importPatch|remoteSelect|pruneRemoteSelectors" -Context 2,10

REPORTAR: rutas completas de los archivos encontrados, fragmentos de código,
y si la colaboración de BESSER es Yjs-based o JSON Patch-based. Con esa información
decidir el approach para nuestra colaboración.

Si BESSER webapp usa Yjs internamente → NO usarlo como referencia para nuestra
colaboración. Usar la API de patches directamente (importPatch + subscribeToModelChangePatches)
sobre nuestro WS existente.

═══════════════════════════════════════════════════════════
ARCHIVOS A LEER COMPLETOS (obligatorio antes de Fase 1)
═══════════════════════════════════════════════════════════

Frontend:
- package.json (confirmar @besser/wme versión instalada)
- src/main.tsx (¿StrictMode?)
- src/components/uml/ApollonCanvas.tsx (estado actual, será reemplazado)
- src/components/uml/InspectorPanel.tsx (¿toca Apollon?)
- src/app/routes/editor/EditorPage.tsx (estado actual)
- src/hooks/useCollaboration.ts (estado actual)
- src/hooks/useDiagram.ts (interfaz de guardado)
- src/adapters/apollon-adapter.ts (transformación UMLModel ↔ formato Apollon)
- src/domain/uml-model.ts (tipos del dominio)
- src/domain/uml-command.ts

Backend (solo lectura, no tocar):
- src/modules/collaboration/ws.routes.ts (entender el protocolo actual)

Referencia BESSER (lectura):
- packages/editor/src/main/apollon-editor.ts (API completa)
- packages/webapp/src/main/features/editors/uml/ApollonEditorComponent.tsx (patrón defer destroy)
- packages/editor/package.json (peer deps, versión de React soportada)
- packages/webapp/src/main/features/collaboration/** (si existe tras Fase 0)

═══════════════════════════════════════════════════════════
FASE 1 — INSTALACIÓN Y VERIFICACIÓN DEL PAQUETE
═══════════════════════════════════════════════════════════

Ya está instalado @besser/wme. Verificar:

   cd C:\Users\Toshiba\Desktop\SW1_parcial1\Frontend
   npm ls @besser/wme
   npm ls react react-dom

Reportar versión exacta instalada de @besser/wme.

Verificar que el paquete exporta lo que necesitamos:
   Get-Content node_modules\@besser\wme\dist\index.d.ts |
     Select-String -Pattern "ApollonEditor|UMLModel|UMLDiagramType|subscribeToModelChangePatches|importPatch"

Si el archivo .d.ts no está en dist/, buscar:
   Get-ChildItem -Path node_modules\@besser\wme -Recurse -Filter "*.d.ts" |
     Where-Object { $_.FullName -notmatch "node_modules.*node_modules" }

═══════════════════════════════════════════════════════════
FASE 2 — MIGRACIÓN DEL ADAPTER (apollon-adapter.ts)
═══════════════════════════════════════════════════════════

El adapter convierte UMLModel (dominio) ↔ Apollon.UMLModel (librería).

Acciones:
1. Cambiar imports de '@tumaet/apollon' a '@besser/wme'.
2. Verificar si los tipos ApollonNode, ApollonEdge, DiagramEdgeType, UMLModel
   son idénticos en ambas librerías. Si son idénticos → no tocar nada más.
   Si difieren → reportar exactamente qué cambió con evidencia (ruta + línea).
3. Verificar que toApollon y fromApollon siguen compilando.
4. Ejecutar: npx tsc --noEmit y reportar resultado.

NO cambiar la lógica del adapter en esta fase. Solo imports. Si hay errores
de tipos, reportarlos ANTES de modificar la lógica.

═══════════════════════════════════════════════════════════
FASE 3 — REESCRITURA DE ApollonCanvas.tsx
═══════════════════════════════════════════════════════════

Reemplazar el archivo completo con una versión que:

1. Use `Apollon` (componente React) o `ApollonEditor` (clase, como hace BESSER
   en ApollonEditorComponent.tsx). PREFERIR la clase para control explícito.

2. Implemente el patrón defer destroy copiado literal de BESSER:

   const pendingDestroyRef = useRef<Promise<void>>(Promise.resolve());
   
   const destroyEditorDeferred = useCallback((editor: ApollonEditor) => {
     const run = pendingDestroyRef.current.then(
       () => new Promise<void>((resolve) => {
         setTimeout(() => {
           try { editor.destroy(); } catch (e) { console.warn('[apollon-destroy]', e); } finally { resolve(); }
         }, 0);
       }),
     );
     pendingDestroyRef.current = run;
     return run;
   }, []);

3. En el useEffect de mount:
   - Crear `new ApollonEditor(containerRef.current, { type: UMLDiagramType.ClassDiagram, mode: ApollonMode.Modelling, readonly: false, enablePopups: true, ... })`
   - await editor.nextRender
   - Suscribirse a model change con `subscribeToModelChange(cb)` → onModelChange(fromApollon(model))
   - Suscribirse a selection change si la API lo permite
   - Notificar al padre con onEditorReady(editor)

4. En el cleanup:
   - Unsubscribe primero
   - await destroyEditorDeferred(editor)
   - onEditorReady(null) para que el padre encole mensajes

5. Props de ApollonCanvas (nuevas):
   - initialModel: UMLModel | undefined
   - onModelChange: (model: UMLModel) => void
   - onEditorReady?: (editor: ApollonEditor | null) => void
   - readOnly?: boolean
   - collaborationEnabled?: boolean

6. NO incluir la prop `incomingMessage`. La aplicación de patches remotos
   se hace vía `editorRef.importPatch(patch)` desde EditorPage (ver Fase 5).

7. Loguear [apollon-mount] time=... y [apollon-destroy] time=... para diagnóstico.

8. Memoizar el componente con React.memo comparando initialModel.id, readOnly,
   onModelChange, onEditorReady.

Ejecutar tsc --noEmit. Reportar resultado.

═══════════════════════════════════════════════════════════
FASE 4 — ACTUALIZACIÓN DE EditorPage.tsx
═══════════════════════════════════════════════════════════

Cambios necesarios:

1. Reemplazar la gestión de `incomingMessage` por refs + aplicación directa:

   const editorRef = useRef<ApollonEditor | null>(null);
   const pendingPatchesRef = useRef<string[]>([]);  // patches remotos pendientes
   
   const handleEditorReady = useCallback((editor: ApollonEditor | null) => {
     editorRef.current = editor;
     if (!editor) return;
     // Aplicar patches pendientes
     const pending = pendingPatchesRef.current;
     pendingPatchesRef.current = [];
     for (const patchJson of pending) {
       try {
         const patch = JSON.parse(patchJson);
         editor.importPatch(patch.patch);
       } catch (e) { console.error('[patch-apply-pending]', e); }
     }
   }, []);

2. onMessage del WebSocket (colaboración):
   - Si el mensaje es { kind: 'patch', patch, senderId, ts }:
     * Ignorar si senderId === clientIdRef.current (eco)
     * Si editorRef.current existe → editorRef.current.importPatch(patch)
     * Si no existe → pendingPatchesRef.current.push(raw)
   - Si el mensaje es { type: 'joined', peers } → actualizar peerCount

3. handleModelChange: enviar patch al servidor (debounce 300ms):
   
   const clientIdRef = useRef(crypto.randomUUID());
   const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   
   const handleLocalPatch = useCallback((patch: unknown) => {
     if (collabStateRef.current !== 'connected') return;
     if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
     sendTimerRef.current = setTimeout(() => {
       collaboration.send(JSON.stringify({
         kind: 'patch',
         patch,
         senderId: clientIdRef.current,
         ts: Date.now(),
       }));
     }, 300);
   }, [collaboration.send]);

4. Suscribirse a patches locales desde ApollonCanvas:
   - ApollonCanvas recibe onLocalPatch callback.
   - ApollonCanvas en handleMount hace:
     editor.subscribeToModelChangePatches(handleLocalPatch)
     Y TAMBIÉN editor.subscribeToModelChange(handleModelChange) para mantener
     el UMLModel actualizado en el estado (para persistencia a DB y paneles IA/Inspector).

5. Mantener el resto de la lógica intacta: guardado periódico, locks, panel IA,
   InspectorPanel, ImportDialog, etc.

6. NO usar `remoteKey` ni remount por key. El `importPatch` no remountea el editor,
   aplica el patch al estado interno.

Ejecutar tsc --noEmit. Reportar resultado.

═══════════════════════════════════════════════════════════
FASE 5 — COLABORACIÓN (basado en Fase 0)
═══════════════════════════════════════════════════════════

Esta fase depende de lo que devuelva la Fase 0.

ESCENARIO A: Encontraste implementación de BESSER que usa JSON Patch + WS
  → Copiar el protocolo exacto. Adaptar al ws.routes.ts existente (que es relay puro,
    no necesita cambios). Reportar el protocolo antes de implementar.

ESCENARIO B: BESSER usa Yjs internamente en webapp pero el editor no lo usa
  → Ignorar la implementación de BESSER. Usar directamente:
    * subscribeToModelChangePatches → enviar patch al WS
    * importPatch → aplicar patch recibido
    * remoteSelect → sincronizar selecciones (opcional)
    * pruneRemoteSelectors → cleanup en disconnect (opcional)
  Verificar firma exacta en Fase 0-E antes de escribir código.

ESCENARIO C: Los métodos subscribeToModelChangePatches/importPatch NO existen en
  la versión instalada de @besser/wme
  → REPORTAR ANTES DE IMPLEMENTAR. Buscar alternativas:
    - subscribeToModelContinuousChangePatches
    - Si no hay ninguno → fallback a JSON sync (como el intento anterior, pero SIN
      remount por key, solo reemplazar nodes/edges via método del editor si existe)
    - Si no hay método para aplicar modelo completo sin remount → reportar y NO
      implementar colaboración. Entregar solo la migración (Fases 1-4).

CRITERIOS DE COLABORACIÓN FUNCIONAL:
- [ ] Usuario A crea clase → Usuario B la ve en ≤500ms
- [ ] Usuario B mueve la clase → Usuario A la ve moverse
- [ ] Usuario A agrega relación → Usuario B la ve
- [ ] Después de 90s sin tocar, ambos navegadores muestran el mismo UMLModel
- [ ] No hay warning "Attempted to synchronously unmount" persistente
  (puede aparecer una vez en el cleanup final, es inofensivo)
- [ ] [classes=N] en logs de ambos navegadores converge al mismo N

═══════════════════════════════════════════════════════════
FASE 6 — LIMPIEZA DE APOLLON Y VERIFICACIÓN
═══════════════════════════════════════════════════════════

A) Confirmar que no quedan referencias a @tumaet/apollon:
   Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx |
     Select-String -Pattern "@tumaet/apollon|ApollonEditor\.generateInitial|receiveBroadcastedMessage|sendBroadcastMessage"

   Si aparece algo → reemplazar por su equivalente BESSER o eliminar.

B) Confirmar en package.json:
   Get-Content package.json | Select-String -Pattern "@tumaet|@besser"

   Debe aparecer solo @besser/wme, cero @tumaet/apollon.

C) Confirmar que node_modules/@tumaet/apollon no existe:
   Test-Path node_modules\@tumaet\apollon
   → debe ser False

D) Buscar logs viejos en el código que ya no aplican:
   Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx |
     Select-String -Pattern "\[apollon-echo-skip\]|recentReceivedRef|apollon-out|apollon-apply-error"

   Si aparecen → eliminar. Son logs del enfoque viejo.

E) Ejecutar:
   npx tsc --noEmit
   → Debe salir sin errores.

F) Revisar que vite.config.ts no tenga alias a @tumaet/apollon.

═══════════════════════════════════════════════════════════
FASE 7 — PRUEBA MANUAL (el agente NO la ejecuta, la pide al usuario)
═══════════════════════════════════════════════════════════

El agente debe entregar al usuario una lista de verificación:

1. Levantar backend: cd Backend; npm run build; npm run dev
2. Levantar frontend: cd Frontend; npm run dev
3. Abrir 2 navegadores (uno incógnito) al mismo diagramId.
4. Filtro de consola Chrome (activar `.*`):
   \[apollon-mount\]|\[apollon-destroy\]|\[collab-send\]|\[patch-apply\]|Attempted
5. Ejecutar la prueba funcional de Fase 5.
6. Reportar logs de ambos navegadores al agente.

Si algo falla, el agente diagnostica con los logs, NO adivina.

═══════════════════════════════════════════════════════════
CRITERIOS DE ÉXITO GLOBAL
═══════════════════════════════════════════════════════════

- [ ] tsc --noEmit pasa sin errores
- [ ] npm ls @tumaet/apollon devuelve "empty" (no instalado)
- [ ] npm ls @besser/wme devuelve versión >= última
- [ ] Cero referencias a @tumaet/apollon en el código fuente
- [ ] Editor carga y renderiza UMLModel correctamente
- [ ] Edición local funciona (crear clase, mover, editar atributos)
- [ ] Persistencia a DB funciona (PUT a /diagrams/:id tras debounce)
- [ ] Colaboración funciona SI Fase 5 no reportó "no viable":
    - A → B y B → A reflejados en ≤500ms
    - 90s de inactividad sin divergencia
    - Sin pérdida de clases (classes=N estable)
- [ ] Warning "Attempted to synchronously unmount" NO aparece repetidamente
  (una vez en cleanup es inofensivo)

═══════════════════════════════════════════════════════════
CRITERIOS DE FALLO — QUÉ REPORTAR
═══════════════════════════════════════════════════════════

Si tsc falla:
  - Pegar errores completos con archivo + línea + mensaje.
  - NO adivinar la solución. Leer los .d.ts de @besser/wme primero.

Si el editor no renderiza:
  - Reportar qué se ve en consola (todos los mensajes, sin filtrar).
  - Verificar que el container ref esté montado antes de new ApollonEditor.
  - Verificar que nextRender se awaitee.

Si la colaboración no funciona:
  - Reportar qué método de la API no existe o falla.
  - Pegar el error exacto.
  - Evaluar ESCENARIO C: entregar migración sin colaboración y reportar.

Si aparecen otros bugs:
  - Reportar con evidencia. NO proponer workarounds antes de entender la causa.

═══════════════════════════════════════════════════════════
ENTREGABLE FINAL
═══════════════════════════════════════════════════════════

Al terminar, el agente debe entregar:

1. Archivos modificados completos (no fragmentos):
   - src/adapters/apollon-adapter.ts
   - src/components/uml/ApollonCanvas.tsx
   - src/app/routes/editor/EditorPage.tsx
   - src/hooks/useCollaboration.ts (si cambió)

2. Resumen de cambios por archivo (qué se agregó, qué se borró, por qué).

3. Resultado de Fase 0 (búsquedas) con rutas y fragmentos.

4. Resultado de npx tsc --noEmit.

5. Instrucciones de prueba para el usuario (Fase 7).

6. Si colaboración no se pudo implementar: explicar exactamente qué método
   faltó, con evidencia de .d.ts, y qué se entregó en su lugar.

EMPIEZA POR LA FASE 0. NO TOQUES NINGÚN ARCHIVO HASTA TENER LOS RESULTADOS
DE LAS BÚSQUEDAS. Reporta y espera confirmación si algo del plan no se puede
ejecutar como está escrito.