# Semana 2 · Resumen del MVP

## Objetivo
Construir un MVP funcional que capture el DOM de la página activa, lo clasifique con apoyo de un motor tipo LLM y muestre los patrones detectados en el panel de la extensión.

## Qué se implementó

### 1. Captura de DOM de la página activa
En `content.js` se extraen:
- texto visible de la página
- botones visibles
- modales y overlays
- formularios
- checkbox y radio inputs
- elementos tipo countdown o timer

### 2. Envío de contenido al motor de clasificación
En `services/llmClient.js` se construye un prompt estructurado con:
- URL
- título
- texto resumido
- estadísticas del DOM
- hallazgos heurísticos previos

### 3. Panel con patrones detectados y categoría
En `popup.js` y `popup.html` se muestra:
- resumen del análisis
- nivel de riesgo
- hallazgos detectados
- categoría por patrón
- severidad, confianza y selector
- estadísticas de captura DOM

### 4. Demo con 5 e-commerce conocidos
Se propone un set mínimo de sitios en `docs/demo-sites.md` para mostrar casos variados.

## Nota importante sobre LLM real
La versión entregada usa por defecto un **LLM demo local** para no exponer claves API en el frontend de la extensión. Sin embargo, ya queda preparada la opción de **endpoint remoto** para una integración real en una siguiente iteración.
