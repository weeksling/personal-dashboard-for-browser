// Open the dashboard page when the extension icon is clicked.
// The resulting URL (chrome-extension://<id>/index.html) can be
// pinned in Arc's sidebar as a persistent dashboard page.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
