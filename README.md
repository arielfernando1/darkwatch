# DarkWatch

Detector de patrones oscuros (*dark patterns*) como extensión de navegador basada en **Chrome Manifest V3**.

## Objetivo del proyecto
DarkWatch analiza una página web activa y busca señales de diseño manipulativo o poco ético, por ejemplo:

- urgencia falsa
- escasez falsa
- confirmshaming
- suscripciones ocultas
- costos ocultos
- preselecciones engañosas
- obstrucción con popups
- interferencia visual

Esta versión corresponde a una **base funcional de Semana 1** con estructura DevOps, popup básico y motor inicial de reglas heurísticas.

---

## ¿Necesita Ionic u otros recursos extra?
No.

Para esta base del proyecto no se necesita Ionic, React ni frameworks externos de interfaz. Solo necesitas:

- Google Chrome o un navegador Chromium para cargar la extensión
- Node.js y npm para ejecutar ESLint
- Git para versionar el repositorio
- GitHub para alojar el código y ejecutar el pipeline

---

## Resumen solicitado de la Semana 1

### 1) Investigar y catalogar 10 tipos de dark patterns
Se catalogaron 10 patrones oscuros iniciales en `data/patterns.json`:

1. Urgencia falsa
2. Escasez falsa
3. Confirmshaming
4. Suscripción oculta
5. Costos ocultos
6. Roach motel
7. Preselección engañosa
8. Interferencia visual
9. Obstrucción
10. Misdirection

Cada uno tiene:
- identificador
- nombre
- descripción
- señales de ejemplo
- severidad base

### 2) Definir criterios de detección por tipo
La lógica inicial se implementó en `rules/detectors.js` y sigue dos enfoques:

#### Detección textual
Busca frases sospechosas en el texto visible de la página.

Ejemplos:
- `solo hoy`
- `últimas horas`
- `personas viendo esto`
- `renovación automática`
- `cargo por servicio`

#### Detección estructural del DOM
Busca señales como:
- checkboxes o radios preseleccionados
- modales visibles que bloquean la página
- botones de aceptar visualmente mucho más grandes que los de rechazar

### 3) Configurar estructura de extensión Chrome (Manifest V3)
La estructura base creada es:

```text
DarkWatch/
│
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── content.js
├── background.js
├── README.md
├── .gitignore
├── eslint.config.js
├── package.json
│
├── data/
│   └── patterns.json
│
├── rules/
│   └── detectors.js
│
├── docs/
│   └── SEMANA1_RESUMEN.md
│
└── .github/
    └── workflows/
        └── lint.yml
```



### 4) Crear repositorio con linting automático (ESLint)
Se añadió una base DevOps mínima:

- `package.json` con scripts:
  - `npm run lint`
  - `npm run lint:fix`
- `eslint.config.js`
- workflow en `.github/workflows/lint.yml`

Eso permite verificar automáticamente la calidad del código al hacer `push` o `pull request` en GitHub.

---

## Cómo probar la extensión localmente

1. Abre Chrome.
2. Ve a `chrome://extensions/`.
3. Activa **Modo desarrollador**.
4. Haz clic en **Cargar descomprimida**.
5. Selecciona la carpeta del proyecto.
6. Abre cualquier sitio web.
7. Haz clic en la extensión y luego en **Analizar página**.

---

## Qué hace esta versión inicial
Esta versión puede:

- leer el texto visible de la página actual
- buscar frases relacionadas con varios dark patterns
- detectar algunas opciones preseleccionadas
- detectar modales visibles sospechosos
- comparar visualmente botones de aceptar y rechazar
- mostrar los hallazgos en un popup

N
---
# DarkWatch · Semana 2

DarkWatch es una extensión de Chrome basada en **Manifest V3** que captura el DOM visible de la página activa, aplica heurísticas de detección de dark patterns y luego envía un resumen estructurado a un **clasificador LLM listo para demo**.

## Qué cubre esta versión

Esta iteración implementa los entregables de la **semana 2** del proyecto:

- captura del DOM de la página activa
- preparación del contenido para clasificación
- integración con un motor **LLM demo local** y soporte opcional para **endpoint remoto**
- panel visual con hallazgos, categoría, severidad y evidencia
- lista sugerida de 5 e-commerce para la demo

## Estructura principal

```text
DarkWatch/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── eslint.config.js
├── package.json
├── README.md
├── .gitignore
├── .github/workflows/lint.yml
├── data/
│   └── patterns.json
├── docs/
│   ├── SEMANA1_RESUMEN.md
│   ├── SEMANA2_RESUMEN.md
│   ├── PROMPT_LLM.md
│   └── demo-sites.md
│   └── Informe_DarkWatch_Semana2.pdf
├── rules/
│   └── detectors.js
├── services/
│   └── llmClient.js
└── utils/
    └── domHelpers.js
```

## Arquitectura rápida

### 1. `content.js`
Captura información del DOM visible:
- texto visible
- botones
- modales y overlays
- formularios
- checkboxes y radios
- timers o elementos tipo countdown

### 2. `rules/detectors.js`
Aplica las reglas heurísticas base por patrón:
- urgencia falsa
- escasez falsa
- confirmshaming
- suscripción oculta
- costos ocultos
- roach motel
- preselección engañosa
- interferencia visual
- obstrucción
- misdirection

### 3. `services/llmClient.js`
Prepara el prompt y clasifica los hallazgos.

Modos disponibles:
- **mock**: demo local segura, sin exponer API key
- **remote**: envía el prompt a un endpoint externo configurado por el usuario

> Nota: el API key no debe quedar expuesta dentro de la extensión.

### 4. `popup.js`
Muestra el panel con:
- motor de clasificación
- resumen del análisis
- métricas de captura DOM
- lista de patrones detectados y categoría

## Cómo ejecutar

### 1. Instalar dependencias
```bash
npm install
```

### 2. Cargar la extensión
1. Abrir `chrome://extensions/`
2. Activar **Modo desarrollador**
3. Clic en **Cargar descomprimida**
4. Seleccionar la carpeta del proyecto

### 3. Analizar una página
1. Abrir un sitio web
2. Abrir DarkWatch
3. Elegir modo de motor
4. Pulsar **Analizar página**

## Modo LLM demo vs remoto

### Modo demo local
Es el modo por defecto. Funciona sin backend ni API key.
Sirve para mostrar el flujo de la semana 2.

### Modo remoto
Permite enviar el resumen de la página a un backend propio.
El endpoint debería aceptar un `POST` con JSON y devolver algo como:

```json
{
  "model": "Mi LLM",
  "warning": "",
  "findings": [
    {
      "id": "confirmshaming",
      "name": "Confirmshaming",
      "category": "Manipulación emocional",
      "severity": "Media",
      "evidence": "No gracias, prefiero pagar más",
      "selector": ".newsletter-modal",
      "confidence": "Alta",
      "source": "LLM remoto"
    }
  ]
}
```



# DarkWatch · Semana 3

Extensión Chrome para detectar patrones oscuros en páginas web, con dos modos:

- **Local**: solo reglas heurísticas en la extensión.
- **Remoto**: backend Python (FastAPI) que puede llama a OpenAI de forma segura.

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

## Qué subir a Git

Sí:
- `package.json`
- `package-lock.json`
- `manifest.json`
- `popup.*`
- `content.js`
- `background.js`
- `services/`
- `rules/`
- `utils/`
- `data/`
- `docs/`
- `backend/app.py`
- `backend/requirements.txt`
- `backend/.env.example`

No:
- `node_modules/`
- `backend/.venv/`
- `backend/.env`

## Nota de seguridad


