const pageUrl = document.getElementById('pageUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsList = document.getElementById('resultsList');
const summary = document.getElementById('summary');
const riskBadge = document.getElementById('riskBadge');
const engineBadge = document.getElementById('engineBadge');
const countPill = document.getElementById('countPill');
const statsGrid = document.getElementById('statsGrid');
const warningBox = document.getElementById('warningBox');
const modeSelect = document.getElementById('modeSelect');
const remoteEndpoint = document.getElementById('remoteEndpoint');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const modeHint = document.getElementById('modeHint');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replace(/'/g, '&#039;');
}

function setRiskBadge(level, text) {
  riskBadge.className = 'badge';
  if (level) {
    riskBadge.classList.add(level);
  }
  riskBadge.textContent = text;
}

function setEngine(mode, model) {
  let label = 'LLM demo';
  let hint = 'demo local';

  if (mode === 'remote') {
    label = 'LLM remoto';
    hint = 'endpoint remoto';
  } else if (mode === 'remote-error') {
    label = 'Remoto con error';
    hint = 'fallback o fallo remoto';
  }

  engineBadge.textContent = model || label;
  modeHint.textContent = hint;
}
function renderStats(stats) {
  const values = [
    { label: 'texto', value: stats?.textLength || 0 },
    { label: 'botones', value: stats?.buttonCount || 0 },
    { label: 'modales', value: stats?.modalCount || 0 },
    { label: 'formularios', value: stats?.formCount || 0 },
  ];

  statsGrid.innerHTML = values
    .map((item) => `
      <div>
        <span class="stat-number">${escapeHtml(item.value)}</span>
        <span class="stat-label">${escapeHtml(item.label)}</span>
      </div>
    `)
    .join('');
}

function renderResults(results) {
  countPill.textContent = String(results.length);

  if (!results.length) {
    resultsList.innerHTML = '<li class="empty">No se detectaron patrones con el DOM capturado y la clasificación actual.</li>';
    return;
  }

  resultsList.innerHTML = results
    .map((item) => `
      <li>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="category">Categoría: ${escapeHtml(item.category || 'Sin categoría')}</div>
        <div>${escapeHtml(item.evidence || 'Sin evidencia textual.')}</div>
        <div class="meta">
          Severidad: ${escapeHtml(item.severity || 'Media')} ·
          Confianza: ${escapeHtml(item.confidence || 'Media')} ·
          Fuente: ${escapeHtml(item.source || 'LLM')}
        </div>
        <div class="meta">Selector: ${escapeHtml(item.selector || 'No disponible')}</div>
      </li>
    `)
    .join('');
}

function setLoadingState(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? 'Analizando…' : 'Analizar página';
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (value) => resolve(value));
  });
}

function setStorage(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set(value, () => resolve());
  });
}

async function loadSettings() {
  const settings = await getStorage(['llmMode', 'remoteEndpoint', 'modelLabel']);
  modeSelect.value = settings.llmMode || 'mock';
  remoteEndpoint.value = settings.remoteEndpoint || '';
  setEngine(settings.llmMode || 'mock', settings.modelLabel || 'DarkWatch Mock LLM v0.2');
}

saveSettingsBtn.addEventListener('click', async () => {
  const payload = {
    llmMode: modeSelect.value,
    remoteEndpoint: remoteEndpoint.value.trim(),
    modelLabel: modeSelect.value === 'remote' ? 'LLM remoto' : 'DarkWatch Mock LLM v0.2',
  };

  await setStorage(payload);
  setEngine(payload.llmMode, payload.modelLabel);
  summary.textContent = 'Configuración guardada. Ya puedes ejecutar el análisis con el motor seleccionado.';
  setRiskBadge('', 'Configurado');
});

function analyzeTab(tabId) {
  setLoadingState(true);
  warningBox.classList.add('hidden');

  chrome.tabs.sendMessage(tabId, { type: 'RUN_WEEK2_ANALYSIS' }, (response) => {
    setLoadingState(false);

    if (chrome.runtime.lastError) {
      summary.textContent = 'No se pudo analizar esta página. Prueba recargarla e intenta de nuevo.';
      setRiskBadge('', 'Error');
      renderResults([]);
      warningBox.textContent = 'La extensión no recibió respuesta del content script.';
      warningBox.classList.remove('hidden');
      return;
    }

    summary.textContent = response?.summary || 'Análisis completado.';
    renderStats(response?.stats || {});
    renderResults(response?.findings || []);
    setEngine(response?.llmMode || 'mock', response?.model || 'LLM');

    const level = response?.riskLevel || 'low';
    const label = level === 'high' ? 'Riesgo alto' : level === 'medium' ? 'Riesgo medio' : 'Riesgo bajo';
    setRiskBadge(level, label);

    if (response?.warning) {
      warningBox.textContent = response.warning;
      warningBox.classList.remove('hidden');
    }
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0];
  pageUrl.textContent = activeTab?.url || 'No disponible';
});

analyzeBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    if (!activeTab?.id) {
      summary.textContent = 'No se pudo obtener la pestaña activa.';
      setRiskBadge('', 'Error');
      return;
    }

    analyzeTab(activeTab.id);
  });
});

loadSettings();
