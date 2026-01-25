import { useState } from "react";

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

function App() {
  const [documentContent, setDocumentContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
