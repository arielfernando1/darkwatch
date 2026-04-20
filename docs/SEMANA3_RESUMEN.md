# Resumen · Semana 3

## Objetivo
Agregar severidad, evidencia visual y backend Python seguro para clasificación remota.

## Lo implementado
- Severidad Alta/Media/Baja por hallazgo.
- Evidencia visual por recorte automático del primer elemento detectado.
- Comparación con catálogo ético interno (`data/ethical-catalog.json`).
- Backend FastAPI con dos comportamientos:
  - OpenAI real si existe `OPENAI_API_KEY`
  - fallback heurístico si no existe o falla el servicio
- Modo local y modo remoto dentro del popup.

## Resultado
La extensión puede analizar una página sin backend y tambien con backend Python sin exponer credenciales.
