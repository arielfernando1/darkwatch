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
const exportSiteBtn = document.getElementById('exportSiteBtn');
const exportComparativeBtn = document.getElementById('exportComparativeBtn');
const exportDatabaseBtn = document.getElementById('exportDatabaseBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyList = document.getElementById('historyList');
const historyPill = document.getElementById('historyPill');
const uniqueSitesPill = document.getElementById('uniqueSitesPill');

const HISTORY_KEY = 'analysisHistory';
let currentAnalysis = null;

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
    return null;
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    evidenceImage.src = dataUrl;
    evidenceLabel.textContent = target.name || 'Evidencia';
    evidenceMeta.textContent = `Selector: ${target.selector || 'No disponible'} · ${rect.width}x${rect.height}`;
    evidenceCard.classList.remove('hidden');
    return dataUrl;
  } catch (error) {
    resetEvidence();
    warningBox.textContent = `No se pudo capturar la evidencia visual: ${error.message}`;
    warningBox.classList.remove('hidden');
    return null;
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

function sanitizeFilename(value) {
  return (value || 'darkwatch-reporte')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9áéíóúüñ.-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function buildTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
}

function getHostSlug(url) {
  try {
    return sanitizeFilename(new URL(url).hostname || 'sitio');
  } catch {
    return 'sitio';
  }
}

function buildDownloadPath(reportType, sourceUrl, extension) {
  const host = sourceUrl ? getHostSlug(sourceUrl) : 'multi-sitio';
  const timestamp = buildTimestamp();
  return `DarkWatch/reportes/darkwatch-${reportType}-${host}-${timestamp}.${extension}`;
}

function downloadTextFile(relativePath, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  chrome.downloads.download(
    {
      url: objectUrl,
      filename: relativePath,
      saveAs: false,
      conflictAction: 'uniquify'
    },
    () => {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    }
  );
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url || '';
  }
}

function formatDate(iso) {
  if (!iso) return 'Sin fecha';
  try {
    return new Date(iso).toLocaleString('es-EC');
  } catch {
    return iso;
  }
}

