function normalizeSpaces(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

window.isElementVisible = function isElementVisible(element) {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
};

window.getElementText = function getElementText(element) {
  return normalizeSpaces(element?.innerText || element?.value || element?.textContent || '').slice(0, 320);
};

window.getSimpleSelector = function getSimpleSelector(element) {
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
};

window.getContextText = function getContextText(element) {
  const container = element?.closest('label, form, div, section, article, li, aside');
  return normalizeSpaces(container?.innerText || '').slice(0, 220);
};

window.toRectSummary = function toRectSummary(element) {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width || 0),
    height: Math.round(rect.height || 0),
    top: Math.round(rect.top || 0),
    left: Math.round(rect.left || 0),
  };
};

window.getElementRole = function getElementRole(element) {
  return normalizeSpaces(
    element?.getAttribute('role') ||
    element?.getAttribute('aria-label') ||
    element?.getAttribute('type') ||
    '',
  );
};
