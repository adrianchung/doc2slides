import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractDocumentId, extractTextFromDocument, fetchGoogleDocsContent, DocsError } from "../services/docs.js";

describe("extractDocumentId", () => {
  it("should extract ID from standard edit URL", () => {
    const url = "https://docs.google.com/document/d/1ABC123xyz_-/edit";
    expect(extractDocumentId(url)).toBe("1ABC123xyz_-");
  });

  it("should extract ID from view URL", () => {
    const url = "https://docs.google.com/document/d/1ABC123xyz_-/view";
    expect(extractDocumentId(url)).toBe("1ABC123xyz_-");
  });

  it("should extract ID from URL without suffix", () => {
    const url = "https://docs.google.com/document/d/1ABC123xyz_-";
    expect(extractDocumentId(url)).toBe("1ABC123xyz_-");
  });

  it("should extract ID from URL with query parameters", () => {
    const url = "https://docs.google.com/document/d/1ABC123xyz_-/edit?usp=sharing";
    expect(extractDocumentId(url)).toBe("1ABC123xyz_-");
  });

  it("should throw DocsError for invalid URL", () => {
    const url = "https://example.com/document/d/123";
    expect(() => extractDocumentId(url)).toThrow(DocsError);
    try {
      extractDocumentId(url);
    } catch (error) {
      expect(error).toBeInstanceOf(DocsError);
      expect((error as DocsError).code).toBe("INVALID_URL");
      expect((error as DocsError).httpStatus).toBe(400);
    }
  });

  it("should throw DocsError for Google Sheets URL", () => {
    const url = "https://docs.google.com/spreadsheets/d/1ABC123xyz_-/edit";
    expect(() => extractDocumentId(url)).toThrow(DocsError);
  });

  it("should throw DocsError for Google Slides URL", () => {
    const url = "https://docs.google.com/presentation/d/1ABC123xyz_-/edit";
    expect(() => extractDocumentId(url)).toThrow(DocsError);
  });

  it("should throw DocsError for empty string", () => {
    expect(() => extractDocumentId("")).toThrow(DocsError);
  });

  it("should throw DocsError for random string", () => {
    expect(() => extractDocumentId("not a url")).toThrow(DocsError);
  });
});

describe("extractTextFromDocument", () => {
  it("should extract text from a simple document", () => {
    const doc = {
      title: "Test Document",
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: "Hello " } },
                { textRun: { content: "World" } },
              ],
            },
          },
        ],
      },
    };
    expect(extractTextFromDocument(doc)).toBe("Hello World");
  });

  it("should handle multiple paragraphs", () => {
    const doc = {
      title: "Test Document",
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: "Line 1\n" } }],
            },
          },
          {
            paragraph: {
              elements: [{ textRun: { content: "Line 2" } }],
            },
          },
        ],
      },
    };
    expect(extractTextFromDocument(doc)).toBe("Line 1\nLine 2");
  });

  it("should handle empty document", () => {
    const doc = {
      title: "Empty Document",
      body: {
        content: [],
      },
    };
    expect(extractTextFromDocument(doc)).toBe("");
  });

  it("should handle document with no body", () => {
    const doc = {
      title: "No Body",
    };
    expect(extractTextFromDocument(doc)).toBe("");
  });

  it("should handle elements without textRun", () => {
    const doc = {
      title: "Test",
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: "Text" } },
                {}, // element without textRun
              ],
            },
          },
        ],
      },
    };
    expect(extractTextFromDocument(doc)).toBe("Text");
  });
});

describe("fetchGoogleDocsContent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch and parse document content", async () => {
    const mockDocument = {
      title: "My Document",
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: "Document content here" } }],
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument),
    });

    const result = await fetchGoogleDocsContent(
      "https://docs.google.com/document/d/test123/edit",
      "mock-token"
    );

    expect(result).toEqual({
      title: "My Document",
      content: "Document content here",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://docs.googleapis.com/v1/documents/test123",
      {
        headers: {
          Authorization: "Bearer mock-token",
        },
      }
    );
  });

  it("should use 'Untitled Document' when title is missing", async () => {
    const mockDocument = {
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: "Content" } }],
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument),
    });

    const result = await fetchGoogleDocsContent(
      "https://docs.google.com/document/d/test123/edit",
      "mock-token"
    );

    expect(result.title).toBe("Untitled Document");
  });

  it("should throw DocsError with DOCUMENT_NOT_FOUND for 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(
      fetchGoogleDocsContent(
        "https://docs.google.com/document/d/notfound/edit",
        "mock-token"
      )
    ).rejects.toThrow(DocsError);

    try {
      await fetchGoogleDocsContent(
        "https://docs.google.com/document/d/notfound/edit",
        "mock-token"
      );
    } catch (error) {
      expect((error as DocsError).code).toBe("DOCUMENT_NOT_FOUND");
      expect((error as DocsError).httpStatus).toBe(400);
    }
  });

  it("should fallback to Drive API on 403 and succeed", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "Shared Document" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("Content from Drive API"),
      });

    const result = await fetchGoogleDocsContent(
      "https://docs.google.com/document/d/shared123/edit",
      "mock-token"
    );

    expect(result).toEqual({
      title: "Shared Document",
      content: "Content from Drive API",
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/drive/v3/files/shared123?fields=name",
      { headers: { Authorization: "Bearer mock-token" } }
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "https://www.googleapis.com/drive/v3/files/shared123/export?mimeType=text/plain",
      { headers: { Authorization: "Bearer mock-token" } }
    );
  });

  it("should fallback to Drive API on 401 and succeed", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "Auth Fallback Doc" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("Fallback content"),
      });

    const result = await fetchGoogleDocsContent(
      "https://docs.google.com/document/d/test/edit",
      "mock-token"
    );

    expect(result).toEqual({
      title: "Auth Fallback Doc",
      content: "Fallback content",
    });
  });

  it("should throw DocsError when Drive API fallback also fails with 404", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

    try {
      await fetchGoogleDocsContent(
        "https://docs.google.com/document/d/notfound/edit",
        "mock-token"
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(DocsError);
      expect((error as DocsError).code).toBe("DOCUMENT_NOT_FOUND");
    }
  });

  it("should throw DocsError when Drive API fallback fails with 403", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

    try {
      await fetchGoogleDocsContent(
        "https://docs.google.com/document/d/private/edit",
        "mock-token"
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(DocsError);
      expect((error as DocsError).code).toBe("ACCESS_DENIED");
      expect((error as DocsError).httpStatus).toBe(403);
    }
  });

  it("should throw DocsError for other HTTP errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    try {
      await fetchGoogleDocsContent(
        "https://docs.google.com/document/d/test/edit",
        "mock-token"
      );
    } catch (error) {
      expect((error as DocsError).code).toBe("ACCESS_DENIED");
      expect((error as DocsError).httpStatus).toBe(500);
    }
  });
});
