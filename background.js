
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab.url) return;
  // Only inject on the allowed pattern
  const allow = /^https:\/\/connect\.bracu\.ac\.bd\/app\/exam-controller\/mark-entry\/final\//.test(tab.url);
  if (!allow) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"]
    });
  } catch (e) {
    console.error("Injection failed:", e);
  }
});
