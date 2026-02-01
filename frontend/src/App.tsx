import { useState, useEffect, useCallback } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";

// localStorage keys for OAuth persistence
// NOTE: Storing tokens in localStorage exposes them to XSS attacks.
// For higher security requirements, consider using httpOnly cookies via a backend proxy.
const STORAGE_KEYS = {
  ACCESS_TOKEN: "doc2slides_access_token",
  USER_INFO: "doc2slides_user_info",
  TOKEN_EXPIRY: "doc2slides_token_expiry",
};

// Token expiry buffer (60 seconds) to account for clock skew and prevent mid-operation failures
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const DEFAULT_TOKEN_EXPIRY_SECONDS = 3600;

interface Slide {
  title: string;
  bullets: string[];
}

interface GenerateResponse {
  success: boolean;
  structure?: {
    title: string;
    slides: Slide[];
  };
  error?: string;
}

interface ExportResponse {
  success: boolean;
  slidesUrl?: string;
  slidesId?: string;
  error?: string;
}

interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

// Helper functions for OAuth persistence
function saveAuthToStorage(token: string, userInfo: UserInfo, expiresIn: number = DEFAULT_TOKEN_EXPIRY_SECONDS): boolean {
  try {
    const expiry = Date.now() + expiresIn * 1000;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiry.toString());
    return true;
  } catch (err) {
    console.error("Failed to save auth to storage:", err);
    return false;
  }
}

function clearAuthFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  } catch (err) {
    console.error("Failed to clear auth from storage:", err);
  }
}

function getStoredAuth(): { token: string; user: UserInfo; expiresAt: number } | null {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (!token || !userJson || !expiry) {
      return null;
    }

    const expiresAt = parseInt(expiry, 10);

    // Check if token has expired (with buffer for clock skew)
    if (Date.now() > expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      clearAuthFromStorage();
      return null;
    }

    const user = JSON.parse(userJson) as UserInfo;
    return { token, user, expiresAt };
  } catch (err) {
    console.error("Failed to get stored auth:", err);
    clearAuthFromStorage();
    return null;
  }
}

function App() {
  const [documentContent, setDocumentContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Validate token by making a request to Google's userinfo endpoint
  const validateToken = useCallback(async (token: string): Promise<UserInfo | null> => {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return null;
      }
      const userInfo = await response.json();
      return {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
    } catch {
      return null;
    }
  }, []);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const restoreAuth = async () => {
      const stored = getStoredAuth();
      if (stored) {
        // Validate the stored token is still valid
        const validatedUser = await validateToken(stored.token);
        if (validatedUser) {
          setAccessToken(stored.token);
          setUser(validatedUser);
          // Update stored user info in case it changed
          saveAuthToStorage(stored.token, validatedUser);
        } else {
          // Token is invalid, clear storage
          clearAuthFromStorage();
        }
      }
      setAuthLoading(false);
    };
    restoreAuth();
  }, [validateToken]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      // Reuse validateToken to fetch and validate user info
      const userInfo = await validateToken(token);
      if (userInfo) {
        setUser(userInfo);
        // Persist auth to localStorage
        saveAuthToStorage(token, userInfo, tokenResponse.expires_in || DEFAULT_TOKEN_EXPIRY_SECONDS);
      } else {
        // Failed to get user info, clear the token
        setAccessToken(null);
        setError("Failed to fetch user information. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
      setError("Google sign-in failed. Please try again.");
    },
    scope: "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file",
  });

  const handleLogout = () => {
    googleLogout();
    clearAuthFromStorage();
    setAccessToken(null);
    setUser(null);
    setExportResult(null);
  };

  const handleExportToSlides = async () => {
    if (!accessToken || !user || !result?.structure) return;

    setExporting(true);
    setExportResult(null);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentContent,
          documentTitle,
          slideCount,
          customPrompt: customPrompt || undefined,
          accessToken,
          userEmail: user.email,
        }),
      });

      const data: ExportResponse = await response.json();

      if (data.success) {
        setExportResult(data);
      } else {
        setError(data.error || "Failed to export to Google Slides");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export to Google Slides");
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentContent,
          documentTitle,
          slideCount,
          customPrompt: customPrompt || undefined,
        }),
      });

      const data: GenerateResponse = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while restoring auth
  if (authLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>Doc2Slides</h1>
        <p className="subtitle">Convert documents to executive-ready presentations</p>
        <div className="auth-section">
          {user ? (
            <div className="user-info">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <span className="user-name">{user.name}</span>
              <button onClick={handleLogout} className="logout-button">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => login()} className="google-login-button">
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <div className="main-content">
        <form onSubmit={handleSubmit} className="input-section">
          <div className="form-group">
            <label htmlFor="title">Document Title</label>
            <input
              id="title"
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Q4 2024 Performance Review"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Document Content</label>
            <textarea
              id="content"
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              placeholder="Paste your document content here..."
              rows={12}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="slideCount">Number of Slides</label>
              <select
                id="slideCount"
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
              >
                <option value={3}>3 slides</option>
                <option value={5}>5 slides</option>
                <option value={7}>7 slides</option>
                <option value={10}>10 slides</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="customPrompt">Custom Instructions (Optional)</label>
            <textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Focus on revenue metrics and customer feedback..."
              rows={3}
            />
          </div>

          <button type="submit" disabled={loading || !documentContent || !documentTitle}>
            {loading ? "Generating..." : "Generate Slides"}
          </button>
        </form>

        <div className="output-section">
          <h2>Generated Presentation</h2>

          {error && <div className="error">{error}</div>}

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Analyzing document with AI...</p>
            </div>
          )}

          {result?.structure && (
            <div className="slides-preview">
              <div className="export-section">
                {exportResult?.slidesUrl ? (
                  <div className="export-success">
                    <p>Presentation created successfully!</p>
                    <a
                      href={exportResult.slidesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="slides-link"
                    >
                      Open in Google Slides
                    </a>
                  </div>
                ) : user ? (
                  <button
                    onClick={handleExportToSlides}
                    disabled={exporting}
                    className="export-button"
                  >
                    {exporting ? "Exporting..." : "Export to Google Slides"}
                  </button>
                ) : (
                  <p className="login-prompt">
                    Sign in with Google to export to Google Slides
                  </p>
                )}
              </div>

              <div className="slide title-slide">
                <h3>{result.structure.title}</h3>
              </div>

              {result.structure.slides.map((slide, index) => (
                <div key={index} className="slide">
                  <div className="slide-number">Slide {index + 1}</div>
                  <h4>{slide.title}</h4>
                  <ul>
                    {slide.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {!loading && !result && !error && (
            <div className="placeholder">
              <p>Enter your document content and click "Generate Slides" to see the AI-generated presentation structure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
