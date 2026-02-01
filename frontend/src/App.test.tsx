import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
        ok: true,
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
        ok: true,
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
      ok: true,
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
        ok: true,
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

  // OAuth Persistence Tests
  describe("OAuth Persistence", () => {
    it("saves auth to localStorage on successful sign in", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" }),
      });

      render(<App />);

      await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Verify localStorage was set
      expect(localStorage.getItem("doc2slides_access_token")).toBe("mock-access-token");
      expect(localStorage.getItem("doc2slides_user_info")).toContain("test@example.com");
      expect(localStorage.getItem("doc2slides_token_expiry")).toBeTruthy();
    });

    it("restores auth from localStorage on mount when token is valid", async () => {
      // Set up localStorage with valid auth
      const futureExpiry = Date.now() + 3600 * 1000; // 1 hour from now
      localStorage.setItem("doc2slides_access_token", "stored-token");
      localStorage.setItem("doc2slides_user_info", JSON.stringify({
        email: "stored@example.com",
        name: "Stored User",
        picture: "https://example.com/stored.jpg",
      }));
      localStorage.setItem("doc2slides_token_expiry", futureExpiry.toString());

      // Mock the token validation fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          email: "stored@example.com",
          name: "Stored User",
          picture: "https://example.com/stored.jpg",
        }),
      });

      render(<App />);

      // Should show loading initially, then restore the user
      await waitFor(() => {
        expect(screen.getByText("Stored User")).toBeInTheDocument();
      });

      // Should have called Google's userinfo endpoint to validate the token
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: "Bearer stored-token" } }
      );
    });

    it("clears localStorage when stored token is expired", async () => {
      // Set up localStorage with expired auth
      const pastExpiry = Date.now() - 1000; // 1 second ago
      localStorage.setItem("doc2slides_access_token", "expired-token");
      localStorage.setItem("doc2slides_user_info", JSON.stringify({
        email: "expired@example.com",
        name: "Expired User",
        picture: "https://example.com/expired.jpg",
      }));
      localStorage.setItem("doc2slides_token_expiry", pastExpiry.toString());

      render(<App />);

      // Should show sign in button (not the user)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
      });

      // localStorage should be cleared
      expect(localStorage.getItem("doc2slides_access_token")).toBeNull();
      expect(localStorage.getItem("doc2slides_user_info")).toBeNull();
      expect(localStorage.getItem("doc2slides_token_expiry")).toBeNull();
    });

    it("clears localStorage when stored token validation fails", async () => {
      // Set up localStorage with auth that will fail validation
      const futureExpiry = Date.now() + 3600 * 1000;
      localStorage.setItem("doc2slides_access_token", "invalid-token");
      localStorage.setItem("doc2slides_user_info", JSON.stringify({
        email: "invalid@example.com",
        name: "Invalid User",
        picture: "https://example.com/invalid.jpg",
      }));
      localStorage.setItem("doc2slides_token_expiry", futureExpiry.toString());

      // Mock validation failure (401 unauthorized)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      render(<App />);

      // Should show sign in button after validation fails
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
      });

      // localStorage should be cleared
      expect(localStorage.getItem("doc2slides_access_token")).toBeNull();
    });

    it("clears localStorage on sign out", async () => {
      const user = userEvent.setup();

      // Sign in first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" }),
      });

      render(<App />);

      await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Verify localStorage has auth
      expect(localStorage.getItem("doc2slides_access_token")).toBe("mock-access-token");

      // Sign out
      await user.click(screen.getByRole("button", { name: "Sign Out" }));

      // Verify localStorage is cleared
      expect(localStorage.getItem("doc2slides_access_token")).toBeNull();
      expect(localStorage.getItem("doc2slides_user_info")).toBeNull();
      expect(localStorage.getItem("doc2slides_token_expiry")).toBeNull();

      // Should show sign in button again
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    });

    it("handles corrupted localStorage data gracefully", async () => {
      // Set up localStorage with corrupted JSON
      const futureExpiry = Date.now() + 3600 * 1000;
      localStorage.setItem("doc2slides_access_token", "some-token");
      localStorage.setItem("doc2slides_user_info", "not-valid-json{{{");
      localStorage.setItem("doc2slides_token_expiry", futureExpiry.toString());

      render(<App />);

      // Should show sign in button (corrupted data should be cleared)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
      });

      // localStorage should be cleared due to JSON parse error
      expect(localStorage.getItem("doc2slides_access_token")).toBeNull();
    });

    it("shows error when user info fetch fails during login", async () => {
      const user = userEvent.setup();

      // Mock user info fetch failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<App />);

      await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to fetch user information. Please try again.")).toBeInTheDocument();
      });

      // Should still show sign in button
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    });

    it("shows loading state while restoring auth", async () => {
      // Set up localStorage with valid auth
      const futureExpiry = Date.now() + 3600 * 1000;
      localStorage.setItem("doc2slides_access_token", "stored-token");
      localStorage.setItem("doc2slides_user_info", JSON.stringify({
        email: "stored@example.com",
        name: "Stored User",
        picture: "https://example.com/stored.jpg",
      }));
      localStorage.setItem("doc2slides_token_expiry", futureExpiry.toString());

      // Make validation take some time
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            email: "stored@example.com",
            name: "Stored User",
            picture: "https://example.com/stored.jpg",
          }),
        }), 100))
      );

      render(<App />);

      // Should show loading initially
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // Then should show the restored user
      await waitFor(() => {
        expect(screen.getByText("Stored User")).toBeInTheDocument();
      });
    });
  });
});
