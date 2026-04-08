const pageUrl = document.getElementById('pageUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsList = document.getElementById('resultsList');
const summary = document.getElementById('summary');
const badge = document.getElementById('badge');

function setBadge(level, text) {
  badge.className = 'badge';

  if (level) {
    badge.classList.add(level);
  }

  badge.textContent = text;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderResults(results) {
  if (!results.length) {
    resultsList.innerHTML = '<li class="empty">No se detectaron patrones con las reglas actuales.</li>';
    return;
  }

  resultsList.innerHTML = results
    .map((item) => {
      const evidence = escapeHtml(item.evidence || 'Sin evidencia textual.');
      const severity = escapeHtml(item.severity || 'Baja');
      const selector = escapeHtml(item.selector || 'No disponible');

      return `
        <li>
          <strong>${escapeHtml(item.name)}</strong>
          <div>${evidence}</div>
          <div class="meta">Severidad: ${severity} · Selector: ${selector}</div>
        </li>
      `;
    })
    .join('');
}

function analyzeTab(tabId) {
  chrome.tabs.sendMessage(tabId, { type: 'RUN_ANALYSIS' }, (response) => {
    if (chrome.runtime.lastError) {
      summary.textContent = 'No se pudo analizar esta página. Prueba recargarla e intenta de nuevo.';
      setBadge('', 'Error');
      resultsList.innerHTML = '<li class="empty">La extensión no recibió respuesta del content script.</li>';
      return;
    }

    const findings = response?.findings || [];
    const maxSeverity = response?.maxSeverity || 'low';
    const total = findings.length;

    if (total === 0) {
      summary.textContent = `Análisis completado en ${response?.title || 'la página actual'}. No se detectaron patrones con las reglas de la semana 1.`;
      setBadge('low', 'Bajo riesgo');
      renderResults(findings);
      return;
    }

    const badgeLabel = maxSeverity === 'high'
      ? 'Riesgo alto'
      : maxSeverity === 'medium'
        ? 'Riesgo medio'
        : 'Riesgo bajo';

    summary.textContent = `Se detectaron ${total} posible(s) patrón(es) oscuro(s) en ${response?.title || 'la página actual'}.`;
    setBadge(maxSeverity, badgeLabel);
    renderResults(findings);
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const [activeTab] = tabs;
  pageUrl.textContent = activeTab?.url || 'No disponible';
});

analyzeBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [activeTab] = tabs;

    if (!activeTab?.id) {
      summary.textContent = 'No se pudo obtener la pestaña activa.';
      setBadge('', 'Error');
      return;
    }

    analyzeTab(activeTab.id);
  });
});
