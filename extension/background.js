// Background service worker for the Habits extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Habits Extension installed successfully.");
});
