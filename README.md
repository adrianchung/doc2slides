# Doc2Slides

Convert Google Docs into executive-ready Google Slides presentations using AI.

## Features

- **AI-Powered Summarization**: Uses Google Gemini to extract key points optimized for executive review
- **Export to Google Slides**: Sign in with Google and export presentations directly to your Google Drive
- **Integrated Experience**: Works directly within Google Docs as a Workspace Add-on
- **Customizable Output**: Configure number of slides and provide custom summarization instructions
- **Professional Results**: Clean, bullet-point slides focused on decisions, metrics, and outcomes

![Doc2Slides Example](example.png)

## Architecture

```
Google Docs Add-on  →  Node.js Backend  →  Gemini API (summarize)
                                        →  Google Slides API (create)
```

## Quick Start

### 1. Start the Backend Server

```bash
# From the project root, navigate to the backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Gemini API key (get one free at aistudio.google.com/app/apikey)

# Start the development server
npm run dev
```

The backend will be available at **http://localhost:3000**.

### 2. Start the Frontend Server

```bash
# From the project root, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables (required for Google Slides export)
cp .env.example .env
# Edit .env with your Google OAuth Client ID (see Google Cloud Setup below)

# Start the development server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

### 3. Deploy the Add-on (Optional)

See [apps-script/README.md](apps-script/README.md) for detailed instructions.

## Configuration

### Backend Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey)) |
| `PORT` | Server port (default: 3000) |

### Frontend Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (required for Google Slides export) |

### Google Cloud Setup

To enable the "Export to Google Slides" feature:

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the following APIs:
   - Google Slides API
   - Google Drive API
3. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Add the required scopes: `../auth/presentations`, `../auth/drive.file`
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add `http://localhost:5173` to "Authorized JavaScript origins"
   - Copy the Client ID to your frontend `.env` file

## Project Structure

```
doc2slides/
├── backend/                 # Node.js API server (port 3000)
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
├── frontend/                # React frontend (port 5173)
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   └── main.tsx         # React entry point
│   ├── index.html
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

## Testing

### Backend Tests

```bash
cd backend
npm test            # Run all tests
npm run test:watch  # Watch mode
```

### Frontend Tests

```bash
cd frontend
npm test            # Run all tests
npm run test:watch  # Watch mode
```

Tests cover:
- Prompt generation and formatting
- API endpoint validation
- Request/response handling
- React component rendering

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

---

```
  /\_/\
 ( o.o )
  > ^ <   Meow! Thanks for stopping by! Have a purrfect day!
 /|   |\
(_|   |_)
```
