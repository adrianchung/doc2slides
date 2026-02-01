import { GoogleDocsContent, DocsErrorCode } from "../types/index.js";

export class DocsError extends Error {
  constructor(
    public code: DocsErrorCode,
    message: string,
    public httpStatus: number
  ) {
    super(message);
    this.name = "DocsError";
  }
}

/**
 * Extract document ID from various Google Docs URL formats
 * Supports:
 * - https://docs.google.com/document/d/{id}/edit
 * - https://docs.google.com/document/d/{id}/view
 * - https://docs.google.com/document/d/{id}
 */
export function extractDocumentId(url: string): string {
  const patterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  throw new DocsError(
    "INVALID_URL",
    "Invalid Google Docs URL format",
    400
  );
}

interface DocsApiParagraph {
  elements?: Array<{
    textRun?: {
      content?: string;
    };
  }>;
}

interface DocsApiContent {
  paragraph?: DocsApiParagraph;
}

interface DocsApiResponse {
  title?: string;
  body?: {
    content?: DocsApiContent[];
  };
}

/**
 * Extract plain text from Google Docs API document structure
 */
export function extractTextFromDocument(document: DocsApiResponse): string {
  const content = document.body?.content || [];
  let text = "";

  for (const element of content) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      if (paragraph.elements) {
        for (const textElement of paragraph.elements) {
          if (textElement.textRun?.content) {
            text += textElement.textRun.content;
          }
        }
      }
    }
  }

  return text.trim();
}

/**
 * Fetch content from a Google Docs URL using the Docs API
 */
export async function fetchGoogleDocsContent(
  url: string,
  accessToken: string
): Promise<GoogleDocsContent> {
  const documentId = extractDocumentId(url);

  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new DocsError(
        "DOCUMENT_NOT_FOUND",
        "Document not found",
        400
      );
    }
    if (response.status === 403 || response.status === 401) {
      throw new DocsError(
        "ACCESS_DENIED",
        "No permission to access document",
        403
      );
    }
    throw new DocsError(
      "ACCESS_DENIED",
      `Failed to fetch document: ${response.statusText}`,
      response.status
    );
  }

  const document: DocsApiResponse = await response.json();
  const content = extractTextFromDocument(document);
  const title = document.title || "Untitled Document";

  return { title, content };
}
