import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Google OAuth
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: (options: { onSuccess: (response: { access_token: string; expires_in: number }) => void }) => {
    return () => {
      mockLogin();
      options.onSuccess({ access_token: "mock-access-token", expires_in: 3600 });
    };
  },
  googleLogout: () => mockLogout(),
}));

describe("App", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it("renders the header", () => {
    render(<App />);
    expect(screen.getByText("Doc2Slides")).toBeInTheDocument();
    expect(
      screen.getByText("Convert documents to executive-ready presentations")
    ).toBeInTheDocument();
  });

  it("renders the form with all inputs", () => {
    render(<App />);
    expect(screen.getByLabelText("Document Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Document Content")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of Slides")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom Instructions (Optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Slides" })).toBeInTheDocument();
  });

  it("disables submit button when required fields are empty", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: "Generate Slides" });
    expect(button).toBeDisabled();
  });

  it("enables submit button when required fields are filled", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");

    const button = screen.getByRole("button", { name: "Generate Slides" });
    expect(button).toBeEnabled();
  });

  it("shows loading state when submitting", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    expect(screen.getByText("Generating...")).toBeInTheDocument();
    expect(screen.getByText("Analyzing document with AI...")).toBeInTheDocument();
  });

  it("displays generated slides on success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          structure: {
            title: "Test Presentation",
            slides: [
              { title: "Slide 1", bullets: ["Point A", "Point B"] },
              { title: "Slide 2", bullets: ["Point C", "Point D"] },
            ],
          },
        }),
    });

    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByText("Test Presentation")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Slide 1" })).toBeInTheDocument();
    expect(screen.getByText("Point A")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Slide 2" })).toBeInTheDocument();
    expect(screen.getByText("Point C")).toBeInTheDocument();
  });

  it("displays error message on failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: false,
          error: "API rate limit exceeded",
        }),
    });

    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByText("API rate limit exceeded")).toBeInTheDocument();
    });
  });

  it("displays error on network failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("sends correct payload to API", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, structure: { title: "T", slides: [] } }),
    });

    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "My Doc");
    await user.type(screen.getByLabelText("Document Content"), "Content here");
    await user.selectOptions(screen.getByLabelText("Number of Slides"), "7");
    await user.type(
      screen.getByLabelText("Custom Instructions (Optional)"),
      "Focus on metrics"
    );
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/generate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContent: "Content here",
          documentTitle: "My Doc",
          slideCount: 7,
          customPrompt: "Focus on metrics",
        }),
      });
    });
  });

  it("renders Google sign-in button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
  });

  it("shows login prompt when slides are generated but user is not signed in", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          structure: {
            title: "Test Presentation",
            slides: [{ title: "Slide 1", bullets: ["Point A"] }],
          },
        }),
    });

    render(<App />);

    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByText("Sign in with Google to export to Google Slides")).toBeInTheDocument();
    });
  });

  it("shows export button when user is signed in and slides are generated", async () => {
    const user = userEvent.setup();

    // Mock user info fetch
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            structure: {
              title: "Test Presentation",
              slides: [{ title: "Slide 1", bullets: ["Point A"] }],
            },
          }),
      });

    render(<App />);

    // Sign in
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    // Generate slides
    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export to Google Slides" })).toBeInTheDocument();
    });
  });

  it("exports to Google Slides when export button is clicked", async () => {
    const user = userEvent.setup();

    // Mock: user info, generate preview, export
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            structure: {
              title: "Test Presentation",
              slides: [{ title: "Slide 1", bullets: ["Point A"] }],
            },
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            slidesUrl: "https://docs.google.com/presentation/d/123/edit",
            slidesId: "123",
          }),
      });

    render(<App />);

    // Sign in
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    // Generate slides
    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export to Google Slides" })).toBeInTheDocument();
    });

    // Export to Google Slides
    await user.click(screen.getByRole("button", { name: "Export to Google Slides" }));

    await waitFor(() => {
      expect(screen.getByText("Presentation created successfully!")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open in Google Slides" })).toHaveAttribute(
        "href",
        "https://docs.google.com/presentation/d/123/edit"
      );
    });
  });

  it("shows sign out button when user is signed in", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" }),
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    });
  });

  it("displays error when export fails", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            structure: {
              title: "Test Presentation",
              slides: [{ title: "Slide 1", bullets: ["Point A"] }],
            },
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: "Failed to create presentation",
          }),
      });

    render(<App />);

    // Sign in
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    // Generate slides
    await user.type(screen.getByLabelText("Document Title"), "Test Title");
    await user.type(screen.getByLabelText("Document Content"), "Test content");
    await user.click(screen.getByRole("button", { name: "Generate Slides" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export to Google Slides" })).toBeInTheDocument();
    });

    // Export to Google Slides
    await user.click(screen.getByRole("button", { name: "Export to Google Slides" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create presentation")).toBeInTheDocument();
    });
  });
});
