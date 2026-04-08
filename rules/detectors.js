function normalizeText(value) {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function findKeywordEvidence(text, keywords) {
  const normalized = normalizeText(text);
  const found = keywords.find((keyword) => normalized.includes(keyword));
  return found ? found : null;
}

function detectDarkPatterns(snapshot) {
  const findings = [];
  const pageText = normalizeText(snapshot.bodyText);

  const patternRules = [
    {
      id: 'false_urgency',
      name: 'Urgencia falsa',
      severity: 'Alta',
      evidence: findKeywordEvidence(pageText, [
        'solo hoy',
        'últimas horas',
        'ultimas horas',
        'termina en',
        'oferta expira',
        'finaliza pronto',
        'quedan pocas horas'
      ]),
      selector: 'body'
    },
    {
      id: 'false_scarcity',
      name: 'Escasez falsa',
      severity: 'Alta',
      evidence: findKeywordEvidence(pageText, [
        'solo quedan',
        'quedan 2',
        'quedan 3',
        'personas viendo esto',
        'personas están viendo esto',
        'alta demanda'
      ]),
      selector: 'body'
    },
    {
      id: 'confirmshaming',
      name: 'Confirmshaming',
      severity: 'Media',
      evidence: findKeywordEvidence(pageText, [
        'no gracias, prefiero',
        'no quiero ahorrar',
        'prefiero pagar más',
        'no me importa ahorrar',
        'rechazar descuento'
      ]),
      selector: 'body'
    },
    {
      id: 'hidden_subscription',
      name: 'Suscripción oculta',
      severity: 'Alta',
      evidence: findKeywordEvidence(pageText, [
        'prueba gratis',
        'renovación automática',
        'renovacion automatica',
        'se cobrará automáticamente',
        'suscripción mensual'
      ]),
      selector: 'body'
    },
    {
      id: 'hidden_costs',
      name: 'Costos ocultos',
      severity: 'Alta',
      evidence: findKeywordEvidence(pageText, [
        'cargo por servicio',
        'gastos de gestión',
        'gastos de gestion',
        'tarifa adicional',
        'costos adicionales'
      ]),
      selector: 'body'
    },
    {
      id: 'roach_motel',
      name: 'Roach motel',
      severity: 'Media',
      evidence: findKeywordEvidence(pageText, [
        'cancelar por teléfono',
        'cancelar por telefono',
        'contacta soporte para cancelar',
        'solicita la baja'
      ]),
      selector: 'body'
    },
    {
      id: 'misdirection',
      name: 'Misdirection',
      severity: 'Media',
      evidence: findKeywordEvidence(pageText, [
        'continuar sin protección',
        'continuar sin proteccion',
        'omitir beneficio',
        'seguir sin ahorro'
      ]),
      selector: 'body'
    }
  ];

  patternRules.forEach((rule) => {
    if (rule.evidence) {
      findings.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        evidence: `Texto detectado: "${rule.evidence}"`,
        selector: rule.selector
      });
    }
  });

  snapshot.checkboxCandidates.forEach((candidate) => {
    const context = normalizeText(candidate.contextText);
    const lookedLikeUpsell = ['seguro', 'premium', 'protección', 'proteccion', 'boletín', 'boletin', 'newsletter', 'extra', 'donación', 'donacion']
      .some((word) => context.includes(word) || normalizeText(candidate.name).includes(word) || normalizeText(candidate.id).includes(word));

    if (candidate.checked && lookedLikeUpsell) {
      findings.push({
        id: 'preselection',
        name: 'Preselección engañosa',
        severity: 'Media',
        evidence: `Opción marcada por defecto en contexto: "${candidate.contextText.slice(0, 120)}"`,
        selector: candidate.selector
      });
    }
  });

  const visibleModals = snapshot.modalCandidates.filter((modal) => modal.visible && (modal.width > 250 || modal.height > 120));
  visibleModals.forEach((modal) => {
    const normalizedText = normalizeText(modal.text);
    const blockingWords = ['aceptar', 'suscríbete', 'suscribete', 'registrate', 'regístrate', 'continuar', 'cookies'];
    const containsBlockingPrompt = blockingWords.some((word) => normalizedText.includes(word));

    if (containsBlockingPrompt) {
      findings.push({
        id: 'obstruction',
        name: 'Obstrucción',
        severity: 'Alta',
        evidence: `Modal o overlay visible con texto: "${modal.text.slice(0, 140)}"`,
        selector: modal.selector
      });
    }
  });

  const visibleButtons = snapshot.buttonCandidates.filter((button) => button.visible && button.text);
  const acceptButton = visibleButtons.find((button) => /aceptar|acepto|continuar|sí, aceptar|si, aceptar|permitir/.test(normalizeText(button.text)));
  const rejectButton = visibleButtons.find((button) => /rechazar|no gracias|configurar|más tarde|mas tarde|cancelar/.test(normalizeText(button.text)));

  if (acceptButton && rejectButton) {
    const acceptArea = acceptButton.width * acceptButton.height;
    const rejectArea = rejectButton.width * rejectButton.height;

    if (acceptArea > rejectArea * 1.8) {
      findings.push({
        id: 'visual_interference',
        name: 'Interferencia visual',
        severity: 'Media',
        evidence: `El botón de aceptación parece dominar visualmente frente al de rechazo (${acceptButton.width}x${acceptButton.height} vs ${rejectButton.width}x${rejectButton.height}).`,
        selector: `${acceptButton.selector} / ${rejectButton.selector}`
      });
    }
  }

  const uniqueFindings = [];
  const seen = new Set();

  findings.forEach((item) => {
    const key = `${item.id}-${item.selector}-${item.evidence}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFindings.push(item);
    }
  });

  return uniqueFindings;
}
