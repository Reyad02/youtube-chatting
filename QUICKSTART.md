# Quick Start Guide

## 5-Minute Setup

### 1️⃣ Install Dependencies
```bash
cd d:\youtube-chatting
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

### 2️⃣ Set Up API Key
Create `.env` file in `d:\youtube-chatting`:
```
OPENAI_API_KEY=your_key_here
```
Get your key: https://platform.openai.com/account/api-keys

### 3️⃣ Start Backend
```bash
python -m uvicorn backend.app:app --reload --port 8000
```
Wait for: `Uvicorn running on http://127.0.0.1:8000`

### 4️⃣ Load Extension
1. Go to `chrome://extensions/`
2. Turn ON "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `d:\youtube-chatting\extension`

### 5️⃣ Use It!
1. Go to any YouTube video
2. Click the extension icon 🎥
3. Click "Initialize Vector Store"
4. Ask questions about the video!

---

## What Each Part Does

### `backend/app.py`
- FastAPI server that handles the AI logic
- Fetches YouTube transcripts
- Creates vector embeddings
- Answers questions using RAG

### `extension/`
- **manifest.json**: Extension configuration
- **popup.html/js**: The UI you see when you click the extension
- **content.js**: Runs on YouTube pages to extract video ID
- **background.js**: Service worker for extension

---

## Next Steps

- Try it on a YouTube video with subtitles
- Modify prompts in `backend/app.py` for different behavior
- Adjust chunk size and retrieval count for better answers

For detailed info, see [README.md](README.md)
