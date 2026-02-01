# Doc2Slides

An full-stack application that converts text/documents into Google Slides presentations using Google's Gemini API.

## 🛠 Tech Stack

- **Backend:** Node.js, Express, TypeScript (Port 3000)
- **Frontend:** React, Vite, TypeScript (Port 5173)
- **AI:** Google Gemini API
- **Integration:** Google Apps Script (`apps-script/`)

## ⚙️ Development Environment

### Startup
**Crucial Note:** When starting servers in the background (CLI), prefer `npm start` (production) for the backend to avoid `tsx` watcher hanging.

```bash
# Recommended Background Start
(cd backend && npm run build && nohup npm start > ../backend.log 2>&1 &) && \
(cd frontend && nohup npm run dev > ../frontend.log 2>&1 &)
```

### Testing
```bash
# Backend
npm test --prefix backend

# Frontend (Run once)
npm test --prefix frontend -- --run
```

## 📂 Project Structure

- **`backend/`**
  - `src/services/claude.ts`: **Note:** Handles Gemini API calls (legacy naming).
  - `src/services/slides.ts`: Handles Google Slides generation logic.
  - `src/routes/generate.ts`: Core API endpoints (`/preview`, `/generate`).
- **`frontend/`**
  - `src/App.tsx`: Main UI logic.
  - `src/types/`: Shared types (ensure sync with backend if modifying API).
- **`apps-script/`**: Google Workspace add-on code.

## 📝 Coding Conventions

- **Language:** Strict TypeScript.
- **Style:** 
  - 2-space indentation.
  - Semicolons required.
  - Double quotes preferred.
- **Naming:** `camelCase` for vars/funcs, `PascalCase` for components/interfaces.
- **Comments:** Sparse. Only explain *why*, not *what*.

## ⚠️ Critical Constraints & Gotchas

1.  **Auth:** Frontend uses OAuth. Tokens are short-lived.
2.  **API Proxy:** Frontend proxies `/api` requests to backend (port 3000).
3.  **Legacy Names:** You may see "Claude" in filenames (e.g., `claude.ts`); this now refers to the Gemini integration.
4.  **Security:** NEVER log API keys or OAuth tokens. 
5.  **State:** Backend services must remain stateless.

## 🧪 Testing Protocol

- **Mocking:** Always mock external calls (Gemini, Google APIs) in tests.
- **Coverage:** New features require `vitest` unit tests.
- **Location:**
  - Backend: `backend/src/__tests__/`
  - Frontend: `frontend/src/test/` or alongside components.
