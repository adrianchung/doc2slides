# Doc2Slides - Google Apps Script Add-on

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

### OAuth Scopes Required
- `documents.readonly` - Read the document content
- `presentations` - Create slides in user's Drive
- `script.container.ui` - Show sidebar UI
- `userinfo.email` - Get user email for sharing
- `script.external_request` - Call the backend API

### Troubleshooting

**"Authorization required" error**
- The user needs to grant permissions. This happens on first use.

**"Failed to connect to server" error**
- Check that the backend URL is correct
- Ensure the backend is running and accessible
- Check CORS is enabled on the backend

**Slides not appearing in Drive**
- Verify the OAuth token is being passed correctly
- Check the backend logs for Slides API errors