function buildCurrentRecord(response, evidenceDataUrl) {
  return {
    id: `${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    url: response.url || pageUrl.textContent,
    title: response.title || 'Sin título',
    llmMode: response.llmMode || 'local',
    model: response.model || 'Local',
    riskLevel: response.riskLevel || 'low',
    summary: response.summary || '',
    warning: response.warning || '',
    stats: response.stats || {},
    findings: response.findings || [],
    screenshotTarget: response.screenshotTarget || null,
    evidenceImage: evidenceDataUrl || '',
  };
}

async function getHistory() {
  const data = await getStorage([HISTORY_KEY]);
  return Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
}

async function saveRecordToHistory(record) {
  const history = await getHistory();
  const storageSafeRecord = { ...record};
  const next = [storageSafeRecord, ...history].slice(0, 100);
  await setStorage({ [HISTORY_KEY]: next });
  await refreshHistoryPanel();
}

function aggregateHistory(history) {
  const uniqueSites = new Set();
  const findingsByPattern = {};
  const findingsBySeverity = {};
  const findingsByCategory = {};
  const findingsByEthics = {};
  const riskLevels = {};

  history.forEach((entry) => {
    uniqueSites.add(normalizeUrl(entry.url));
    riskLevels[entry.riskLevel] = (riskLevels[entry.riskLevel] || 0) + 1;
    (entry.findings || []).forEach((finding) => {
      findingsByPattern[finding.name] = (findingsByPattern[finding.name] || 0) + 1;
      findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] || 0) + 1;
      findingsByCategory[finding.category] = (findingsByCategory[finding.category] || 0) + 1;
      findingsByEthics[finding.ethicalReference] = (findingsByEthics[finding.ethicalReference] || 0) + 1;
    });
  });

  return {
    totalAnalyses: history.length,
    uniqueSites: uniqueSites.size,
    riskLevels,
    findingsByPattern,
    findingsBySeverity,
    findingsByCategory,
    findingsByEthics,
  };
}

function renderHistory(history) {
  const summaryData = aggregateHistory(history);
  historyPill.textContent = `${summaryData.totalAnalyses} registros`;
  uniqueSitesPill.textContent = `${summaryData.uniqueSites} sitios`;

  if (!history.length) {
    historyList.innerHTML = '<li class="empty">Todavía no se han guardado análisis.</li>';
    return;
  }

  historyList.innerHTML = history.slice(0, 5).map((entry) => {
    const host = (() => {
      try {
        return new URL(entry.url).hostname;
      } catch {
        return entry.url;
      }
    })();
    const findingsCount = Array.isArray(entry.findings) ? entry.findings.length : 0;
    const badge = entry.riskLevel === 'high' ? 'high' : entry.riskLevel === 'medium' ? 'medium' : 'low';
    const riskText = badge === 'high' ? 'Alto' : badge === 'medium' ? 'Medio' : 'Bajo';
    return `
      <li>
        <div class="history-line">
          <span class="history-title">${escapeHtml(entry.title)}</span>
          <span class="badge ${badge}">${escapeHtml(riskText)}</span>
        </div>
        <div class="history-domain">${escapeHtml(host)}</div>
        <div class="meta">${escapeHtml(formatDate(entry.analyzedAt))} · ${escapeHtml(findingsCount)} hallazgo(s)</div>
      </li>
    `;
  }).join('');
}

async function refreshHistoryPanel() {
  const history = await getHistory();
  renderHistory(history);
}

function buildSiteReportHtml(record) {
  const findingsRows = (record.findings || []).map((finding) => `
    <tr>
      <td>${escapeHtml(finding.name)}</td>
      <td>${escapeHtml(finding.category || '')}</td>
      <td>${escapeHtml(finding.severity || '')}</td>
      <td>${escapeHtml(finding.evidence || '')}</td>
      <td>${escapeHtml(finding.selector || '')}</td>
      <td>${escapeHtml(finding.ethicalReference || '')}</td>
    </tr>
  `).join('');

  const evidenceBlock = record.evidenceImage
    ? `<img src="${record.evidenceImage}" alt="Evidencia" style="max-width:100%;border:1px solid #ddd;border-radius:12px;">`
    : '<p>No se guardó evidencia visual para este reporte.</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>DarkWatch Reporte por sitio</title>
<style>
body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
h1 { margin-bottom: 4px; }
small { color: #6b7280; }
.card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; text-align: left; }
th { background: #f9fafb; }
.badge { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700; background:#e5e7eb; }
.badge.high { background:#fee2e2; color:#991b1b; }
.badge.medium { background:#fef3c7; color:#92400e; }
.badge.low { background:#dcfce7; color:#166534; }
</style>
</head>
<body>
  <h1>DarkWatch · Reporte por sitio</h1>
  <small>Generado: ${escapeHtml(formatDate(new Date().toISOString()))}</small>

  <div class="card">
    <h2>${escapeHtml(record.title)}</h2>
    <p><strong>URL:</strong> ${escapeHtml(record.url)}</p>
    <p><strong>Fecha de análisis:</strong> ${escapeHtml(formatDate(record.analyzedAt))}</p>
    <p><strong>Motor:</strong> ${escapeHtml(record.model)} (${escapeHtml(record.llmMode)})</p>
    <p><strong>Riesgo:</strong> <span class="badge ${escapeHtml(record.riskLevel)}">${escapeHtml(record.riskLevel)}</span></p>
    <p><strong>Resumen:</strong> ${escapeHtml(record.summary)}</p>
    <p><strong>Advertencia:</strong> ${escapeHtml(record.warning || 'Sin advertencias')}</p>
  </div>

  <div class="card">
    <h3>Métricas DOM</h3>
    <p>Texto: ${escapeHtml(record.stats?.textLength || 0)} · Botones: ${escapeHtml(record.stats?.buttonCount || 0)} · Modales: ${escapeHtml(record.stats?.modalCount || 0)} · Formularios: ${escapeHtml(record.stats?.formCount || 0)}</p>
  </div>

  <div class="card">
    <h3>Evidencia visual</h3>
    ${evidenceBlock}
  </div>

  <div class="card">
    <h3>Hallazgos</h3>
    <table>
      <thead>
        <tr>
          <th>Patrón</th>
          <th>Categoría</th>
          <th>Severidad</th>
          <th>Evidencia</th>
          <th>Selector</th>
          <th>Referencia ética</th>
        </tr>
      </thead>
      <tbody>
        ${findingsRows || '<tr><td colspan="6">No se detectaron patrones en este análisis.</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function buildComparativeHtml(history) {
  const summaryData = aggregateHistory(history);
  const rows = history.map((entry) => {
    const mainPatterns = (entry.findings || []).slice(0, 3).map((item) => item.name).join(', ') || 'Sin hallazgos';
    return `
      <tr>
        <td>${escapeHtml(formatDate(entry.analyzedAt))}</td>
        <td>${escapeHtml(entry.title)}</td>
        <td>${escapeHtml(entry.url)}</td>
        <td>${escapeHtml(entry.riskLevel)}</td>
        <td>${escapeHtml((entry.findings || []).length)}</td>
        <td>${escapeHtml(mainPatterns)}</td>
      </tr>
    `;
  }).join('');

  const listFromObject = (objectValue) => Object.entries(objectValue)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`)
    .join('') || '<li>Sin datos.</li>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>DarkWatch Reporte comparativo</title>
<style>
body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
.card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; text-align: left; }
th { background: #f9fafb; }
.grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
ul { margin: 0; padding-left: 18px; }
</style>
</head>
<body>
  <h1>DarkWatch · Reporte ético comparativo</h1>
  <p>Generado: ${escapeHtml(formatDate(new Date().toISOString()))}</p>

  <div class="card">
    <p><strong>Total de análisis:</strong> ${escapeHtml(summaryData.totalAnalyses)}</p>
    <p><strong>Sitios únicos:</strong> ${escapeHtml(summaryData.uniqueSites)}</p>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Hallazgos por patrón</h3>
      <ul>${listFromObject(summaryData.findingsByPattern)}</ul>
    </div>
    <div class="card">
      <h3>Hallazgos por severidad</h3>
      <ul>${listFromObject(summaryData.findingsBySeverity)}</ul>
    </div>
    <div class="card">
      <h3>Hallazgos por categoría</h3>
      <ul>${listFromObject(summaryData.findingsByCategory)}</ul>
    </div>
    <div class="card">
      <h3>Referencias éticas más frecuentes</h3>
      <ul>${listFromObject(summaryData.findingsByEthics)}</ul>
    </div>
  </div>

  <div class="card">
    <h3>Tabla de sitios analizados</h3>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Título</th>
          <th>URL</th>
          <th>Riesgo</th>
          <th>Hallazgos</th>
          <th>Patrones principales</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6">Todavía no hay análisis guardados.</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function buildDatabaseExport(history) {
  const summaryData = aggregateHistory(history);
  return {
    generatedAt: new Date().toISOString(),
    tool: 'DarkWatch',
    version: '0.4.0',
    totalAnalyses: summaryData.totalAnalyses,
    uniqueSites: summaryData.uniqueSites,
    summary: summaryData,
    analyses: history,
  };
}

