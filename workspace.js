import nlp from 'compromise';

// Add this near the top with other globals
let analytics = {
  groupsCreated: 0,
  tabsOrganized: 0,
  focusSessions: 0,
  sessionsUsed: 0,
  totalUsageTime: 0,
  lastUsed: Date.now()
};

// Load existing analytics
chrome.storage.local.get("tabspaceAnalytics", (data) => {
  if (data.tabspaceAnalytics) {
    analytics = { ...analytics, ...data.tabspaceAnalytics };
  }
});

// Function to save analytics
function saveAnalytics() {
  analytics.lastUsed = Date.now();
  chrome.storage.local.set({ tabspaceAnalytics: analytics });
}

// Function to track events
function trackEvent(eventType, count = 1) {
  switch(eventType) {
    case 'groupCreated':
      analytics.groupsCreated += count;
      break;
    case 'tabsOrganized':
      analytics.tabsOrganized += count;
      break;
    case 'focusUsed':
      analytics.focusSessions += count;
      break;
    case 'sessionUsed':
      analytics.sessionsUsed += count;
      break;
  }
  saveAnalytics();
}

// Show analytics panel


function displayAnalytics() {
  const panel = document.getElementById("analyticsPanel");
  const content = document.getElementById("analyticsContent");
  
  const daysUsed = Math.max(1, Math.floor((Date.now() - (analytics.lastUsed || Date.now())) / (1000 * 60 * 60 * 24)));
  
  content.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-number">${analytics.groupsCreated}</div>
        <div class="stat-label">Groups Created</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analytics.tabsOrganized}</div>
        <div class="stat-label">Tabs Organized</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analytics.focusSessions}</div>
        <div class="stat-label">Focus Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${analytics.sessionsUsed}</div>
        <div class="stat-label">Sessions Saved</div>
      </div>
    </div>
    <div class="insights">
      <p>💡 You've organized ${analytics.tabsOrganized} tabs into ${analytics.groupsCreated} groups!</p>
      ${analytics.focusSessions > 0 ? `<p>🎯 Focus mode helped you concentrate ${analytics.focusSessions} times</p>` : ''}
    </div>
  `;
  
  panel.style.display = "block";
}

let pendingTabIds = new Set();
let unsortedTabs = [];
const chromeColors = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'
];

const colorMap = {
  grey:   '#80868b',
  blue:   '#3c78d8',
  red:    '#e06666',
  yellow: '#ffd966',
  green:  '#93c47d',
  pink:   '#d5a6bd',
  purple: '#a64d79',
  cyan:   '#76d7c4'
};

const emojiMap = {
  "🌐": ["web", "browser", "online", "internet", "url", "surfing", "tab", "chrome"],
  "💻": ["code", "dev", "frontend", "backend", "programming", "javascript", "html", "css", "software", "terminal", "github", "api", "node", "react", "vue", "docker", "script"],
  "🔧": ["tool", "utility", "extension", "plugin", "config", "addon", "setup", "framework", "feature"],
  "📚": ["study", "learn", "tutorial", "course", "school", "education", "research", "assignment", "notes", "docs", "reference", "reading", "book"],
  "🧠": ["workspace", "dashboard", "planner", "kanban", "organize", "system", "routine", "focus", "notion", "workflow", "project"],
  "👥": ["reddit", "forum", "thread", "community", "discussion", "social", "chat", "platform", "group"],
  "🎥": ["video", "youtube", "stream", "watch", "movie", "media", "clip", "trailer", "netflix", "film", "series", "entertainment"],
  "🎧": ["audio", "music", "playlist", "spotify", "sound", "radio", "tune", "mp3", "track", "listen"],
  "📰": ["news", "update", "politics", "world", "headlines", "report", "press", "briefing", "cnn", "bbc"],
  "📄": ["document", "pdf", "note", "writing", "form", "presentation", "slide", "spreadsheet", "sheet", "docs"],
  "📧": ["email", "inbox", "gmail", "outlook", "message", "compose", "mail", "reply", "draft"],
  "📅": ["calendar", "event", "meeting", "schedule", "appointment", "agenda", "invite", "zoom", "date"],
  "🛍️": ["shopping", "buy", "cart", "store", "amazon", "checkout", "product", "ecommerce", "deal", "discount", "coupon"],
  "💬": ["chat", "text", "message", "telegram", "whatsapp", "slack", "discord", "ping", "notification"],
  "🏦": ["finance", "bank", "money", "investment", "stocks", "crypto", "wallet", "payment", "budget", "paypal", "tax", "account"],
  "🌍": ["travel", "trip", "hotel", "flight", "map", "gps", "guide", "location", "airbnb", "journey"],
  "📸": ["design", "figma", "creative", "image", "photo", "art", "graphic", "illustration", "icon", "ui", "ux", "portfolio"],
  "🎮": ["game", "gaming", "steam", "xbox", "ps5", "nintendo", "play", "controller", "quest", "match", "level"],
  "🔬": ["science", "technology", "experiment", "biology", "chemistry", "physics", "data", "space", "robot", "ai", "nasa", "lab"],
  "🧪": ["test", "demo", "sandbox", "try", "prototype", "preview", "experiment", "beta", "mock"],
  "🔒": ["security", "privacy", "password", "login", "auth", "vpn", "secure", "encryption", "2fa"],
  "💼": ["work", "job", "career", "resume", "portfolio", "linkedin", "office", "tasks", "roles", "company", "hiring"],
  "💡": ["general", "info", "reference", "concept", "overview", "thought", "misc", "insight"],
  "🗂️": ["folder", "files", "group", "collection", "storage", "default", "archive"]
};

function getNextColor(index) {
  return chromeColors[index % chromeColors.length];
}
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) pendingTabIds.add(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!pendingTabIds.has(tabId)) return;

  chrome.tabs.get(tabId, (updatedTab) => {
    if (!updatedTab || !updatedTab.url || !updatedTab.title) return;
    if (
      updatedTab.url.startsWith("chrome://") ||
      updatedTab.url.includes("tabspace.html")
    ) return;

    // ✅ Only push updated tab with real favicon
    unsortedTabs.push(updatedTab);
    pendingTabIds.delete(tabId);

    renderUnsortedGroup();
    triggerAIHighlight(true);
  });
});

document.getElementById("tabSearch").addEventListener("input", () => {
  const query = document.getElementById("tabSearch").value.toLowerCase();
  filterTabs(query);
  if (query === "") {
    document.getElementById("refreshBtn")?.click();
  }
 
});

function filterTabs(query) {
  const allCards = document.querySelectorAll(".tab-card");
  allCards.forEach(card => {
    const title = card.querySelector(".title")?.textContent.toLowerCase() || "";
    const url = card.querySelector(".url")?.textContent.toLowerCase() || "";

    if (title.includes(query) || url.includes(query)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function triggerAIHighlight(state) {
  const aiBtn = document.getElementById("groupBtn"); // your existing button
  if (!aiBtn) return;

  if (state) {
    aiBtn.classList.add("ai-glow");
  } else {
    aiBtn.classList.remove("ai-glow");
  }
}

function renderUnsortedGroup() {
  const tabList = document.getElementById("tabList");
  if (!tabList) return;

  // If no unsorted tabs, remove group and bail
  if (unsortedTabs.length === 0) {
    document.getElementById("unsortedGroup")?.remove();
    triggerAIHighlight(false);
    return;
  }

  let container = document.getElementById("unsortedGroup");
  if (!container) {
    container = document.createElement("div");
    container.id = "unsortedGroup";
    container.className = "tab-group";

    const heading = document.createElement("h3");
    heading.textContent = "Unsorted Tabs";
    heading.style.color = "#666";
    heading.style.marginTop = "12px";
    container.appendChild(heading);
    tabList.appendChild(container);
  }

  // Clear only the tab cards (not the container)
  container.querySelectorAll(".tab-card").forEach(card => card.remove());

  unsortedTabs.forEach(tab => {
    const card = document.createElement("div");
    card.className = "tab-card";

    const icon = document.createElement("img");
    icon.src = tab.favIconUrl || "default-icon.png";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = tab.title;

    const openBtn = document.createElement("button");
    openBtn.className = "open-btn";
    openBtn.textContent = "GoTo";
    openBtn.onclick = () => chrome.tabs.update(tab.id, { active: true });

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(openBtn);
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "✖";
    closeBtn.onclick = () => {
      chrome.tabs.remove(tab.id);
    };
  
  card.appendChild(closeBtn); // 🔥 Adds the ✖
    container.appendChild(card);
  });
  
}

chrome.tabs.onRemoved.addListener((closedTabId) => {
  unsortedTabs = unsortedTabs.filter(tab => tab.id != closedTabId);

  renderUnsortedGroup();      // Re-render the group minus the closed tab
  if (unsortedTabs.length === 0) {
    triggerAIHighlight(false);
    document.getElementById("unsortedGroup")?.remove();
  }

  document.getElementById("refreshBtn")?.click();
});

let lastGroupedTitles = null; // Save this globally
chrome.storage.local.get("tabspaceGroups", (data) => {
  if (data.tabspaceGroups) {
    lastGroupedTitles = {};

    // Convert groups of tab objects into groups of titles
    for (const [groupName, tabs] of Object.entries(data.tabspaceGroups)) {
      lastGroupedTitles[groupName] = tabs.map(tab => tab.title);
    }

    // Optional: render using current live tabs instead of old tab objects
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const updatedGroups = {};

      for (const [groupName, titles] of Object.entries(lastGroupedTitles)) {
        updatedGroups[groupName] = titles.map(title =>
          tabs.find(tab => tab.title === title)
        ).filter(Boolean);
      }
      const nonEmptyGroups = Object.fromEntries(
        Object.entries(updatedGroups).filter(([, tabs]) => tabs.length > 0)
      );

      renderGroupedTabs(nonEmptyGroups);
    });
  }
});
// Save session
document.getElementById("saveBtn").addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const simplifiedTabs = tabs.map(tab => ({
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl
    }));
    chrome.storage.local.set({ savedTabs: simplifiedTabs }, () => {
      alert("Session saved!");
    });
  });
});

//refresh 
document.getElementById("refreshBtn").onclick = () => {
  if (!lastGroupedTitles) return;

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const updatedGroups = {};

    for (const groupName in lastGroupedTitles) {
      const idList = lastGroupedTitles[groupName]
        .map(id => parseInt(id, 10)) // normalize ID type
        .filter(Number.isInteger);

      updatedGroups[groupName] = tabs.filter(tab => idList.includes(tab.id));
      console.log(`🔍 Refreshing group "${groupName}" with IDs:`, idList);
      console.log(`🎯 Matched tabs:`, updatedGroups[groupName].map(t => t.title));
    }

    const nonEmptyGroups = Object.fromEntries(
      Object.entries(updatedGroups).filter(([, tabs]) => tabs.length > 0)
    );

    const groupColors = {};

    chrome.tabGroups.query({}, async (groups) => {
      for (const group of groups) {
        const groupId = group.id;
        const title = group.title;
        const colorName = group.color;
        const hex = colorMap[colorName];
        groupColors[title] = hex;
      }

      renderGroupedTabs(nonEmptyGroups, groupColors);
    });

    //renderGroupedTabs(nonEmptyGroups);
    if (unsortedTabs.length > 0) {
      renderUnsortedGroup();
    }
  });

  document.getElementById("tabSearch").value = "";
};
// Restore session
document.getElementById("restoreBtn").addEventListener("click", () => {
  chrome.storage.local.get("savedTabs", (data) => {
    const savedTabs = data.savedTabs || [];
    savedTabs.forEach(tab => {
      chrome.tabs.create({ url: tab.url });
    });
  });
});

// Render current tabs

chrome.storage.local.get("tabspaceGroups", (data) => {
  const savedGroups = data.tabspaceGroups;

  if (savedGroups) {
    const nonEmptyGroups = Object.fromEntries(
      Object.entries(savedGroups).filter(([, tabs]) => tabs.length > 0)
    );

    renderGroupedTabs(nonEmptyGroups); // Restores layout visually
    //applyChromeTabGroups(savedGroups); // (Optional) Reapply tab groups in Chrome
  } else {
    // Fallback to live tabs
    chrome.tabs.query({ currentWindow: true }, renderTabs);
  }
});


function renderTabs(tabs) {
  console.log("Render normal tabs");
  const tabList = document.getElementById("tabList");


  tabList.innerHTML = "";

  tabs.forEach(tab => {
    const card = document.createElement("div");
    card.className = "tab-card";

    const icon = document.createElement("img");
    icon.src = tab.favIconUrl || "default-icon.png";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = tab.title;

    const openBtn = document.createElement("button");
    openBtn.className = "open-btn";
    openBtn.textContent = "GoTo";
    openBtn.onclick = () => {
        chrome.tabs.query({}, (allTabs) => {
            const match = allTabs.find(t => t.url === tab.url);
            if (match) {
            chrome.tabs.update(match.id, { active: true });
            chrome.windows.update(match.windowId, { focused: true });
            } else {
            chrome.tabs.create({ url: tab.url });
    }
  });
};

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(openBtn);
    tabList.appendChild(card);
  });
}

document.getElementById("groupBtn").addEventListener("click", async () => {
    console.log("Group button clicked");
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
        const enrichedTabs = tabs.map(tab => {
          const urlObj = new URL(tab.url);
          const domain = urlObj.hostname.replace(/^www\./, "");

          return {
            id: tab.id,
            title: tab.title,            // raw title for matching
            domain,                      // helpful for grouping
            enriched: `${tab.title} [${domain}]`  // what gets sent to GPT
          };
        });

       
        const mode = document.getElementById("groupMode").value;
        let prompt;

        if (mode === "content") {
          prompt = `
        Group the following browser tabs into categories based on their purpose, subject matter, and task focus.
        Separate tabs even if they come from the same platform when their content differs.
        Use only the "enriched" strings to determine groups, but in your response, return an object where each key is a group name, and each value is a list of the tab IDs as shown.
        Avoid splitting tabs into overly specific buckets. Make the group names easy to recognize for humans and at most 22 characters. Respond only with a JSON object using the format:

        {
          "Group Name 1": ["Tab 1 ID", "Tab 2 ID"],
          "Group Name 2": ["Tab 3 ID", ...]
        }

        Tab info:\n\n${JSON.stringify(enrichedTabs, null, 2)}
        `;
        } else {
          prompt = `
            Group the following browser tabs based on their technical or platform type—such as media, social, forum, documentation, tool, workspace, etc.

            Each tab contains a title and its domain name. Use the domain to infer whether it is a video site, forum, design platform, documentation hub, or app. For example, group Reddit as “Discussion,” GitHub as “Code,” YouTube as “Video,” Notion as “Workspace,” etc.
            Use only the "enriched" strings to determine groups, but in your response, return an object where each key is a group name, and each value is a list of the tab IDs as shown.
            Avoid splitting tabs into overly specific buckets and be sure include ALL tabs! If a tab doesn't fit into any groups you may make it its own group. Make the group names easy to recognize for humans and at most 22 characters. Return only a JSON object in this format:

            {
              "Group Name": ["Tab 1 ID", "Tab 2 ID"],
              "Another Group": ["Tab 3 ID", ...]
            }

            Tab list:\n\n${JSON.stringify(enrichedTabs, null, 2)}
            `;
        }
        document.getElementById("loadingSpinner").style.display = "inline-block";

          try {
            const response = await fetch("https://matthew-radford.com/api/group-tabs", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                enrichedTabs: enrichedTabs,
                mode: mode
              })
            });

            const data = await response.json();
            console.log("API Response: ", data);
            if (data.error) {
              alert("AI grouping temporarily unavailable. Please try again later.");
              document.getElementById("loadingSpinner").style.display = "none";
              return;
            }

            groupedTitles = data.groupedTitles;
          } catch (error) {
            console.error('Error calling API:', error);
            alert("AI grouping temporarily unavailable. Please try again later.");
            document.getElementById("loadingSpinner").style.display = "none";
            return;
          }
        
        // Match titles back to full tab objects
        
        const groupedTabs = {};
        
        for (const [groupName, idList] of Object.entries(groupedTitles)) {
          const ids = idList.map(id => parseInt(id, 10)).filter(Number.isInteger);
          groupedTabs[groupName] = tabs.filter(tab => ids.includes(tab.id));
        }
        const nonEmptyGroups = Object.fromEntries(
          Object.entries(groupedTabs).filter(([, tabs]) => tabs.length > 0)
        );

        renderGroupedTabs(nonEmptyGroups);
        document.getElementById("loadingSpinner").style.display = "none";
        unsortedTabs = []; // clear the array
        triggerAIHighlight(false); // remove glow
        document.getElementById("unsortedGroup")?.remove(); // clean up the DOM
        pendingTabIds.clear();

        let groupIndex = 0;
        const groupColors = {};
        let groupsProcessed = 0;
        const totalGroups = Object.keys(groupedTabs).length;
        trackEvent('groupCreated', Object.keys(groupedTabs).length);
        trackEvent('tabsOrganized', tabs.length);
        for (const [groupName, tabs] of Object.entries(groupedTabs)) {
          const tabIds = tabs
            .filter(tab => tab.id) // only group real tabs
            .map(tab => tab.id);

          if (tabIds.length === 0) continue;

          const colorName = getNextColor(groupIndex); // Lock in correct color now
          groupIndex++;
          chrome.tabs.group({ tabIds }, async (groupId) => {
            // Optional: style the tab group
            chrome.tabGroups.update(groupId, {
              title: groupName,
              color: colorName
            });
            const hexColor = colorMap[colorName];
            groupColors[groupName] = hexColor;


            groupsProcessed++;
            if (groupsProcessed === totalGroups) {
              renderGroupedTabs(groupedTabs, groupColors);
            }

          
          });
          
        }
        lastGroupedTitles = {};

        for (const [groupName, tabsInGroup] of Object.entries(groupedTabs)) {
          lastGroupedTitles[groupName] = tabsInGroup.map(tab => tab.id);
        }
        chrome.storage.local.set({ 
          
          tabspaceGroups: groupedTabs });



    });
    

   
});

function renderGroupedTabs(groups, groupColors = {}) {
  const sortedGroups = Object.entries(groups)
  .sort(([, tabsA], [, tabsB]) => tabsB.length - tabsA.length);
  const tabList = document.getElementById("tabList");
  tabList.innerHTML = "";

  sortedGroups.forEach(([groupName, tabs]) => {
    const groupCard = document.createElement("div");
    groupCard.className = "group-card";  // This is the big index card
    const color = groupColors[groupName];
    if (color) {
      groupCard.style.setProperty("--group-color", color);
      groupCard.style.borderLeft = `4px solid ${color}`;
      // Optional background tint (test for contrast)
      // groupCard.style.backgroundColor = color;
      // groupCard.style.color = "#fff"; // if needed for readability
    }

    // Group header
    const header = document.createElement("div");
    header.className = "group-header";

    const titleInput = document.createElement("input");
    titleInput.className = "group-title";
    titleInput.value = `${getEmojiForGroup(groupName)} ${groupName}`;
    titleInput.addEventListener("input", () => {
      groupCard.dataset.name = titleInput.value;
    });

    const collapseBtn = document.createElement("button");
    collapseBtn.className = "collapse-btn";
    collapseBtn.textContent = "−";
    let isCollapsed = false;
    collapseBtn.addEventListener("click", () => {
      isCollapsed = !isCollapsed;

      // Toggle tab visibility
      tabContainer.style.display = isCollapsed ? "none" : "block";
      collapseBtn.textContent = isCollapsed ? "+" : "−";

      // Shrink group card
      groupCard.style.maxHeight = isCollapsed ? "60px" : "";
      groupCard.style.overflow = isCollapsed ? "hidden" : "";
      groupCard.style.boxShadow = isCollapsed ? "none" : "0 4px 10px rgba(0,0,0,0.3)";
    });
    const focusBtn = document.createElement("button");
    focusBtn.className = "focus-btn";
    focusBtn.textContent = "Focus";

    focusBtn.onclick = () => activateFocusMode(tabs, groupCard);
    const groupCloseBtn = document.createElement("button");
    groupCloseBtn.className = "group-close-btn";
    groupCloseBtn.textContent = "✖";
    groupCloseBtn.onclick = () => {
      tabs.forEach(tab => {
        chrome.tabs.remove(tab.id);
      });
      setTimeout(() => {
        groupCard.remove();
      }, 1000);
    };

    header.appendChild(titleInput);
    header.appendChild(collapseBtn);
    header.appendChild(groupCloseBtn);
    header.appendChild(focusBtn);
    // Tab container inside the group
    const tabContainer = document.createElement("div");
    tabContainer.className = "tab-container";

    tabs.forEach(tab => {
      const closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.textContent = "✖";
      const card = document.createElement("div");
      card.className = "tab-card";

      const icon = document.createElement("img");
      icon.src = tab.favIconUrl || "default-icon.png";

      const tabTitle = document.createElement("div");
      tabTitle.className = "title";
      tabTitle.textContent = tab.title;

      const goBtn = document.createElement("button");
      goBtn.className = "open-btn";
      goBtn.textContent = "GoTo";
      goBtn.onclick = () => {
        chrome.tabs.query({}, (allTabs) => {
          const match = allTabs.find(t => t.url === tab.url);
          if (match) {
            chrome.tabs.update(match.id, { active: true });
            chrome.windows.update(match.windowId, { focused: true });
          } else {
            chrome.tabs.create({ url: tab.url });
          }
        });
      };

      closeBtn.onclick = () => {
        chrome.tabs.remove(tab.id);
      };

      card.appendChild(icon);
      card.appendChild(tabTitle);
      card.appendChild(goBtn);
      card.appendChild(closeBtn);
      tabContainer.appendChild(card);
    });

    // Assemble group card
    groupCard.appendChild(header);
    groupCard.appendChild(tabContainer);
    tabList.appendChild(groupCard);
    
  });

}

function activateFocusMode(groupTabs, groupCard) {
  const focusTabIds = groupTabs.map(tab => tab.id);

  chrome.tabs.query({ currentWindow: true }, freshTabs => {
    const focusTab = freshTabs.find(tab => focusTabIds.includes(tab.id));
    const focusedGroupId = focusTab?.groupId;

    if (!Number.isInteger(focusedGroupId) || focusedGroupId === -1) {
      console.warn("⚠️ Tabs not grouped yet — skipping collapse");
      return;
    }

    chrome.tabGroups.query({}, groups => {
      groups.forEach(group => {
        chrome.tabGroups.update(group.id, {
          collapsed: group.id !== focusedGroupId
        });
      });
    });

    groupCard.style.border = "2px solid gold";
    groupCard.style.boxShadow = "0 0 12px rgba(255, 215, 0, 0.6)";
    trackEvent('focusUsed');
  });
  
}



function getEmojiForGroup(name) {
  const terms = nlp(name).nouns().toSingular().out('array').map(t => t.toLowerCase());

  let bestEmoji = "📁";
  let bestScore = 0;

  for (const [emoji, keywords] of Object.entries(emojiMap)) {
    let score = 0;
    for (const term of terms) {
      for (const keyword of keywords) {
        if (term === keyword) score += 3; // exact match
        else if (term.includes(keyword) || keyword.includes(term)) score += 2; // partial match
        else if (levenshtein(term, keyword) <= 2) score += 1; // fuzzy match
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEmoji = emoji;
    }
  }

  return bestEmoji;
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// Move these to the very end of your file
document.addEventListener('DOMContentLoaded', () => {
  // Analytics event listeners
  document.getElementById("analyticsBtn")?.addEventListener("click", () => {
    displayAnalytics();
  });

  document.getElementById("closeAnalytics")?.addEventListener("click", () => {
    document.getElementById("analyticsPanel").style.display = "none";
  });
});

// Close old tabs functionality
// Close old tabs functionality
document.getElementById("cleanupBtn").addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const oldTabs = tabs.filter(tab => {
      // Don't close the current active tab or TabSpace workspace
      if (tab.active || tab.url.includes("workspace.html")) return false;
      
      // Check last accessed time (when user actually visited the tab)
      if (tab.lastAccessed && tab.lastAccessed < sevenDaysAgo) {
        return true;
      }
      
      // Fallback: if lastAccessed isn't available, check if tab is very old
      // and hasn't been active recently (audible = playing audio/video)
      if (!tab.lastAccessed && !tab.audible && !tab.pinned) {
        return true; // Likely an old, forgotten tab
      }
      
      return false;
    });

    if (oldTabs.length === 0) {
      alert("No old tabs found to clean up! 🎉");
      return;
    }

    // Show more detailed info
    const oldestTab = Math.min(...oldTabs.map(tab => tab.lastAccessed || 0));
    const daysOld = Math.floor((now - oldestTab) / (24 * 60 * 60 * 1000));
    
    const confirmed = confirm(
      `Found ${oldTabs.length} tabs not visited in 7+ days.\n` +
      `Oldest tab: ${daysOld} days old.\n\n` +
      `Close them?`
    );
    
    if (confirmed) {
      const tabIds = oldTabs.map(tab => tab.id);
      chrome.tabs.remove(tabIds, () => {
        alert(`Cleaned up ${oldTabs.length} old tabs! 🧹`);
        document.getElementById("refreshBtn")?.click();
      });
    }
  });
});






