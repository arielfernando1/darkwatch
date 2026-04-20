(function attachDetectors() {
  const PATTERN_META = {
    false_urgency: {
      id: 'false_urgency',
      name: 'Urgencia falsa',
      category: 'Presión temporal',
      severity: 'Alta',
      ethicalReference: 'deceptive.design · urgency',
      description: 'Genera presión artificial usando tiempo limitado, contadores o mensajes de cierre inminente.',
    },
    false_scarcity: {
      id: 'false_scarcity',
      name: 'Escasez falsa',
      category: 'Escasez manipulada',
      severity: 'Alta',
      ethicalReference: 'deceptive.design · scarcity',
      description: 'Sugiere stock escaso o alta demanda sin evidencia verificable.',
    },
    confirmshaming: {
      id: 'confirmshaming',
      name: 'Confirmshaming',
      category: 'Manipulación emocional',
      severity: 'Media',
      ethicalReference: 'deceptive.design · confirmshaming',
      description: 'El rechazo se formula con culpa, vergüenza o burla.',
    },
    hidden_subscription: {
      id: 'hidden_subscription',
      name: 'Suscripción oculta',
      category: 'Cobro recurrente oculto',
      severity: 'Alta',
      ethicalReference: 'deceptive.design · hidden costs / subscription traps',
      description: 'La interfaz minimiza o esconde que la acción crea cobros repetitivos.',
    },
    hidden_costs: {
      id: 'hidden_costs',
      name: 'Costos ocultos',
      category: 'Costos tardíos',
      severity: 'Alta',
      ethicalReference: 'deceptive.design · hidden costs',
      description: 'Aparecen cargos adicionales tarde en el flujo o con poca claridad.',
    },
    roach_motel: {
      id: 'roach_motel',
      name: 'Roach motel',
      category: 'Salida difícil',
      severity: 'Media',
      ethicalReference: 'deceptive.design · roach motel',
      description: 'Es muy fácil entrar y difícil cancelar o salir.',
    },
    preselection: {
      id: 'preselection',
      name: 'Preselección engañosa',
      category: 'Default sesgado',
      severity: 'Media',
      ethicalReference: 'deceptive.design · sneaking / preselection',
      description: 'Opciones favorables al negocio aparecen activadas por defecto.',
    },
    visual_interference: {
      id: 'visual_interference',
      name: 'Interferencia visual',
      category: 'Jerarquía visual sesgada',
      severity: 'Media',
      ethicalReference: 'deceptive.design · visual interference',
      description: 'Aceptar tiene mucha más fuerza visual que rechazar o configurar.',
    },
    obstruction: {
      id: 'obstruction',
      name: 'Obstrucción',
      category: 'Bloqueo del flujo',
      severity: 'Alta',
      ethicalReference: 'deceptive.design · obstruction',
      description: 'Overlays, popups o muros que bloquean avanzar con normalidad.',
    },
    misdirection: {
      id: 'misdirection',
      name: 'Misdirection',
      category: 'Desvío de intención',
      severity: 'Media',
      ethicalReference: 'deceptive.design · misdirection',
      description: 'La interfaz conduce al usuario hacia una acción distinta a la que parece principal.',
    },
  };

  function normalizeText(value) {
    return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findKeywordEvidence(text, keywords) {
    const normalized = normalizeText(text);
    return keywords.find((keyword) => normalized.includes(keyword)) || null;
  }

  function buildFinding(meta, evidence, selector, confidence, source, rect) {
    return {
      id: meta.id,
      name: meta.name,
      category: meta.category,
      severity: meta.severity,
      ethicalReference: meta.ethicalReference,
      evidence,
      selector,
      confidence: confidence || 'Media',
      source: source || 'Heurística DOM',
      rect: rect || null,
    };
  }

  function detectDarkPatterns(snapshot) {
    const findings = [];
    const pageText = normalizeText(snapshot.bodyText);

    const textRules = [
      {
        meta: PATTERN_META.false_urgency,
        keywords: ['solo hoy', 'últimas horas', 'ultimas horas', 'termina en', 'oferta expira', 'finaliza pronto', 'quedan pocas horas'],
      },
      {
        meta: PATTERN_META.false_scarcity,
        keywords: ['solo quedan', 'quedan 2', 'quedan 3', 'personas viendo esto', 'personas están viendo esto', 'alta demanda'],
      },
      {
        meta: PATTERN_META.confirmshaming,
        keywords: ['no gracias, prefiero', 'no quiero ahorrar', 'prefiero pagar más', 'prefiero pagar mas', 'no me importa ahorrar'],
      },
      {
        meta: PATTERN_META.hidden_subscription,
        keywords: ['prueba gratis', 'renovación automática', 'renovacion automatica', 'se cobrará automáticamente', 'se cobrara automaticamente', 'suscripción mensual', 'suscripcion mensual'],
      },
      {
        meta: PATTERN_META.hidden_costs,
        keywords: ['cargo por servicio', 'gastos de gestión', 'gastos de gestion', 'tarifa adicional', 'costos adicionales'],
      },
      {
        meta: PATTERN_META.roach_motel,
        keywords: ['cancelar por teléfono', 'cancelar por telefono', 'contacta soporte para cancelar', 'solicita la baja'],
      },
      {
        meta: PATTERN_META.misdirection,
        keywords: ['continuar sin protección', 'continuar sin proteccion', 'omitir beneficio', 'seguir sin ahorro'],
      },
    ];

    textRules.forEach((rule) => {
      const evidence = findKeywordEvidence(pageText, rule.keywords);
      if (evidence) {
        findings.push(buildFinding(rule.meta, `Texto detectado: "${evidence}"`, 'body', 'Alta', 'Heurística DOM', null));
      }
    });

    snapshot.timerCandidates.forEach((candidate) => {
      if (candidate.visible) {
        findings.push(buildFinding(
          PATTERN_META.false_urgency,
          `Elemento tipo contador o urgencia visible: "${candidate.text || candidate.selector}"`,
          candidate.selector,
          'Media',
          'Heurística DOM',
          candidate.rect,
        ));
      }
    });

    snapshot.checkboxCandidates.forEach((candidate) => {
      const context = normalizeText(candidate.contextText);
      const lookedLikeUpsell = ['seguro', 'premium', 'protección', 'proteccion', 'boletín', 'boletin', 'newsletter', 'extra', 'donación', 'donacion']
        .some((word) => context.includes(word) || normalizeText(candidate.name).includes(word) || normalizeText(candidate.id).includes(word));

      if (candidate.checked && lookedLikeUpsell) {
        findings.push(buildFinding(
          PATTERN_META.preselection,
          `Opción marcada por defecto en contexto: "${candidate.contextText.slice(0, 140)}"`,
          candidate.selector,
          'Alta',
          'Heurística DOM',
          candidate.rect,
        ));
      }
    });

    snapshot.formCandidates.forEach((form) => {
      const text = normalizeText(form.text);
      if (text.includes('prueba gratis') && (text.includes('mensual') || text.includes('renov') || text.includes('cancel'))) {
        findings.push(buildFinding(
          PATTERN_META.hidden_subscription,
          `Formulario o bloque con prueba gratis y cobro recurrente: "${form.text.slice(0, 160)}"`,
          form.selector,
          'Media',
          'Heurística DOM',
          form.rect,
        ));
      }
    });

    const visibleModals = snapshot.modalCandidates.filter((modal) => modal.visible && (modal.rect.width > 240 || modal.rect.height > 120));
    visibleModals.forEach((modal) => {
      const normalizedText = normalizeText(modal.text);
      const blockingWords = ['aceptar', 'suscríbete', 'suscribete', 'registrate', 'regístrate', 'continuar', 'cookies', 'newsletter'];
      const containsBlockingPrompt = blockingWords.some((word) => normalizedText.includes(word));

      if (containsBlockingPrompt) {
        findings.push(buildFinding(
          PATTERN_META.obstruction,
          `Modal o overlay visible con texto: "${modal.text.slice(0, 160)}"`,
          modal.selector,
          'Alta',
          'Heurística DOM',
          modal.rect,
        ));
      }
    });

    const visibleButtons = snapshot.buttonCandidates.filter((button) => button.visible && button.text);
    const acceptButton = visibleButtons.find((button) => /aceptar|acepto|continuar|sí, aceptar|si, aceptar|permitir|comprar|suscribirme/.test(normalizeText(button.text)));
    const rejectButton = visibleButtons.find((button) => /rechazar|no gracias|configurar|más tarde|mas tarde|cancelar|omitir/.test(normalizeText(button.text)));

    if (acceptButton && rejectButton) {
      const acceptArea = acceptButton.rect.width * acceptButton.rect.height;
      const rejectArea = rejectButton.rect.width * rejectButton.rect.height;
      if (acceptArea > rejectArea * 1.8) {
        findings.push(buildFinding(
          PATTERN_META.visual_interference,
          `El botón de aceptación domina visualmente al de rechazo (${acceptButton.rect.width}x${acceptButton.rect.height} vs ${rejectButton.rect.width}x${rejectButton.rect.height}).`,
          `${acceptButton.selector} / ${rejectButton.selector}`,
          'Media',
          'Heurística DOM',
          acceptButton.rect,
        ));
      }
    }

    snapshot.linkCandidates.forEach((link) => {
      const text = normalizeText(link.text);
      if (/seguir sin|continuar sin|omitir|no gracias/.test(text) && link.visible) {
        findings.push(buildFinding(
          PATTERN_META.misdirection,
          `Acción secundaria con lenguaje de renuncia detectada: "${link.text}"`,
          link.selector,
          'Media',
          'Heurística DOM',
          link.rect,
        ));
      }
    });

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

  window.DARKWATCH_PATTERN_META = PATTERN_META;
  window.detectDarkPatterns = detectDarkPatterns;
})();
