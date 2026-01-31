# Doc2Slides - Google Apps Script Add-on

A Google Docs add-on that converts documents into executive-ready presentations using AI.

## Features

- **Generate Slides**: Convert your document into a Google Slides presentation
- **Preview**: See the slide structure before creating the presentation
- **Custom Instructions**: Provide specific guidance for content summarization
- **Connection Status**: Real-time backend connectivity indicator

## Deployment Instructions

### Prerequisites

1. A Google account
2. Access to Google Apps Script (script.google.com)
3. The backend API deployed and running

### Setup Steps

1. **Create a new Apps Script project**
   - Go to [script.google.com](https://script.google.com)
   - Click "New project"
   - Name it "Doc2Slides"

2. **Copy the files**
   - Replace the contents of `Code.gs` with the file from this folder
   - Click File → New → HTML file, name it "Sidebar" (without .html)
   - Paste the contents of `Sidebar.html`
   - Click the gear icon (Project Settings)
   - Click "Show 'appsscript.json' manifest file"
   - Replace `appsscript.json` contents with the file from this folder

3. **Update the backend URL**
   - In `Code.gs`, update the `BACKEND_URL` constant to your deployed backend URL
   - For local development, use `http://localhost:3000`
   - For production, use your deployed backend URL (e.g., `https://your-app.cloudrun.app`)

4. **Test the add-on**
   - Click "Deploy" → "Test deployments"
   - Select "Docs Add-on" as the deployment type
   - Click "Execute" to open a test document
   - In the test doc, go to Extensions → Doc2Slides → Generate Slides

5. **Deploy for production** (optional)
   - Click "Deploy" → "New deployment"
   - Select type: "Add-on"
   - Fill in the deployment details
   - Submit for review if publishing to Workspace Marketplace

## Usage

1. Open a Google Doc with content you want to convert
2. Go to Extensions → Doc2Slides → Generate Slides
3. Configure options in the sidebar:
   - **Number of Slides**: Choose 3, 5, 7, or 10 slides
   - **Custom Instructions**: (Optional) Add specific guidance
4. Click **Preview** to see the slide structure without creating
5. Click **Generate** to create the presentation

## OAuth Scopes Required

| Scope | Purpose |
|-------|---------|
| `documents.readonly` | Read the document content |
| `presentations` | Create slides in user's Drive |
| `script.container.ui` | Show sidebar UI |
| `userinfo.email` | Get user email for sharing |
| `script.external_request` | Call the backend API |

## Project Structure

```
apps-script/
├── Code.gs              # Main Apps Script functions
├── Sidebar.html         # UI for the sidebar
├── appsscript.json      # Manifest with OAuth scopes
├── README.md            # This file
├── package.json         # Test dependencies
├── tsconfig.json        # TypeScript config
├── vitest.config.ts     # Test configuration
└── src/
    ├── validation.ts    # Testable validation logic
    └── __tests__/
        └── validation.test.ts  # Unit tests
```

## Testing

The validation logic is extracted into TypeScript modules for testing:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Functions Reference

### Menu Functions

| Function | Description |
|----------|-------------|
| `onOpen()` | Creates the add-on menu |
| `onInstall()` | Runs on add-on installation |
| `onHomepage()` | Creates the homepage card |
| `showSidebar()` | Opens the configuration sidebar |

### Core Functions

| Function | Description |
|----------|-------------|
| `generateSlides(config)` | Creates a presentation from the document |
| `previewSlides(config)` | Gets slide structure without creating |
| `getDocumentData()` | Extracts document title, content, and user email |
| `getOAuthToken()` | Gets the user's OAuth token |
| `testConnection()` | Tests backend connectivity |

### Validation Functions

| Function | Description |
|----------|-------------|
| `validateConfig(config)` | Validates slide count and options |
| `validateContent(content)` | Validates document content length |

## Troubleshooting

### "Authorization required" error
- The user needs to grant permissions. This happens on first use.
- Make sure all OAuth scopes in `appsscript.json` are correct.

### "Failed to connect to server" error
- Check that the backend URL is correct in `Code.gs`
- Ensure the backend is running and accessible
- Check CORS is enabled on the backend
- The sidebar shows connection status at the bottom

### Slides not appearing in Drive
- Verify the OAuth token is being passed correctly
- Check the backend logs for Slides API errors
- Ensure the user has Google Slides permissions

### "Document content is too short" error
- The document needs at least 50 characters of content
- Add more content to your Google Doc

### Preview works but Generate fails
- This usually indicates an OAuth token issue
- Try re-authorizing the add-on
- Check that the `presentations` scope is granted
