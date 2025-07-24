chrome.commands.onCommand.addListener((command) => {
  if (command === "open-workspace") {
    chrome.tabs.query({}, (tabs) => {
      // Look for existing TabSpace tab
      const workspaceTab = tabs.find(tab => 
        tab.url && tab.url.includes("workspace.html")
      );
      
      if (workspaceTab) {
        // Switch to existing tab
        chrome.tabs.update(workspaceTab.id, { active: true });
        chrome.windows.update(workspaceTab.windowId, { focused: true });
      } else {
        // Create new workspace tab
        chrome.tabs.create({ 
          url: chrome.runtime.getURL("workspace.html") 
        });
      }
    });
  }
});