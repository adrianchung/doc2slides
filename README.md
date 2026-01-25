# Doc2Slides

Convert Google Docs into executive-ready Google Slides presentations using AI.

## Features

- **AI-Powered Summarization**: Uses Google Gemini to extract key points optimized for executive review
- **Integrated Experience**: Works directly within Google Docs as a Workspace Add-on
- **Customizable Output**: Configure number of slides and provide custom summarization instructions
- **Professional Results**: Clean, bullet-point slides focused on decisions, metrics, and outcomes

## Architecture

```
Google Docs Add-on  →  Node.js Backend  →  Gemini API (summarize)
                                        →  Google Slides API (create)
```

## Quick Start

### 1. Deploy the Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Gemini API key (get one free at aistudio.google.com/app/apikey)
npm run dev
```

### 2. Deploy the Add-on

See [apps-script/README.md](apps-script/README.md) for detailed instructions.

## Configuration

### Backend Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey)) |
| `PORT` | Server port (default: 3000) |

### Google Cloud Setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the Google Slides API
3. The OAuth flow is handled through Apps Script using the user's credentials

## Project Structure

```
doc2slides/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── index.ts         # Express app entry
│   │   ├── routes/
│   │   │   └── generate.ts  # POST /generate endpoint
│   │   ├── services/
│   │   │   ├── claude.ts    # Gemini API integration
│   │   │   ├── slides.ts    # Google Slides creation
│   │   │   └── prompts.ts   # Prompt templates
│   │   └── types/
│   │       └── index.ts     # TypeScript interfaces
│   └── package.json
│
├── apps-script/             # Google Workspace Add-on
│   ├── Code.gs              # Main Apps Script
│   ├── Sidebar.html         # Configuration UI
│   └── appsscript.json      # Manifest
│
└── README.md
```

## API Reference

### POST /generate

Create a presentation from document content.

**Request:**
```json
{
  "documentContent": "Full text from Google Doc",
  "documentTitle": "Document Title",
  "slideCount": 5,
  "customPrompt": "Focus on Q4 metrics",
  "userEmail": "user@example.com",
  "accessToken": "OAuth token"
}
```

**Response:**
```json
{
  "success": true,
  "slidesUrl": "https://docs.google.com/presentation/d/...",
  "slidesId": "presentation-id"
}
```

## Deployment Options

### Backend
- **Cloud Run**: `gcloud run deploy`
- **Railway**: Connect GitHub repo
- **Heroku**: `git push heroku main`
- **Self-hosted**: Any Node.js server

### Add-on
- **Private**: Test deployment for personal/org use
- **Public**: Submit to Google Workspace Marketplace

## License

MIT
