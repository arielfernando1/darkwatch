(function attachLlmClient() {
  function getPatternMeta(id) {
    return window.DARKWATCH_PATTERN_META?.[id] || null;
  }

  function buildPrompt(payload) {
    const heuristicLines = payload.heuristicFindings.map((finding, index) => (
      `${index + 1}. ${finding.name} | categoría preliminar: ${finding.category} | evidencia: ${finding.evidence}`
    ));

    return [
      'Eres un analista ético de UX especializado en dark patterns.',
      'Clasifica los hallazgos detectados en una página web.',
      'Responde con JSON y campos: id, name, category, severity, evidence, selector, confidence, source, rationale.',
      `URL: ${payload.snapshot.url}`,
      `Título: ${payload.snapshot.title}`,
      `Texto visible resumido: ${payload.snapshot.shortText}`,
      `Botones visibles: ${payload.snapshot.buttonCandidates.length}`,
      `Modales visibles: ${payload.snapshot.modalCandidates.filter((item) => item.visible).length}`,
      `Heurísticas previas:
${heuristicLines.join('\n') || 'Sin hallazgos heurísticos.'}`,
    ].join('\n\n');
  }

  function confidenceFromSeverity(severity) {
    if (severity === 'Alta') {
      return 'Alta';
    }

    if (severity === 'Media') {
      return 'Media';
    }

    return 'Baja';
  }

  function runMockClassifier(payload) {
    const findings = payload.heuristicFindings.map((finding) => {
      const meta = getPatternMeta(finding.id);
      return {
        ...finding,
        category: finding.category || meta?.category || 'Sin categoría',
        confidence: finding.confidence || confidenceFromSeverity(finding.severity),
        source: 'LLM demo local',
        rationale: meta
          ? `${meta.description} Se confirmó a partir del DOM visible y la evidencia capturada.`
          : 'Hallazgo confirmado por el clasificador demo.',
      };
    });

    const pageText = (payload.snapshot.bodyText || '').toLowerCase();

    if (!findings.length && pageText.includes('free trial') && pageText.includes('monthly')) {
      const meta = getPatternMeta('hidden_subscription');
      findings.push({
        id: meta.id,
        name: meta.name,
        category: meta.category,
        severity: meta.severity,
        evidence: 'El texto de la página sugiere una prueba gratis con posible mensualidad.',
        selector: 'body',
        confidence: 'Baja',
        source: 'LLM demo local',
        rationale: meta.description,
      });
    }

    return {
      findings,
      model: 'DarkWatch Mock LLM v0.2',
      warning: '',
      prompt: buildPrompt(payload),
    };
  }

  async function runRemoteClassifier(payload, remoteEndpoint) {
    const prompt = buildPrompt(payload);
    const response = await fetch(remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        snapshot: {
          url: payload.snapshot.url,
          title: payload.snapshot.title,
          shortText: payload.snapshot.shortText,
          textLength: payload.snapshot.bodyText.length,
          stats: payload.snapshot.stats,
        },
        heuristicFindings: payload.heuristicFindings,
      }),
    });

    if (!response.ok) {
      throw new Error(`El endpoint remoto respondió con estado ${response.status}.`);
    }

    const data = await response.json();
    return {
      findings: Array.isArray(data.findings) ? data.findings : [],
      model: data.model || 'LLM remoto',
      warning: data.warning || '',
      prompt,
    };
  }

 async function classifyDarkPatternsWithLLM(payload, settings) {
  const mode = settings?.llmMode || 'mock';
  const remoteEndpoint = settings?.remoteEndpoint || '';

  if (mode === 'remote') {
    if (!remoteEndpoint) {
      return {
        findings: [],
        model: 'Endpoint remoto no configurado',
        warning: 'Integracion con LLM remoto en proceso ...',
        prompt: buildPrompt(payload),
        effectiveMode: 'remote-error',
      };
    }

    try {
      const remote = await runRemoteClassifier(payload, remoteEndpoint);
      return {
        ...remote,
        effectiveMode: 'remote',
      };
    } catch (error) {
      return {
        findings: [],
        model: 'Endpoint remoto no disponible',
        warning: `No se pudo usar ${remoteEndpoint}. Detalle: ${error.message}`,
        prompt: buildPrompt(payload),
        effectiveMode: 'remote-error',
      };
    }
  }

  return {
    ...runMockClassifier(payload),
    effectiveMode: 'mock',
  };
}

  window.buildDarkWatchPrompt = buildPrompt;
  window.classifyDarkPatternsWithLLM = classifyDarkPatternsWithLLM;
})();
