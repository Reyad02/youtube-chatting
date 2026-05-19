// Content script for YouTube
// This script runs on YouTube pages to help identify video context

console.log('YouTube Chat Extension loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVideoInfo') {
        const videoId = getVideoIdFromPage();
        sendResponse({ videoId: videoId });
    }
});

// Extract video ID from current page
function getVideoIdFromPage() {
    const url = new URL(window.location);
    let videoId = url.searchParams.get('v');
    
    if (!videoId) {
        // Try to extract from URL pathname
        const match = window.location.pathname.match(/\/shorts\/([^/?]+)/);
        if (match) {
            videoId = match[1];
        }
    }
    
    return videoId;
}
