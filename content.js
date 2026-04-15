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
    }),
    120,
  );

  const formCandidates = sliceElements(
    'form, section, article, aside',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
    }),
    80,
  ).filter((item) => item.text);

  const timerCandidates = sliceElements(
    '[class*="countdown"], [id*="countdown"], [class*="timer"], [id*="timer"], [data-testid*="countdown"]',
    (element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
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
    shortText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 2500),
    checkboxCandidates,
    buttonCandidates,
    modalCandidates,
    linkCandidates,
    formCandidates,
    timerCandidates,
    stats,
  };
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (value) => resolve(value));
  });
}

function getRiskLevel(findings) {
  if (findings.some((item) => item.severity === 'Alta')) {
    return 'high';
  }

  if (findings.some((item) => item.severity === 'Media')) {
    return 'medium';
  }

  return 'low';
}

function buildSummary(title, findings, modelLabel) {
  if (!findings.length) {
    return `Análisis completado en ${title}. El clasificador ${modelLabel} no encontró patrones con las reglas y señales actuales.`;
  }

  return `Se detectaron ${findings.length} posible(s) patrón(es) oscuro(s) en ${title}. Clasificación realizada con ${modelLabel}.`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'RUN_WEEK2_ANALYSIS') {
    return undefined;
  }

  (async () => {
    try {
      const snapshot = collectPageSnapshot();
      const heuristicFindings = detectDarkPatterns(snapshot);
      const settings = await getStorage(['llmMode', 'remoteEndpoint', 'modelLabel']);

      console.log('SETTINGS EN CONTENT:', settings);

      const llmResult = await classifyDarkPatternsWithLLM(
        {
          snapshot,
          heuristicFindings,
        },
        settings
      );

      const findings = llmResult.findings || [];
      const riskLevel = getRiskLevel(findings);
      const summary = buildSummary(
        snapshot.title,
        findings,
        llmResult.model || settings.modelLabel || 'LLM'
      );

      sendResponse({
        title: snapshot.title,
        url: snapshot.url,
        findings,
        summary,
        heuristicCount: heuristicFindings.length,
        llmMode: llmResult.effectiveMode || settings.llmMode || 'mock',
        model: llmResult.model || settings.modelLabel || 'LLM',
        warning: llmResult.warning || '',
        promptPreview: llmResult.prompt?.slice(0, 1500) || '',
        stats: snapshot.stats,
        riskLevel,
      });
    } catch (error) {
      console.error('ERROR EN CONTENT:', error);

      sendResponse({
        title: document.title,
        url: window.location.href,
        findings: [],
        summary: 'Ocurrió un error durante el análisis.',
        heuristicCount: 0,
        llmMode: 'remote-error',
        model: 'Error',
        warning: error.message || 'Error desconocido en content.js',
        promptPreview: '',
        stats: {
          textLength: 0,
          buttonCount: 0,
          modalCount: 0,
          formCount: 0,
        },
        riskLevel: 'low',
      });
    }
  })();

  return true;
});