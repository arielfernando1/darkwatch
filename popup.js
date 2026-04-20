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
const testBackendBtn = document.getElementById('testBackendBtn');
const modeHint = document.getElementById('modeHint');
const evidenceCard = document.getElementById('evidenceCard');
const evidenceImage = document.getElementById('evidenceImage');
const evidenceLabel = document.getElementById('evidenceLabel');
const evidenceMeta = document.getElementById('evidenceMeta');

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
  engineBadge.textContent = model || (mode === 'remote' ? 'Backend' : 'Local');
  modeHint.textContent = mode === 'remote' ? 'backend Python / remoto' : 'heurísticas locales';
}

function renderStats(stats) {
  const values = [
    { label: 'texto', value: stats?.textLength || 0 },
    { label: 'botones', value: stats?.buttonCount || 0 },
    { label: 'modales', value: stats?.modalCount || 0 },
    { label: 'formularios', value: stats?.formCount || 0 },
  ];

  statsGrid.innerHTML = values.map((item) => `
    <div>
      <span class="stat-number">${escapeHtml(item.value)}</span>
      <span class="stat-label">${escapeHtml(item.label)}</span>
    </div>
  `).join('');
}

function renderResults(results) {
  countPill.textContent = String(results.length);

  if (!results.length) {
    resultsList.innerHTML = '<li class="empty">No se detectaron patrones con el DOM capturado y la clasificación actual.</li>';
    return;
  }

  resultsList.innerHTML = results.map((item) => `
    <li>
      <strong>${escapeHtml(item.name)}</strong>
      <div class="category">Categoría: ${escapeHtml(item.category || 'Sin categoría')}</div>
      <div>${escapeHtml(item.evidence || 'Sin evidencia textual.')}</div>
      <div class="meta">
        Severidad: ${escapeHtml(item.severity || 'Media')} ·
        Confianza: ${escapeHtml(item.confidence || 'Media')} ·
        Fuente: ${escapeHtml(item.source || 'Local')}
      </div>
      <div class="meta">Selector: ${escapeHtml(item.selector || 'No disponible')}</div>
      <div class="meta">Ética: ${escapeHtml(item.ethicalReference || 'Catálogo interno DarkWatch')}</div>
    </li>
  `).join('');
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
  modeSelect.value = settings.llmMode || 'local';
  remoteEndpoint.value = settings.remoteEndpoint || 'http://127.0.0.1:8000/api/classify';
  setEngine(settings.llmMode || 'local', settings.modelLabel || 'Local');
}

saveSettingsBtn.addEventListener('click', async () => {
  const payload = {
    llmMode: modeSelect.value,
    remoteEndpoint: remoteEndpoint.value.trim(),
    modelLabel: modeSelect.value === 'remote' ? 'Backend Python' : 'Local',
  };

  await setStorage(payload);
  setEngine(payload.llmMode, payload.modelLabel);
  summary.textContent = 'Configuración guardada. Ya puedes ejecutar el análisis con el motor seleccionado.';
  setRiskBadge('', 'Configurado');
});

async function testBackend() {
  const endpoint = remoteEndpoint.value.trim();
  if (!endpoint) {
    summary.textContent = 'Primero coloca una URL de backend.';
    setRiskBadge('', 'Sin URL');
    return;
  }

  const healthUrl = endpoint.replace(/\/api\/classify$/i, '/health');
  try {
    const response = await fetch(healthUrl);
    if (!response.ok) {
      throw new Error(`Estado ${response.status}`);
    }
    const data = await response.json();
    summary.textContent = `Backend activo. Proveedor: ${data.provider}. Modelo: ${data.model || 'sin configurar'}.`;
    setRiskBadge('low', 'Backend OK');
  } catch (error) {
    summary.textContent = `No se pudo conectar con el backend: ${error.message}`;
    setRiskBadge('', 'Backend error');
  }
}

testBackendBtn.addEventListener('click', testBackend);

function resetEvidence() {
  evidenceCard.classList.add('hidden');
  evidenceImage.removeAttribute('src');
  evidenceLabel.textContent = 'Sin recorte';
  evidenceMeta.textContent = 'Se recorta el primer hallazgo con coordenadas visibles.';
}

async function captureEvidence(target) {
  if (!target?.rect) {
    resetEvidence();
    return;
  }

  try {
    const imageUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
    const image = await loadImage(imageUrl);
    const rect = target.rect;
    const pixelRatio = target.devicePixelRatio || 1;
    const padding = 16;

    const sx = Math.max(0, Math.round((rect.left - padding) * pixelRatio));
    const sy = Math.max(0, Math.round((rect.top - padding) * pixelRatio));
    const sw = Math.min(image.width - sx, Math.round((rect.width + padding * 2) * pixelRatio));
    const sh = Math.min(image.height - sy, Math.round((rect.height + padding * 2) * pixelRatio));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const context = canvas.getContext('2d');
    context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    evidenceImage.src = canvas.toDataURL('image/png');
    evidenceLabel.textContent = target.name || 'Evidencia';
    evidenceMeta.textContent = `Selector: ${target.selector || 'No disponible'} · ${rect.width}x${rect.height}`;
    evidenceCard.classList.remove('hidden');
  } catch (error) {
    resetEvidence();
    warningBox.textContent = `No se pudo capturar la evidencia visual: ${error.message}`;
    warningBox.classList.remove('hidden');
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function analyzeTab(tabId) {
  setLoadingState(true);
  warningBox.classList.add('hidden');
  resetEvidence();

  chrome.tabs.sendMessage(tabId, { type: 'RUN_WEEK3_ANALYSIS' }, async (response) => {
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
    setEngine(response?.llmMode || 'local', response?.model || 'Local');

    const level = response?.riskLevel || 'low';
    const label = level === 'high' ? 'Riesgo alto' : level === 'medium' ? 'Riesgo medio' : 'Riesgo bajo';
    setRiskBadge(level, label);

    if (response?.warning) {
      warningBox.textContent = response.warning;
      warningBox.classList.remove('hidden');
    }

    if (response?.screenshotTarget) {
      await captureEvidence(response.screenshotTarget);
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
