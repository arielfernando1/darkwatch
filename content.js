/* global isElementVisible, getElementText, getSimpleSelector, getContextText, toRectSummary, getElementRole */
/* global detectDarkPatterns, classifyDarkPatternsWithLLM */

function sliceElements(selector, mapper, limit) {
  return Array.from(document.querySelectorAll(selector)).slice(0, limit).map(mapper);
}

function collectPageSnapshot() {
  const bodyText = document.body?.innerText || '';

  const checkboxCandidates = sliceElements(
    'input[type="checkbox"], input[type="radio"]',
    (element) => ({
      checked: Boolean(element.checked),
      name: element.name || '',
      id: element.id || '',
      value: element.value || '',
      selector: getSimpleSelector(element),
      contextText: getContextText(element),
      visible: isElementVisible(element),
      rect: toRectSummary(element),
    }),
    60,
  );

  const buttonCandidates = sliceElements(
    'button, a, input[type="button"], input[type="submit"]',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
      role: getElementRole(element),
      rect: toRectSummary(element),
    }),
    120,
  );

  const modalCandidates = sliceElements(
    '[role="dialog"], dialog, .modal, .popup, .overlay, .newsletter, .cookie, .cookies, [aria-modal="true"]',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
      rect: toRectSummary(element),
    }),
    50,
  );

  const linkCandidates = sliceElements(
    'a, button',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
      rect: toRectSummary(element),
    }),
    120,
  );

  const formCandidates = sliceElements(
    'form, section, article, aside',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
      rect: toRectSummary(element),
    }),
    80,
  ).filter((item) => item.text);

  const timerCandidates = sliceElements(
    '[class*="countdown"], [id*="countdown"], [class*="timer"], [id*="timer"], [data-testid*="countdown"]',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
      rect: toRectSummary(element),
    }),
    20,
  );

  const stats = {
    textLength: bodyText.length,
    checkboxCount: checkboxCandidates.length,
    buttonCount: buttonCandidates.filter((item) => item.visible).length,
    modalCount: modalCandidates.filter((item) => item.visible).length,
    formCount: formCandidates.filter((item) => item.visible).length,
    timerCount: timerCandidates.filter((item) => item.visible).length,
  };

  return {
    url: window.location.href,
    title: document.title,
    bodyText,
    shortText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 3000),
    checkboxCandidates,
    buttonCandidates,
    modalCandidates,
    linkCandidates,
    formCandidates,
    timerCandidates,
    stats,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (value) => resolve(value));
  });
}

function severityRank(severity) {
  if (severity === 'Alta') return 3;
  if (severity === 'Media') return 2;
  return 1;
}

function getRiskLevel(findings) {
  if (findings.some((item) => item.severity === 'Alta')) return 'high';
  if (findings.some((item) => item.severity === 'Media')) return 'medium';
  return 'low';
}

function pickBestFallbackTarget(findings, snapshot) {
  const firstFinding = findings[0];
  if (!firstFinding) return null;

  const evidenceText = `${firstFinding.evidence || ''} ${firstFinding.name || ''} ${firstFinding.selector || ''}`.toLowerCase();
  const keywords = evidenceText
    .split(/[^a-z0-9áéíóúüñ]+/i)
    .filter((word) => word.length >= 4);

  const pools = [
    ...snapshot.modalCandidates,
    ...snapshot.timerCandidates,
    ...snapshot.formCandidates,
    ...snapshot.buttonCandidates,
    ...snapshot.linkCandidates,
  ];

  const visibleCandidates = pools.filter(
    (item) => item.visible && item.rect && item.rect.width > 0 && item.rect.height > 0
  );

  const matched = visibleCandidates.find((item) => {
    const text = `${item.text || ''} ${item.selector || ''}`.toLowerCase();
    return keywords.some((word) => text.includes(word));
  });

  return matched || visibleCandidates[0] || null;
}

function chooseScreenshotTarget(findings, snapshot) {
  const directCandidate = [...findings]
    .filter((item) => item.rect && item.rect.width > 0 && item.rect.height > 0)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];

  if (directCandidate) {
    return {
      name: directCandidate.name,
      selector: directCandidate.selector,
      rect: directCandidate.rect,
      devicePixelRatio: snapshot.devicePixelRatio || 1,
    };
  }

  const fallback = pickBestFallbackTarget(findings, snapshot);
  if (!fallback) {
    return null;
  }

  return {
    name: findings[0]?.name || 'Evidencia',
    selector: fallback.selector || findings[0]?.selector || 'No disponible',
    rect: fallback.rect,
    devicePixelRatio: snapshot.devicePixelRatio || 1,
  };
}

function buildSummary(title, findings, modelLabel) {
  if (!findings.length) {
    return `Análisis completado en ${title}. El motor ${modelLabel} no encontró patrones con las reglas y señales actuales.`;
  }

  return `Se detectaron ${findings.length} posible(s) patrón(es) oscuro(s) en ${title}. Clasificación realizada con ${modelLabel}.`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'RUN_WEEK4_ANALYSIS') {
    return undefined;
  }

  (async () => {
    const snapshot = collectPageSnapshot();
    const heuristicFindings = detectDarkPatterns(snapshot);
    const settings = await getStorage(['llmMode', 'remoteEndpoint', 'modelLabel']);
    const llmResult = await classifyDarkPatternsWithLLM({ snapshot, heuristicFindings }, settings);

    const findings = llmResult.findings || [];
    const riskLevel = getRiskLevel(findings);
    const summary = buildSummary(snapshot.title, findings, llmResult.model || settings.modelLabel || 'Local');
    const screenshotTarget = chooseScreenshotTarget(findings, snapshot);

    sendResponse({
      title: snapshot.title,
      url: snapshot.url,
      evaluatedAt: new Date().toISOString(),
      stats: snapshot.stats,
      findings,
      riskLevel,
      summary,
      model: llmResult.model || 'Local',
      llmMode: settings.llmMode || 'local',
      warning: llmResult.warning || '',
      screenshotTarget,
    });
  })();

  return true;
});
