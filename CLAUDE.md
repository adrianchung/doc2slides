# Doc2Slides

Convert documents into Google Slides presentations using AI (Gemini).

## Tech Stack

- **Backend**: Node.js, Express, TypeScript (port 3000)
- **Frontend**: React, Vite, TypeScript (port 5173)
- **AI**: Google Gemini API
- **APIs**: Google Slides, Drive, and Docs APIs

## Commands

```bash
# Backend
npm test --prefix backend          # Run backend tests
npm run dev --prefix backend       # Start backend server

# Frontend
npm test --prefix frontend -- --run  # Run frontend tests
npm run dev --prefix frontend        # Start frontend server
```

## Project Structure

- `backend/src/routes/generate.ts` - Main API endpoints (/preview, /generate, /templates)
- `backend/src/services/claude.ts` - Gemini API integration
- `backend/src/services/slides.ts` - Google Slides API
- `backend/src/services/docs.ts` - Google Docs API (import feature)
- `backend/src/types/index.ts` - TypeScript interfaces and template configs
- `frontend/src/App.tsx` - Main React component with OAuth handling

## Code Style

- Use TypeScript for all new code
- Semicolons required
- Double quotes for strings
- 2-space indentation
- camelCase for variables/functions, PascalCase for components/interfaces

## Do's and Don'ts

- **Do** run tests before committing (`npm test --prefix backend && npm test --prefix frontend -- --run`)
- **Do** add tests for new features
- **Don't** add comments unless logic is non-obvious
- **Don't** add new dependencies without discussing first
- **Don't** commit .env files or secrets
- **Prefer** editing existing files over creating new ones

## Commit Conventions

- Use imperative mood: "Add feature" not "Added feature"
- Keep subject line under 70 characters
- Format: `<type>: <description>` (e.g., "Add Google Docs import feature")
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` when Claude contributes

## Testing Requirements

- All new features need tests
- Mock external services (Gemini, Google APIs) in tests
- Backend tests: `backend/src/__tests__/`
- Frontend tests: `frontend/src/App.test.tsx`

## Architecture Constraints

- Keep backend services stateless
- Frontend only calls our backend API (no direct Google API calls except OAuth)
- OAuth is optional - app must work in preview-only mode without it
- Validate all inputs on backend before calling external APIs

## Common Gotchas

- `claude.ts` is actually Gemini integration (historical naming)
- Frontend uses Vite proxy to forward `/api` requests to backend
- Google OAuth tokens are short-lived; don't store them long-term
- The `/generate/preview` endpoint doesn't require auth for paste mode, but does for Google Docs import

## Security Notes

- Never log access tokens or API keys
- Validate Google Docs URLs before making API calls
- User OAuth tokens are only used for their own resources
- Environment variables contain secrets - never commit `.env` files

## Environment Variables

- `backend/.env`: `GEMINI_API_KEY` (required)
- `frontend/.env`: `VITE_GOOGLE_CLIENT_ID` (optional, enables export/import)
