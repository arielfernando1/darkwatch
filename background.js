const DEFAULT_SETTINGS = {
  llmMode: 'mock',
  remoteEndpoint: '',
  modelLabel: 'DarkWatch Mock LLM v0.2',
  analysisHistory: [],
};

function mergeWithDefaults(stored) {
  return {
    ...DEFAULT_SETTINGS,
    ...(stored || {}),
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (stored) => {
    chrome.storage.local.set(mergeWithDefaults(stored));
  });
});
