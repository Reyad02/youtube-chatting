// Background Service Worker
// Handles persistent operations and message routing

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
    }
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkBackend') {
        fetch('http://localhost:8000/health')
            .then(response => {
                sendResponse({ available: response.ok });
            })
            .catch(() => {
                sendResponse({ available: false });
            });
        return true; // Will respond asynchronously
    }
});
