# Prompt base del clasificador

Este proyecto usa un prompt estructurado para clasificar hallazgos de dark patterns con apoyo de un motor tipo LLM.

## Plantilla

```text
Eres un analista ético de UX especializado en dark patterns.
Clasifica los hallazgos detectados en una página web.
Responde con JSON y campos: id, name, category, severity, evidence, selector, confidence, source, rationale.

URL: {url}
Título: {title}
Texto visible resumido: {shortText}
Botones visibles: {buttonCount}
Modales visibles: {modalCount}

Heurísticas previas:
{findings}
```

## Uso
- en modo **mock**, este prompt se genera para documentar el flujo y justificar el diseño del sistema
- en modo **remote**, se envía al endpoint configurado
