import { useState } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";

// Check at runtime to support testing
const isOAuthEnabled = () => Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

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

type SlideTemplate = "modern" | "corporate" | "creative" | "minimal" | "executive";

const TEMPLATES: { id: SlideTemplate; name: string; description: string }[] = [
  { id: "modern", name: "Modern", description: "Clean, minimalist design with blue accents" },
  { id: "corporate", name: "Corporate", description: "Professional design with dark headers" },
  { id: "creative", name: "Creative", description: "Bold colors and dynamic style" },
  { id: "minimal", name: "Minimal", description: "Simple black and white design" },
  { id: "executive", name: "Executive", description: "Traditional executive presentation style" },
];

// Custom hook that wraps Google OAuth - checks at runtime if OAuth is properly configured
function useGoogleAuth(
  onSuccess: (accessToken: string) => Promise<void>,
  onError: (error: string) => void
) {
  const oauthEnabled = isOAuthEnabled();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await onSuccess(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error("Login failed:", error);
      onError("Google sign-in failed. Please try again.");
    },
    scope: "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file",
  });

  // If OAuth is not configured, return wrapper that shows error
  if (!oauthEnabled) {
    return {
      login: () => {
        onError("Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.");
      },
      logout: () => {},
      isEnabled: false,
    };
  }

  return {
    login,
    logout: googleLogout,
    isEnabled: true,
  };
}

function App() {
  const [documentContent, setDocumentContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [template, setTemplate] = useState<SlideTemplate>("modern");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);

  const handleLoginSuccess = async (token: string) => {
    setAccessToken(token);
    // Fetch user info
    try {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const userInfo = await userInfoResponse.json();
      setUser({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  };

  const { login, logout, isEnabled: oauthEnabled } = useGoogleAuth(
    handleLoginSuccess,
    setError
  );

  const handleLogout = () => {
    logout();
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
          template,
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
          ) : oauthEnabled ? (
            <button onClick={() => login()} className="google-login-button">
              Sign in with Google
            </button>
          ) : (
            <span className="oauth-disabled">Google OAuth not configured</span>
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

            <div className="form-group">
              <label htmlFor="template">Slide Template</label>
              <select
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value as SlideTemplate)}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} - {t.description}
                  </option>
                ))}
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
                ) : oauthEnabled ? (
                  <p className="login-prompt">
                    Sign in with Google to export to Google Slides
                  </p>
                ) : (
                  <p className="login-prompt">
                    Configure Google OAuth to enable export to Google Slides
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
