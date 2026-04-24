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
      'Responde en JSON con un arreglo findings. Cada hallazgo debe tener: id, name, category, severity, evidence, selector, confidence, source, rationale, ethicalReference.',
      `URL: ${payload.snapshot.url}`,
      `Título: ${payload.snapshot.title}`,
      `Texto visible resumido: ${payload.snapshot.shortText}`,
      `Botones visibles: ${payload.snapshot.buttonCandidates.length}`,
      `Modales visibles: ${payload.snapshot.modalCandidates.filter((item) => item.visible).length}`,
      `Heurísticas previas:\n${heuristicLines.join('\n') || 'Sin hallazgos heurísticos.'}`,
    ].join('\n\n');
  }

  function confidenceFromSeverity(severity) {
    if (severity === 'Alta') return 'Alta';
    if (severity === 'Media') return 'Media';
    return 'Baja';
  }

  function runLocalClassifier(payload) {
    const findings = payload.heuristicFindings.map((finding) => {
      const meta = getPatternMeta(finding.id);
      return {
        ...finding,
        category: finding.category || meta?.category || 'Sin categoría',
        confidence: finding.confidence || confidenceFromSeverity(finding.severity),
        source: 'Local',
        rationale: meta ? `${meta.description} Confirmado con el DOM visible.` : 'Hallazgo confirmado localmente.',
      };
    });

    return {
      findings,
      model: 'Local',
      provider: 'local',
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
        snapshot: payload.snapshot,
        heuristicFindings: payload.heuristicFindings,
      }),
    });

    if (!response.ok) {
      throw new Error(`El endpoint remoto respondió con estado ${response.status}.`);
    }

    const data = await response.json();
    return {
      findings: Array.isArray(data.findings) ? data.findings : [],
      model: data.model || 'Backend Python',
      provider: data.provider || 'remote',
      warning: data.warning || '',
      prompt,
    };
  }

  async function classifyDarkPatternsWithLLM(payload, settings) {
    const mode = settings?.llmMode || 'local';
    const remoteEndpoint = settings?.remoteEndpoint || '';

    if (mode === 'remote' && remoteEndpoint) {
      try {
        return await runRemoteClassifier(payload, remoteEndpoint);
      } catch (error) {
        const fallback = runLocalClassifier(payload);
        return {
          ...fallback,
          warning: `Falló el backend remoto. Se usó el análisis local. Detalle: ${error.message}`,
        };
      }
    }

    return runLocalClassifier(payload);
  }

  window.buildDarkWatchPrompt = buildPrompt;
  window.classifyDarkPatternsWithLLM = classifyDarkPatternsWithLLM;
})();
