import { useState } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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
type InputMode = "paste" | "google-docs";

const SLIDE_TEMPLATES: Record<SlideTemplate, any> = {
  modern: {
    titleColor: "#1a73e8",
    bodyColor: "#333",
    backgroundColor: "#fff",
    titleSlideBackgroundColor: "#1a73e8",
    titleSlideTextColor: "#fff",
  },
  corporate: {
    titleColor: "#fff",
    bodyColor: "#333",
    backgroundColor: "#fafafa",
    headerColor: "#202124",
    titleSlideBackgroundColor: "#202124",
    titleSlideTextColor: "#fff",
  },
  creative: {
    titleColor: "#c2185b",
    bodyColor: "#333",
    backgroundColor: "#fffaf0",
    titleSlideBackgroundColor: "#c2185b",
    titleSlideTextColor: "#fff",
  },
  minimal: {
    titleColor: "#000",
    bodyColor: "#333",
    backgroundColor: "#fff",
    titleSlideBackgroundColor: "#111",
    titleSlideTextColor: "#fff",
  },
  executive: {
    titleColor: "#1a237e",
    bodyColor: "#333",
    backgroundColor: "#f5f5f7",
    headerColor: "#1a237e",
    titleSlideBackgroundColor: "#1a237e",
    titleSlideTextColor: "#fff",
    titleColorWithHeader: "#fff",
  },
};

const TEMPLATES: { id: SlideTemplate; name: string; description: string }[] = [
  { id: "modern", name: "Modern", description: "Clean, minimalist design with blue accents" },
  { id: "corporate", name: "Corporate", description: "Professional design with dark headers" },
  { id: "creative", name: "Creative", description: "Bold colors and dynamic style" },
  { id: "minimal", name: "Minimal", description: "Simple black and white design" },
  { id: "executive", name: "Executive", description: "Traditional executive presentation style" },
];

