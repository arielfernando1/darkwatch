# Resumen Semana 1 — DarkWatch

## 1. Investigar y catalogar 10 tipos de dark patterns
Se catalogaron diez patrones oscuros iniciales en `data/patterns.json`:

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

Cada patrón incluye una descripción breve, señales de ejemplo y severidad base.

## 2. Definir criterios de detección por tipo
Se definieron criterios iniciales de detección de dos formas:

- **Detección textual:** búsqueda de frases sospechosas en el texto visible de la página.
- **Detección estructural:** análisis del DOM para revisar checkboxes/radios preseleccionados, modales visibles y diferencia visual entre botones de aceptar y rechazar.

Implementación inicial en `rules/detectors.js`.

## 3. Configurar estructura de extensión Chrome (Manifest V3)
La extensión quedó estructurada con:

- `manifest.json`
- `popup.html`, `popup.css`, `popup.js`
- `content.js`
- `background.js`
- `rules/detectors.js`
- `data/patterns.json`

El proyecto está preparado principalmente para **Chrome/Chromium**. La arquitectura base también se parece al modelo WebExtensions usado por Firefox, pero esta versión fue pensada y nombrada para Chrome primero, como pide el enunciado.

## 4. Crear repositorio con linting automático (ESLint)
Se agregó una base DevOps para el repositorio:

- `package.json` con scripts `lint` y `lint:fix`
- `eslint.config.js`
- workflow de GitHub Actions en `.github/workflows/lint.yml`

Con esto, el proyecto queda listo para revisión automática de calidad de código al hacer push o pull request.
