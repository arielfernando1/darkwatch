# DarkWatch · Semana 3

Extensión Chrome para detectar patrones oscuros en páginas web, con dos modos:

- **Local**: solo reglas heurísticas en la extensión.
- **Remoto**: backend Python (FastAPI) que puede llamar a OpenAI de forma segura.

## Qué agrega la semana 3

- Severidad por hallazgo: Alta / Media / Baja.
- Evidencia visual automática: recorte del primer hallazgo con coordenadas visibles.
- Catálogo ético interno en `data/ethical-catalog.json`.
- Validación con backend Python y opción para conectar OpenAI sin exponer la clave en la extensión.

## Estructura importante

- `content.js` → captura DOM y arma el snapshot.
- `rules/detectors.js` → reglas heurísticas y severidad base.
- `services/llmClient.js` → decide si analiza en modo local o remoto.
- `popup.js` → muestra resultados y recorta evidencia visual.
- `backend/app.py` → endpoint FastAPI para usar OpenAI o fallback local.

## Cómo cargar la extensión

1. Ejecuta `npm install`
2. Abre `chrome://extensions/`
3. Activa **Modo desarrollador**
4. Pulsa **Cargar descomprimida**
5. Selecciona la carpeta `darkwatch-week3`

## Cómo levantar el backend en Windows

Desde la carpeta `backend/`:

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edita `.env` y coloca tu nueva `OPENAI_API_KEY`.

Luego ejecuta:

```powershell
uvicorn app:app --reload --port 8000
```

Prueba salud del backend:

- `http://127.0.0.1:8000/health`

## Flujo de prueba recomendado

### Modo local
- En la extensión selecciona **Local**
- Analiza una página
- Verifica hallazgos y evidencia visual

### Modo remoto
- Levanta el backend Python
- En la extensión selecciona **Remoto**
- Usa `http://127.0.0.1:8000/api/classify`
- Pulsa **Probar backend**
- Luego **Analizar página**

# DarkWatch · Semana 4

Extensión Chrome Manifest V3 para detectar dark patterns con dos motores de análisis:

- **Modo local**: heurísticas en el navegador.
- **Modo remoto**: backend Python (FastAPI) para clasificación con OpenAI.

## Qué incluye esta versión

- severidad por hallazgo (Alta / Media / Baja)
- captura automática del elemento detectado
- historial local de análisis
- reporte exportable por sitio en HTML
- reporte ético comparativo en HTML
- base de análisis exportable en JSON
- script para construir un paquete limpio para Chrome Web Store

## Flujo recomendado

1. Cargar la extensión en `chrome://extensions`.
2. Probar primero en modo local.
3. Si quieres usar OpenAI, levantar el backend Python y usar modo remoto.
4. Analizar sitios reales.
5. Exportar:
   - reporte por sitio
   - reporte comparativo
   - base JSON con los sitios analizados

## Backend Python

La carpeta `backend/` contiene:

- `app.py`
- `requirements.txt`
- `.env.example`
- `prompts/classify_dark_patterns.txt`



