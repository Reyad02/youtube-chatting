# YouTube Transcript Chat - Extension Setup Guide

A Chrome extension that lets you ask questions about YouTube videos using AI-powered RAG (Retrieval Augmented Generation).

## Features

- 🎯 Extract and index YouTube video transcripts
- 🤖 Ask questions about video content using AI
- 💾 Vector store creation for fast retrieval
- 🔒 Local backend processing
- 🎨 Modern UI with real-time chat

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Chrome Extension                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Popup UI (popup.html/js)                        │   │
│  │  - Initialize vector store                       │   │
│  │  - Ask questions                                 │   │
│  │  - Display answers                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                      HTTP API
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Python FastAPI Backend                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /initialize - Create vector store               │   │
│  │  /ask - Answer questions using RAG              │   │
│  │  /reset - Clear current session                 │   │
│  │  /health - Health check                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Uses: YouTubeTranscriptAPI, LangChain, FAISS, GPT-4   │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Python 3.8+ (in your venv from the main project)
- Chrome/Edge browser
- OpenAI API key

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd d:\youtube-chatting
# Activate your virtual environment if not already active
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Set Up Environment Variables

Create or update your `.env` file in `d:\youtube-chatting`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the Backend Server

```bash
# From d:\youtube-chatting directory
python -m uvicorn backend.app:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

The server needs to be running whenever you use the extension.

### 4. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Navigate to `d:\youtube-chatting\extension` folder
5. Click "Select Folder"

The extension should now appear in your Chrome toolbar.

### 5. Use the Extension

1. Navigate to any YouTube video
2. Click the extension icon in your Chrome toolbar
3. Click "Initialize Vector Store" - this will:
   - Fetch the video transcript
   - Create embeddings using OpenAI
   - Store them in a FAISS vector database
4. Once initialized, ask questions about the video
5. The extension uses RAG to find relevant transcript segments and answer your questions

## Project Structure

```
youtube-chatting/
├── backend/
│   ├── app.py                 # FastAPI application
│   └── requirements.txt        # Backend dependencies
│
├── extension/
│   ├── manifest.json          # Extension configuration
│   ├── popup.html             # Extension UI
│   ├── popup.js               # Extension logic
│   ├── content.js             # YouTube page integration
│   ├── background.js          # Service worker
│   └── styles.css             # UI styling
│
├── youtube-chat.ipynb         # Research/development notebook
├── main.py                    # (Your existing file)
└── README.md                  # This file
```

## How It Works

### Initialization Phase
1. Extract video ID from current YouTube page
2. Fetch transcript using YouTubeTranscriptAPI
3. Split transcript into chunks (1000 chars, 200 char overlap)
4. Generate embeddings using OpenAI's text-embedding-3-small
5. Store in FAISS vector database
6. Create RAG chain: Retriever → Prompt → LLM → Parser

### Question Answering Phase
1. Convert question to embedding
2. Retrieve 4 most similar transcript chunks
3. Create prompt with context + question
4. Send to GPT-4-mini for answer generation
5. Return answer + sources to extension UI

## Configuration

### Backend (backend/app.py)
- **API Port**: 8000 (change in `uvicorn.run()`)
- **Model**: gpt-4-mini (can change in `ChatOpenAI(model=...)`)
- **Temperature**: 0.2 (lower = more deterministic)
- **Chunk Size**: 1000 chars (increase for longer context)
- **Top K**: 4 retrieved chunks (change in `search_kwargs`)

### Extension (extension/popup.js)
- **API URL**: http://127.0.0.1:8000 (change `API_BASE_URL`)

## Troubleshooting

### "Backend server is not running"
- Make sure you started the backend with: `python -m uvicorn backend.app:app --reload --port 8000`
- Check that port 8000 is not in use by another application

### "Could not fetch transcript"
- The video might have disabled transcripts
- Try a different video
- Ensure your internet connection is working

### "Failed to initialize vector store"
- Check your OPENAI_API_KEY in .env file
- Ensure you have enough credits in your OpenAI account
- Check the backend console for error messages

### Extension not showing in Chrome
- Make sure Developer mode is enabled
- Try going to `chrome://extensions/` and looking for "YouTube Transcript Chat"
- If not there, reload the extension

### CORS/Origin errors
- Make sure the backend allows the extension origin in `CORSMiddleware`
- The manifest.json should have correct extension ID (Chrome generates this)

## Development

### Testing the Backend Directly
```bash
# Test health endpoint
curl http://127.0.0.1:8000/health

# Test initialization
curl -X POST http://127.0.0.1:8000/initialize \
  -H "Content-Type: application/json" \
  -d '{"video_id":"Gfr50f6ZBvo"}'

# Test asking a question (after initialization)
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the video about?"}'
```

### Modifying the Extension
- Edit files in `extension/` folder
- Go to `chrome://extensions/`
- Click the refresh icon for "YouTube Transcript Chat"
- The changes will be applied immediately

### Modifying the Backend
- Edit `backend/app.py`
- The backend will automatically reload (with `--reload` flag)
- No extension reload needed

## API Reference

### POST /initialize
Initialize vector store for a YouTube video

**Request:**
```json
{
  "video_id": "dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vector store created successfully",
  "video_id": "dQw4w9WgXcQ"
}
```

### POST /ask
Ask a question about the initialized video

**Request:**
```json
{
  "question": "What is the main topic?"
}
```

**Response:**
```json
{
  "answer": "The main topic is...",
  "sources": ["Source text excerpt 1", "Source text excerpt 2"]
}
```

### POST /reset
Clear the current vector store

**Response:**
```json
{
  "status": "reset"
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy"
}
```

## Performance Notes

- **First initialization**: 10-30 seconds (API calls + embedding generation)
- **Subsequent questions**: 2-5 seconds (depends on GPT response time)
- **Vector store size**: ~10-50MB per video (stored in memory)

## Security Considerations

- The backend runs locally on your machine
- Your OpenAI API key is stored in .env (not sent to extension)
- Transcripts are stored in memory only (cleared on reset)
- No data is stored persistently

## Limitations

- Only works with videos that have transcripts
- Requires backend server to be running
- Limited to one video at a time (use reset to switch videos)
- Token limit may affect very long videos

## Future Improvements

- [ ] Store vector stores to disk for reuse
- [ ] Support multiple simultaneous videos
- [ ] Add transcript search UI
- [ ] Add source highlighting in YouTube player
- [ ] Cache embeddings to reduce API calls
- [ ] Add keyboard shortcuts
- [ ] Support for other video platforms

## License

MIT

## Support

If you encounter issues:
1. Check the browser console (F12) for JavaScript errors
2. Check the backend terminal for Python errors
3. Verify your OpenAI API key is correct
4. Make sure the video has available transcripts

---

Built with ❤️ using LangChain, FastAPI, and Chrome APIs
