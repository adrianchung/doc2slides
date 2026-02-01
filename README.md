# Doc2Slides

Convert documents into executive-ready Google Slides presentations using AI.

## Features

- **AI-Powered Summarization**: Uses Google Gemini to extract key points optimized for executive review
- **Slide Templates**: Choose from 5 professional templates (Modern, Corporate, Creative, Minimal, Executive)
- **Preview Before Export**: Review AI-generated slide structure before creating the presentation
- **Export to Google Slides**: Sign in with Google and export presentations directly to your Google Drive
- **Import from Google Docs**: Directly import content from Google Docs URLs (requires Google sign-in)
- **Graceful OAuth Handling**: App works without Google OAuth configured (preview-only mode)
- **Customizable Output**: Configure number of slides (3-10) and provide custom summarization instructions

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐
│                 │     │              Node.js Backend                 │
│  React Frontend │────▶│                                              │
│  (Port 5173)    │     │  /generate/preview ──▶ Gemini API            │
│                 │     │  /generate ──────────▶ Gemini + Slides API   │
└─────────────────┘     │  /generate/templates ─▶ Template configs     │
        │               └──────────────────────────────────────────────┘
        │
        ▼
┌─────────────────┐
│  Google OAuth   │  (Optional - required for export/import)
│  - Slides API   │
│  - Drive API    │
│  - Docs API     │
└─────────────────┘
```

### Data Flow

1. User pastes document content OR provides a Google Docs URL and selects options (slide count, template)
2. Frontend calls `/generate/preview` to get AI-generated slide structure
   - If using Google Docs URL, backend fetches document content via Docs API
3. User reviews the preview and optionally signs in with Google
4. Frontend calls `/generate` with OAuth token to create the actual presentation
5. Backend uses Gemini API to structure content, then Google Slides API to create presentation

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Google Gemini API Key** - [Get one free](https://aistudio.google.com/app/apikey) (required)
- **Google OAuth Client ID** - [Setup guide](#google-oauth-setup) (optional, for export feature)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/adrianchung/doc2slides.git
cd doc2slides
```

### 2. Start the Backend Server

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
```

Edit `backend/.env` and add your Gemini API key:
```
GEMINI_API_KEY=your-gemini-api-key-here
```

Start the server:
```bash
npm run dev
```

The backend will be available at **http://localhost:3000**. You should see:
```
Doc2Slides backend running on port 3000
Gemini API key configured: Yes
```

### 3. Start the Frontend Server

Open a **new terminal** and run:

```bash
cd frontend
npm install

# (Optional) Set up Google OAuth for export functionality
cp .env.example .env
```

If you want to enable Google Slides export, edit `frontend/.env`:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Start the server:
```bash
npm run dev
```

The frontend will be available at **http://localhost:5173**.

### 4. Use the App

1. Open http://localhost:5173 in your browser
2. Paste document text or enter a Google Docs URL
3. Select number of slides and template
4. Click "Generate Preview"
5. (Optional) Sign in with Google to export to Google Slides

**Note:** The app works without Google OAuth configured - you can preview slides but won't be able to export to Google Slides or import from Google Docs.

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to connect to server" | Make sure backend is running on port 3000 |
| "Gemini API key not configured" | Check `backend/.env` has valid `GEMINI_API_KEY` |
| Google sign-in not working | Ensure `VITE_GOOGLE_CLIENT_ID` is set in `frontend/.env` |
| OAuth security warnings | See [Avoiding Security Warnings](#avoiding-security-warnings-during-development) |

## Configuration

### Backend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey)) |
| `PORT` | No | Server port (default: 3000) |

### Frontend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth Client ID (required only for Google Slides export) |

## Google OAuth Setup

To enable the "Export to Google Slides" feature:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2. Enable Required APIs

In **APIs & Services > Library**, enable:
- Google Slides API
- Google Drive API
- Google Docs API (for importing from Google Docs)

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Click **Get Started** or **Configure Consent Screen**
3. Choose user type (External for public, Internal for organization-only)
4. Fill in app information:
   - App name: `Doc2Slides`
   - User support email: your email
   - Developer contact: your email
5. Add scopes:
   - `https://www.googleapis.com/auth/presentations`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/documents.readonly`
