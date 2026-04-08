/* global detectDarkPatterns */

function collectPageSnapshot() {
  const bodyText = document.body?.innerText || '';
  const checkboxCandidates = Array.from(
    document.querySelectorAll('input[type="checkbox"], input[type="radio"]')
  ).map((element) => ({
    checked: Boolean(element.checked),
    name: element.name || '',
    id: element.id || '',
    value: element.value || '',
    selector: getSimpleSelector(element),
    contextText: element.closest('label, form, div, section')?.innerText?.slice(0, 200) || ''
  }));

  const buttonCandidates = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
    .slice(0, 80)
    .map((element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      width: Math.round(element.getBoundingClientRect().width || 0),
      height: Math.round(element.getBoundingClientRect().height || 0),
      visible: isElementVisible(element)
    }));

  const modalCandidates = Array.from(document.querySelectorAll('[role="dialog"], dialog, .modal, .popup, .overlay, .newsletter, .cookie, .cookies'))
    .slice(0, 40)
    .map((element) => ({
      text: getElementText(element),
      selector: getSimpleSelector(element),
      visible: isElementVisible(element),
      width: Math.round(element.getBoundingClientRect().width || 0),
      height: Math.round(element.getBoundingClientRect().height || 0)
    }));

  return {
    url: window.location.href,
    title: document.title,
    bodyText,
    checkboxCandidates,
    buttonCandidates,
    modalCandidates
  };
}

function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function getElementText(element) {
  return (element.innerText || element.value || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function getSimpleSelector(element) {
  if (!element) {
    return 'unknown';
  }

  if (element.id) {
    return `#${element.id}`;
  }

  const className = typeof element.className === 'string'
    ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';

  return className ? `${element.tagName.toLowerCase()}.${className}` : element.tagName.toLowerCase();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'RUN_ANALYSIS') {
    return;
  }

  const snapshot = collectPageSnapshot();
  const findings = detectDarkPatterns(snapshot);

  sendResponse({
    title: snapshot.title,
    url: snapshot.url,
    findings,
    maxSeverity: findings.reduce((acc, item) => {
      if (item.severity === 'Alta') {
        return 'high';
      }

      if (item.severity === 'Media' && acc !== 'high') {
        return 'medium';
      }

      return acc;
    }, 'low')
  });
});
