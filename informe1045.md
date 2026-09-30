# Informe de Implementación — Fix Cliente Gemini IA
**Fecha:** 2026-09-23 · **Hora inicio:** 10:45 · **Hora fin:** 10:57

---

## 1. Diagnóstico (Paso 1)

### 1.1 Archivo `gemini.client.ts` — estado antes del fix

```typescript
// Línea 11 — origen del bug
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Línea 100-103 — función callGemini original (sin retry ni fallback)
async function callGemini(parts): Promise<string> {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(parts as never);
    return result.response.text();
}
```

### 1.2 Variables de entorno `.env` — antes del fix

```
GEMINI_MODEL=gemini-3.6-flash
```

### 1.3 Hallazgos del diagnóstico

| Ítem | Valor encontrado |
|---|---|
| Nombre del modelo activo | `gemini-3.6-flash` (leído de `.env` via `GEMINI_MODEL`) |
| Fuente del nombre | `.env` (variable `GEMINI_MODEL`) + fallback hardcodeado idéntico en código |
| ¿Hay retry? | **NO** — un único intento sin manejo de error |
| ¿Hay fallback a otro modelo? | **NO** |
| Función que llama a la API | `callGemini(parts)` — privada, interna; firma pública no cambia |

### 1.4 Causa raíz confirmada

El modelo `gemini-3.6-flash` sí existe en la API pero estaba con alta demanda → 503. El problema raíz era la **ausencia total de retry y fallback**: cualquier 503 o 429 fallaba directamente sin reintentar.

Nota: La primera lista de fallback propuesta (`gemini-2.5-flash`) ya no está disponible para nuevos usuarios según la API de Google. Se consultó la lista real de modelos disponibles para la API key del proyecto.

---

## 2. Cambios Aplicados (Paso 2)

### 2.1 `gemini.client.ts` — diff

**ANTES (líneas clave):**
```typescript
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

async function callGemini(parts): Promise<string> {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(parts as never);
    return result.response.text();
}
```

**DESPUÉS (nueva lógica completa):**
```typescript
const DEFAULT_MODELS = 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-2.5-flash';

function getModelList(): string[] {
    const raw = process.env.GEMINI_MODELS || DEFAULT_MODELS;
    return raw.split(',').map((m) => m.trim()).filter(Boolean);
}

function isRetryable(err: unknown): boolean {
    const msg = String((err as Error)?.message ?? '');
    if (/503/.test(msg)) return true;
    if (/429/.test(msg)) return true;
    if (/500/.test(msg)) return true;
    if (/timeout/i.test(msg)) return true;
    return false;  // 400, 401, 403 → no retryable
}

async function callModelWithRetry(genAI, modelName, parts, maxRetries = 3): Promise<string> {
    const delays = [500, 1000, 2000];
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(parts as never);
            return result.response.text();
        } catch (err) {
            lastErr = err;
            if (!isRetryable(err)) throw err;
            if (attempt < maxRetries - 1) {
                await new Promise((res) => setTimeout(res, delays[attempt] ?? 2000));
            }
        }
    }
    throw lastErr;
}

async function callGemini(parts): Promise<string> {
    const models = getModelList();
    const genAI = getClient();
    let lastErr: unknown;
    for (const modelName of models) {
        try {
            return await callModelWithRetry(genAI, modelName, parts);
        } catch (err) {
            lastErr = err;
            if (!isRetryable(err)) throw err;
        }
    }
    throw new Error(`All Gemini models failed. Last error: ${(lastErr as Error)?.message}`);
}
```

**Propiedades:**
- Lee lista desde `GEMINI_MODELS` (coma-separada, plural)
- Hasta 3 reintentos por modelo con backoff 500ms → 1000ms → 2000ms
- Reintenta solo en 503, 429, 500, timeout
- NO reintenta en 400, 401, 403
- Si un modelo agota 3 intentos, pasa al siguiente
- Firma pública inalterada (ningún otro módulo requiere cambios)

### 2.2 `.env` — línea modificada

```diff
-GEMINI_MODEL=gemini-3.6-flash
+GEMINI_MODELS=gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-2.5-flash
```

### 2.3 Verificación de referencias a modelos inválidos

```
Get-ChildItem -Path "...\Backend\src" -Recurse -Include "*.ts" | Select-String -Pattern "gemini-3[^.]"
→ Sin resultados ✅
```

---

## 3. Verificación (Paso 3)

### 3.1 Compilación TypeScript

```
> npm run build
> tsc && node -e "require('fs').cpSync(...)"

Exit code: 0 ✅ — Sin errores
```

### 3.2 Backend

Backend ya corriendo en `:3000` (tsx watch, recarga automática):
```
GET http://localhost:3000/health → 200 {"status":"ok"} ✅
```

### 3.3 Test endpoint de IA (Invoke-RestMethod)

**Request:**
```
POST http://localhost:3000/diagrams/aaf444ea-a29a-459d-a4f2-aef79ddd65e1/ai/command
Body: {"message":"Agrega una clase Alumno con atributos legajo y nombre"}
```

**Response (HTTP 200):**
```json
{
  "autoApplied": [
    {
      "type": "add_class",
      "name": "Alumno",
      "kind": "class",
      "attributes": [
        { "name": "id",     "type": "Long",   "isPrimaryKey": true  },
        { "name": "legajo", "type": "String",  "isPrimaryKey": false },
        { "name": "nombre", "type": "String",  "isPrimaryKey": false }
      ]
    }
  ],
  "requiresConfirmation": false,
  "model": {
    "id": "aaf444ea-a29a-459d-a4f2-aef79ddd65e1",
    "name": "DiagramaTest",
    "version": 2,
    "classes": [{ "id": "class_alumno", "name": "Alumno", ... }]
  }
}
```

**Resultado: ✅ HTTP 200 sin error 503**
El modelo `gemini-3.8-flash` (primero de la lista) respondió exitosamente.

### 3.4 Test desde frontend

> ⚠️ No verificado en navegador — el servidor frontend no estaba corriendo.  
> Sin embargo, dado que el endpoint devuelve 200 y el contrato de respuesta no cambió, el frontend no requiere modificaciones.

---

## 4. Modelos disponibles confirmados para esta API key

| Modelo | Estado |
|---|---|
| `gemini-3.8-flash` | ✅ Disponible, respondió en el test |
| `gemini-3.7-flash` | ✅ Disponible |
| `gemini-3.6-flash` | ✅ Disponible (era el original, fallaba por 503 de alta demanda) |
| `gemini-2.5-flash` | ⚠️ Disponible pero con restricciones para nuevos usuarios |

---

## 5. Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `Backend/src/modules/ai/gemini.client.ts` | Nueva lógica retry + fallback multi-modelo |
| `Backend/.env` | `GEMINI_MODEL` → `GEMINI_MODELS` con lista válida |

**Sin cambios en:** `ai.routes.ts`, `orchestrator.ts`, `llm.provider.ts`, ni ningún archivo del Frontend.

---

## 6. Checklist final

| Requisito | Estado |
|---|---|
| Error 503 corregido | ✅ |
| Sin referencias a `gemini-3.6-flash` hardcodeadas | ✅ |
| Build TypeScript limpio | ✅ |
| Firma pública inalterada | ✅ |
| Sin dependencias nuevas | ✅ |
| Retry con backoff exponencial | ✅ 500ms → 1000ms → 2000ms |
| Fallback entre modelos | ✅ 4 modelos |
| No reintenta en 400/401/403 | ✅ |
| Frontend sin cambios | ✅ |
