// Configuration
const API_BASE_URL = 'http://localhost:8000';

// DOM Elements
const statusSection = document.getElementById('statusSection');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const initSection = document.getElementById('initSection');
const chatSection = document.getElementById('chatSection');
const errorSection = document.getElementById('errorSection');
const initButton = document.getElementById('initButton');
const askButton = document.getElementById('askButton');
const resetButton = document.getElementById('resetButton');
const retryButton = document.getElementById('retryButton');
const questionInput = document.getElementById('questionInput');
const messagesContainer = document.getElementById('messagesContainer');
const videoIdSpan = document.getElementById('videoId');
const errorMessage = document.getElementById('errorMessage');

let currentVideoId = null;
let isInitialized = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    checkBackendHealth();
    await checkInitializationStatus();
});

// Check backend health
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        showError('Backend server is not running. Please start the server first:\npython -m uvicorn backend.app:app --reload');
    }
}

// Get current video ID from YouTube page
async function getCurrentVideoId() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tabs[0].url;
        
        let videoId = null;
        
        // Extract video ID from YouTube URL
        const urlParams = new URL(url);
        if (url.includes('youtube.com')) {
            videoId = urlParams.searchParams.get('v');
        } else if (url.includes('youtu.be')) {
            videoId = url.split('/').pop().split('?')[0];
        }
        
        return videoId;
    } catch (error) {
        console.error('Error getting video ID:', error);
        return null;
    }
}

// Check if vector store is already initialized
async function checkInitializationStatus() {
    currentVideoId = await getCurrentVideoId();
    
    if (!currentVideoId) {
        showError('Please navigate to a YouTube video first');
        return;
    }
    
    // Check localStorage for this video
    const storageKey = `ytchat_${currentVideoId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored === 'initialized') {
        isInitialized = true;
        showChatSection();
    } else {
        showInitSection();
    }
}

// Show init section
function showInitSection() {
    statusSection.style.display = 'none';
    initSection.style.display = 'block';
    chatSection.style.display = 'none';
    errorSection.style.display = 'none';
    initButton.addEventListener('click', initializeVectorStore);
}

// Show chat section
function showChatSection() {
    statusSection.style.display = 'none';
    initSection.style.display = 'none';
    chatSection.style.display = 'flex';
    errorSection.style.display = 'none';
    videoIdSpan.textContent = `Video: ${currentVideoId}`;
    
    askButton.addEventListener('click', askQuestion);
    resetButton.addEventListener('click', resetVectorStore);
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            askQuestion();
        }
    });
}

// Show error section
function showError(message) {
    statusSection.style.display = 'none';
    initSection.style.display = 'none';
    chatSection.style.display = 'none';
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
    retryButton.addEventListener('click', checkInitializationStatus);
}

// Initialize vector store
async function initializeVectorStore() {
    try {
        initButton.disabled = true;
        statusText.textContent = 'Creating vector store...';
        statusSection.style.display = 'block';
        initSection.style.display = 'none';
        
        const response = await fetch(`${API_BASE_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_id: currentVideoId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initialize vector store');
        }
        
        const data = await response.json();
        
        // Store initialization status
        const storageKey = `ytchat_${currentVideoId}`;
        localStorage.setItem(storageKey, 'initialized');
        
        isInitialized = true;
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <p><strong>Vector Store Created!</strong></p>
                <p>Ready to ask questions about this video.</p>
            </div>
        `;
        showChatSection();
        
    } catch (error) {
        console.error('Initialization error:', error);
        initButton.disabled = false;
        showError(`Failed to create vector store: ${error.message}`);
    }
}

// Ask question
async function askQuestion() {
    const question = questionInput.value.trim();
    
    if (!question) {
        return;
    }
    
    if (!isInitialized) {
        showError('Vector store not initialized');
        return;
    }
    
    // Add user message to chat
    addMessage(question, 'user');
    questionInput.value = '';
    askButton.disabled = true;
    
    // Add loading message
    const loadingMsg = addMessage('Thinking...', 'assistant loading');
    
    try {
        const response = await fetch(`${API_BASE_URL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get answer');
        }
        
        const data = await response.json();
        
        // Remove loading message and add actual answer
        loadingMsg.remove();
        addMessage(data.answer, 'assistant');
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Question error:', error);
        loadingMsg.remove();
        addMessage(`Error: ${error.message}`, 'error');
    } finally {
        askButton.disabled = false;
        questionInput.focus();
    }
}

// Add message to chat
function addMessage(text, type = 'assistant') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    if (type === 'assistant loading') {
        messageDiv.innerHTML = `
            <div class="message-loading">
                <span class="spinner"></span>
                <span>${text}</span>
            </div>
        `;
    } else {
        messageDiv.textContent = text;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// Reset vector store
async function resetVectorStore() {
    if (!confirm('Reset the vector store for this video? You\'ll need to reinitialize it.')) {
        return;
    }
    
    try {
        await fetch(`${API_BASE_URL}/reset`, {
            method: 'POST'
        });
        
        const storageKey = `ytchat_${currentVideoId}`;
        localStorage.removeItem(storageKey);
        
        isInitialized = false;
        messagesContainer.innerHTML = '';
        showInitSection();
        
    } catch (error) {
        showError(`Failed to reset: ${error.message}`);
    }
}
