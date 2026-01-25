import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("App", () => {
  beforeEach(() => {
    mockFetch.mockReset();
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
});