exportSiteBtn.addEventListener('click', () => {
  if (!currentAnalysis) {
    summary.textContent = 'Primero ejecuta un análisis para exportar el reporte del sitio actual.';
    return;
  }

  const html = buildSiteReportHtml(currentAnalysis);
  const path = buildDownloadPath('site', currentAnalysis.url, 'html');
  downloadTextFile(path, html, 'text/html;charset=utf-8');
});

exportComparativeBtn.addEventListener('click', async () => {
  const history = await getHistory();
  const html = buildComparativeHtml(history);
  const path = buildDownloadPath('comparativo', null, 'html');
  downloadTextFile(path, html, 'text/html;charset=utf-8');
});

exportDatabaseBtn.addEventListener('click', async () => {
  const history = await getHistory();
  const payload = buildDatabaseExport(history);
  const path = buildDownloadPath('base-analisis', null, 'json');
  downloadTextFile(path, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
});

clearHistoryBtn.addEventListener('click', async () => {
  await setStorage({ [HISTORY_KEY]: [] });
  await refreshHistoryPanel();
  summary.textContent = 'Historial borrado. Ya puedes empezar una nueva ronda de análisis.';
  setRiskBadge('', 'Historial limpio');
});

async function analyzeTab(tabId) {
  setLoadingState(true);
  warningBox.classList.add('hidden');
  resetEvidence();

  chrome.tabs.sendMessage(tabId, { type: 'RUN_WEEK4_ANALYSIS' }, async (response) => {
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

    let evidenceDataUrl = '';
    if (response?.screenshotTarget) {
      evidenceDataUrl = await captureEvidence(response.screenshotTarget);
    }

    currentAnalysis = buildCurrentRecord(response, evidenceDataUrl);
    await saveRecordToHistory(currentAnalysis);
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
refreshHistoryPanel();
