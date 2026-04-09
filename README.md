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
