chrome.tabs.query({ currentWindow: true }, (tabs) => {
  const container = document.getElementById("tabContainer");
  container.innerHTML = ""; // Clear loading text

  tabs.forEach(tab => {
    const tabDiv = document.createElement("div");
    tabDiv.className = "tab";
    tabDiv.innerHTML = `
      <img src="${tab.favIconUrl || ''}" width="16" height="16" style="vertical-align:middle; margin-right:8px;">
      <strong>${tab.title}</strong><br>
      <small>${tab.url}</small>
    `;
    container.appendChild(tabDiv);
  });
});

function saveSession(tabs) {
  chrome.storage.local.set({ savedTabs: tabs }, () => {
    console.log("Session saved.");
  });
}

function loadSession(callback) {
  chrome.storage.local.get("savedTabs", (data) => {
    callback(data.savedTabs || []);
  });
}