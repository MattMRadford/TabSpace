document.getElementById("launchBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("workspace.html") });
});