6. Add test users (required while app is in "Testing" status)

### 4. Create OAuth Client ID

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Add **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `http://localhost:5174` (backup port)
   - `http://localhost:5175` (backup port)
5. Copy the **Client ID** to `frontend/.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

### OAuth Flow

```
┌──────────┐    1. Click "Sign in"     ┌─────────────────┐
│  User    │ ─────────────────────────▶│  Google OAuth   │
│          │                           │  Consent Screen │
│          │◀───────────────────────── │                 │
└──────────┘    2. Grant permissions   └─────────────────┘
     │
     │ 3. Access token returned
     ▼
┌──────────┐    4. Token sent with     ┌─────────────────┐
│ Frontend │    export request         │    Backend      │
│          │ ─────────────────────────▶│                 │
│          │                           │ Uses token to   │
│          │◀───────────────────────── │ call Slides API │
└──────────┘    5. Slides URL returned └─────────────────┘
```

**Scopes requested:**
- `presentations` - Create and modify Google Slides
- `drive.file` - Access files created by the app
- `drive.readonly` - Access shared Google Drive files (for "anyone with link" documents)
- `documents.readonly` - Read Google Docs content (for import feature)

### Avoiding Security Warnings During Development

When signing in with Google OAuth during development, you may see warnings like:
- "Google hasn't verified this app"
- "This app is blocked"
- "This app isn't verified"

These warnings appear because your OAuth consent screen is in **Testing** mode and hasn't been verified by Google. Here's how to avoid them:

#### Option 1: Add Test Users (Recommended for Development)

1. Go to **APIs & Services > OAuth consent screen** in [Google Cloud Console](https://console.cloud.google.com/)
2. Scroll down to the **Test users** section
3. Click **Add users**
4. Add the Google account email addresses that will be testing the app
5. Save changes

Test users can sign in without seeing the "unverified app" warning. You can add up to 100 test users.

#### Option 2: Publish the App

If you want anyone to use the app without being added as a test user:

1. Go to **APIs & Services > OAuth consent screen**
2. Click **Publish App** to move from Testing to Production
3. For sensitive scopes (like those used by this app), Google requires verification

**Note:** Publishing doesn't mean the app is publicly discoverable—it just means anyone can sign in. However, unverified published apps will still show a warning screen that users must click through.

#### Option 3: Use Internal User Type (Google Workspace Only)

If you have a Google Workspace organization:

1. When creating the OAuth consent screen, choose **Internal** instead of External
2. Only users within your organization can access the app
3. No verification required and no warning screens

#### Understanding the Warning Screens

| App Status | User Type | Warning Shown |
|------------|-----------|---------------|
| Testing | Test user | None |
| Testing | Non-test user | "App blocked" (cannot proceed) |
| Published (unverified) | Any user | "Google hasn't verified this app" (can click through) |
| Published (verified) | Any user | None |

For local development, **adding yourself as a test user** is the simplest solution.

## Slide Templates

Five built-in templates are available:

| Template | Description |
|----------|-------------|
| **Modern** | Clean, minimalist design with blue accents |
| **Corporate** | Professional design with dark headers |
| **Creative** | Bold colors and dynamic style |
| **Minimal** | Simple black and white design |
| **Executive** | Traditional executive presentation style |

Templates control colors for titles, body text, and backgrounds. The actual slide layout uses Google Slides' built-in "Title and Body" layout.

## Project Structure

```
doc2slides/
├── backend/                 # Node.js API server (port 3000)
│   ├── src/
│   │   ├── index.ts         # Express app entry point
│   │   ├── routes/
│   │   │   └── generate.ts  # /generate endpoints
│   │   ├── services/
│   │   │   ├── claude.ts    # Gemini API integration
│   │   │   ├── slides.ts    # Google Slides API integration
│   │   │   ├── docs.ts      # Google Docs API integration
│   │   │   └── prompts.ts   # AI prompt templates
│   │   ├── types/
│   │   │   └── index.ts     # TypeScript interfaces & templates
│   │   └── __tests__/       # Backend tests
│   └── package.json
│
├── frontend/                # React + Vite frontend (port 5173)
│   ├── src/
│   │   ├── App.tsx          # Main component with OAuth handling
│   │   ├── App.test.tsx     # Frontend tests
│   │   ├── main.tsx         # React entry with GoogleOAuthProvider
│   │   └── test/
│   │       └── setup.ts     # Vitest setup
│   └── package.json
│
├── apps-script/             # Google Workspace Add-on (optional)
│   ├── Code.gs
│   ├── Sidebar.html
│   └── appsscript.json
│
└── README.md
```

## API Reference

### GET /generate/templates

Returns available slide templates.

**Response:**
```json
{
  "templates": [
    { "id": "modern", "name": "Modern", "description": "Clean, minimalist design with blue accents" },
    { "id": "corporate", "name": "Corporate", "description": "Professional design with dark headers" }
  ]
}
```

### POST /generate/preview

Preview AI-generated slide structure without creating a presentation. Does not require authentication for paste mode; requires OAuth token for Google Docs import.

**Request (paste mode):**
```json
{
  "documentContent": "Full text content to summarize",
  "documentTitle": "Document Title",
  "slideCount": 5,
  "customPrompt": "Focus on Q4 metrics (optional)"
}
```

**Request (Google Docs import):**
```json
{
  "googleDocsUrl": "https://docs.google.com/document/d/abc123/edit",
  "slideCount": 5,
  "accessToken": "Google OAuth access token",
  "customPrompt": "Focus on Q4 metrics (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "structure": {
    "title": "Q4 Performance Review",
    "slides": [
      { "title": "Executive Summary", "bullets": ["Revenue up 15%", "Customer satisfaction at 92%"] },
      { "title": "Key Metrics", "bullets": ["..."] }
    ]
  },
  "documentTitle": "Fetched document title (when using Google Docs URL)"
}
```

### POST /generate

Create a Google Slides presentation. Requires Google OAuth token.

**Request (paste mode):**
```json
{
  "documentContent": "Full text content to summarize",
  "documentTitle": "Document Title",
  "slideCount": 5,
  "template": "modern",
  "customPrompt": "Focus on Q4 metrics (optional)",
  "accessToken": "Google OAuth access token",
  "userEmail": "user@example.com"
}
```

**Request (Google Docs import):**
```json
{
  "googleDocsUrl": "https://docs.google.com/document/d/abc123/edit",
  "slideCount": 5,
  "template": "modern",
  "customPrompt": "Focus on Q4 metrics (optional)",
  "accessToken": "Google OAuth access token",
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "slidesUrl": "https://docs.google.com/presentation/d/abc123/edit",
  "slidesId": "abc123"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
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

### Test Coverage

**Backend tests cover:**
- Prompt generation and formatting
- API endpoint validation (required fields, slide count limits)
- Request/response handling
- Template validation
- Google Docs URL parsing and content fetching
- Error handling for Google Docs API responses

**Frontend tests cover:**
- Component rendering
- Form validation and submission
- Loading and error states
- Google OAuth sign-in flow (mocked)
- Export to Google Slides flow (mocked)

## Deployment

### Backend

| Platform | Command |
|----------|---------|
| Cloud Run | `gcloud run deploy` |
| Railway | Connect GitHub repo |
| Heroku | `git push heroku main` |
| Docker | Build from included Dockerfile |

### Frontend

Build the static assets and deploy to any static hosting:

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

## License

MIT

---

```
  /\_/\
 ( o.o )
  > ^ <   Built with Gemini AI
 /|   |\
(_|   |_)
```