const GOOGLE_DOCS_URL_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/;

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
    scope: "openid profile email https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents.readonly",
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

  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [googleDocsUrl, setGoogleDocsUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

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
      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
      }
      
      const userInfo = await userInfoResponse.json();
      if (userInfo.email) {
        setUser({
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split("@")[0],
          picture: userInfo.picture,
        });
      }
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
      const requestBody: Record<string, unknown> = {
        documentTitle,
        slideCount,
        template,
        customPrompt: customPrompt || undefined,
        accessToken,
        userEmail: user.email,
      };

      if (inputMode === "google-docs") {
        requestBody.googleDocsUrl = googleDocsUrl;
      } else {
        requestBody.documentContent = documentContent;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

  const handleExportToPdf = async () => {
    if (!result?.structure) return;

    const slidesContainer = document.querySelector(".slides-preview");
    if (!slidesContainer) return;

    // Filter out the export-section buttons from the capture
    const slides = Array.from(slidesContainer.querySelectorAll(".slide"));
    
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [800, 600]
    });

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i] as HTMLElement;
      
      const canvas = await html2canvas(slide, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/png");
      const imgProps = doc.getImageProperties(imgData);
      
      const pdfWidth = 800;
      const pdfHeight = 600;
      
      const ratio = imgProps.width / imgProps.height;
      const pageRatio = pdfWidth / pdfHeight;
      
      let renderWidth, renderHeight;
      
      if (ratio > pageRatio) {
        renderWidth = pdfWidth;
        renderHeight = pdfWidth / ratio;
      } else {
        renderHeight = pdfHeight;
        renderWidth = pdfHeight * ratio;
      }
      
      const x = (pdfWidth - renderWidth) / 2;
      const y = (pdfHeight - renderHeight) / 2;

      if (i > 0) {
        doc.addPage([800, 600], "landscape");
      }

      // Fill background if it's a title slide to avoid white borders
      if (slide.classList.contains("title-slide")) {
        doc.setFillColor(26, 115, 232); // #1a73e8
        doc.rect(0, 0, pdfWidth, pdfHeight, "F");
      }

      doc.addImage(imgData, "PNG", x, y, renderWidth, renderHeight);
    }

    const title = result.structure.title || "presentation";
    doc.save(`${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  };

  const validateGoogleDocsUrl = (url: string): boolean => {
    if (!url) return false;
    return GOOGLE_DOCS_URL_PATTERN.test(url);
  };

  const handleGoogleDocsUrlChange = (url: string) => {
    setGoogleDocsUrl(url);
    if (url && !validateGoogleDocsUrl(url)) {
      setUrlError("Please enter a valid Google Docs URL");
    } else {
      setUrlError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestBody: Record<string, unknown> = {
        slideCount,
        customPrompt: customPrompt || undefined,
      };

      if (inputMode === "google-docs") {
        if (!validateGoogleDocsUrl(googleDocsUrl)) {
          setError("Please enter a valid Google Docs URL");
          setLoading(false);
          return;
        }
        if (!accessToken) {
          setError("Please sign in with Google to import from Google Docs");
          setLoading(false);
          return;
        }
        requestBody.googleDocsUrl = googleDocsUrl;
        requestBody.accessToken = accessToken;
        // documentTitle is optional when using Google Docs URL (will use doc title)
        if (documentTitle) {
          requestBody.documentTitle = documentTitle;
        }
      } else {
        requestBody.documentContent = documentContent;
        requestBody.documentTitle = documentTitle;
      }

      const response = await fetch("/api/generate/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        // Auto-fill title from fetched document if using Google Docs
        if (inputMode === "google-docs" && data.documentTitle && !documentTitle) {
          setDocumentTitle(data.documentTitle);
        }
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
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="user-avatar" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
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
            <label>Input Source</label>
            <div className="input-mode-toggle">
              <button
                type="button"
                className={`toggle-button ${inputMode === "paste" ? "active" : ""}`}
                onClick={() => setInputMode("paste")}
              >
                Paste Content
              </button>
              <button
                type="button"
                className={`toggle-button ${inputMode === "google-docs" ? "active" : ""}`}
                onClick={() => setInputMode("google-docs")}
              >
                Import from Google Docs
              </button>
            </div>
          </div>

          {inputMode === "google-docs" ? (
            <>
              <div className="form-group">
                <label htmlFor="googleDocsUrl">Google Docs URL</label>
                <input
                  id="googleDocsUrl"
                  type="url"
                  value={googleDocsUrl}
                  onChange={(e) => handleGoogleDocsUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className={urlError ? "input-error" : ""}
                  required
                />
                {urlError && <span className="url-error-message">{urlError}</span>}
                {!user && (
                  <span className="url-hint">Sign in with Google to import documents</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="title">Document Title (Optional)</label>
                <input
                  id="title"
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Leave blank to use document's title"
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

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

          <button
            type="submit"
            disabled={
              loading ||
              (inputMode === "paste" && (!documentContent || !documentTitle)) ||
              (inputMode === "google-docs" && (!googleDocsUrl || !validateGoogleDocsUrl(googleDocsUrl) || !user))
            }
          >
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
            <div className={`slides-preview ${template}`}>
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
                
                <button 
                  onClick={handleExportToPdf}
                  className="export-button secondary"
                  style={{ marginTop: '10px' }}
                >
                  Export to PDF
                </button>
              </div>

              {(() => {
                const config = SLIDE_TEMPLATES[template];
                const titleSlideBg = config.titleSlideBackgroundColor || config.backgroundColor;
                const titleSlideText = config.titleSlideTextColor || config.titleColor;

                return (
                  <>
                    <div 
                      className="slide title-slide"
                      style={{ backgroundColor: titleSlideBg, color: titleSlideText }}
                    >
                      <h3>{result.structure.title}</h3>
                    </div>

                    {result.structure.slides.map((slide, index) => {
                      const hasHeader = !!config.headerColor;
                      const slideTitleColor = hasHeader 
                        ? (config.titleColorWithHeader || "#fff") 
                        : config.titleColor;

                      return (
                        <div 
                          key={index} 
                          className={`slide ${hasHeader ? 'has-header' : ''}`}
                          style={{ backgroundColor: config.backgroundColor }}
                        >
                          {hasHeader && (
                            <div 
                              className="slide-header-bar" 
                              style={{ backgroundColor: config.headerColor }}
                            />
                          )}
                          <div className="slide-number">Slide {index + 1}</div>
                          <h4 style={{ color: slideTitleColor }}>{slide.title}</h4>
                          <ul style={{ color: config.bodyColor }}>
                            {slide.bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
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
