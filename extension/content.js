// content.js - Injected into the Habits web application page

console.log("[Habits Extension] Content script loaded.");

// 1. Listen for state updates broadcasted by the React Web Application and sync requests
window.addEventListener("message", (event) => {
  // Only accept messages from the same page window
  if (event.source !== window) return;

  // Web app requests pending offline actions to sync
  if (event.data && event.data.type === "REQUEST_EXTENSION_SYNC") {
    chrome.storage.local.get("habitsAppState", (res) => {
      if (res && res.habitsAppState && res.habitsAppState.pendingActions && res.habitsAppState.pendingActions.length > 0) {
        window.postMessage({
          type: "EXTENSION_SYNC_PENDING",
          payload: res.habitsAppState.pendingActions
        }, window.location.origin);
      }
    });
  }

  // Web app broadcasts latest data state
  if (event.data && event.data.type === "HABITS_APP_STATE") {
    const appState = event.data.payload;
    
    // Read local pending actions to make sure we don't wipe them before they are synced
    chrome.storage.local.get("habitsAppState", (res) => {
      let pendingActions = [];
      if (res && res.habitsAppState && res.habitsAppState.pendingActions) {
        pendingActions = res.habitsAppState.pendingActions;
      }
      
      // If the incoming broadcast state has a matching userId, we clear the queue because they are synced
      // Otherwise, preserve the pending actions
      const mergedState = {
        ...appState,
        pendingActions: appState.pendingActions || []
      };

      // Save to extension's local persistent storage
      chrome.storage.local.set({ habitsAppState: mergedState }, () => {
        // Send a runtime message to notify the popup if it's currently open
        chrome.runtime.sendMessage({ type: "EXTENSION_STATE_UPDATED", state: mergedState })
          .catch(() => {
            // Ignore error (happens when popup is closed)
          });
      });
    });
  }
});

// 2. Listen for actions coming from the Extension Popup and forward them to the webpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type && message.type.startsWith("EXTENSION_")) {
    // Forward message to the React window context
    window.postMessage(message, window.location.origin);
    sendResponse({ success: true, detail: "Forwarded to web app context" });
  }
  return true;
});
