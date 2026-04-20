import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

OPENAI_ENABLED = os.getenv('OPENAI_ENABLED', 'true').lower() == 'true'
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.4-mini')
PROMPT_PATH = Path(__file__).parent / 'prompts' / 'classify_dark_patterns.txt'
SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding='utf-8') if PROMPT_PATH.exists() else ''

app = FastAPI(title='DarkWatch Backend', version='0.3.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


class AnalyzeRequest(BaseModel):
    prompt: str
    snapshot: Dict[str, Any] = Field(default_factory=dict)
    heuristicFindings: List[Dict[str, Any]] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    findings: List[Dict[str, Any]]
    model: str
    provider: str
    warning: str = ''


@app.get('/health')
def health() -> Dict[str, Any]:
    provider = 'openai' if OPENAI_ENABLED and os.getenv('OPENAI_API_KEY') else 'fallback'
    return {
        'ok': True,
        'provider': provider,
        'model': OPENAI_MODEL if provider == 'openai' else 'local-fallback',
    }


def safe_json_extract(text: str) -> Dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if not match:
        raise ValueError('No se encontró un bloque JSON válido en la respuesta del modelo.')

    candidate = match.group(1)
    parsed = json.loads(candidate)
    if isinstance(parsed, list):
        return {'findings': parsed}
    return parsed


def normalize_finding(item: Dict[str, Any]) -> Dict[str, Any]:
    severity = item.get('severity', 'Media')
    if severity not in {'Alta', 'Media', 'Baja'}:
        severity = 'Media'
    confidence = item.get('confidence', 'Media')
    if confidence not in {'Alta', 'Media', 'Baja'}:
        confidence = 'Media'

    return {
        'id': item.get('id', 'unknown'),
        'name': item.get('name', 'Hallazgo sin nombre'),
        'category': item.get('category', 'Sin categoría'),
        'severity': severity,
        'evidence': item.get('evidence', 'Sin evidencia textual.'),
        'selector': item.get('selector', 'body'),
        'confidence': confidence,
        'source': item.get('source', 'OpenAI via FastAPI'),
        'rationale': item.get('rationale', 'Clasificación generada por el backend.'),
        'ethicalReference': item.get('ethicalReference', 'Catálogo interno DarkWatch'),
        'rect': item.get('rect'),
    }


def build_fallback_findings(heuristic_findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [normalize_finding({**item, 'source': 'Fallback local'}) for item in heuristic_findings]


def call_openai(prompt: str) -> Dict[str, Any]:
    from openai import OpenAI

    client = OpenAI()
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=f"{SYSTEM_PROMPT}\n\n{prompt}",
    )
    parsed = safe_json_extract(response.output_text)
    findings = parsed.get('findings', []) if isinstance(parsed, dict) else []
    return {
        'findings': [normalize_finding(item) for item in findings if isinstance(item, dict)],
        'model': OPENAI_MODEL,
        'provider': 'openai',
        'warning': '',
    }


@app.post('/api/classify', response_model=AnalyzeResponse)
def classify(request: AnalyzeRequest) -> AnalyzeResponse:
    heuristic_findings = request.heuristicFindings or []

    if not OPENAI_ENABLED or not os.getenv('OPENAI_API_KEY'):
        return AnalyzeResponse(
            findings=build_fallback_findings(heuristic_findings),
            model='local-fallback',
            provider='fallback',
            warning='No se encontró OPENAI_API_KEY o OPENAI_ENABLED=false. Se devolvió el análisis heurístico.',
        )

    try:
        result = call_openai(request.prompt)
        if not result['findings'] and heuristic_findings:
            result['findings'] = build_fallback_findings(heuristic_findings)
            result['warning'] = 'El modelo no devolvió hallazgos estructurados. Se usó fallback heurístico.'
        return AnalyzeResponse(**result)
    except Exception as error:
        return AnalyzeResponse(
            findings=build_fallback_findings(heuristic_findings),
            model='local-fallback',
            provider='fallback',
            warning=f'El backend no pudo usar OpenAI. Se devolvió fallback heurístico. Detalle: {error}',
        )
