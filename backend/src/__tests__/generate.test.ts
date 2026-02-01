import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { generateRouter } from "../routes/generate.js";

// Mock the services
vi.mock("../services/claude.js", () => ({
  summarizeDocument: vi.fn().mockResolvedValue({
    title: "Test Title",
    slides: [
      { title: "Slide 1", bullets: ["Point 1", "Point 2"] },
    ],
  }),
}));

vi.mock("../services/slides.js", () => ({
  createPresentation: vi.fn().mockResolvedValue({
    slidesUrl: "https://docs.google.com/presentation/d/test",
    slidesId: "test-id",
  }),
}));

vi.mock("../services/docs.js", () => ({
  fetchGoogleDocsContent: vi.fn().mockResolvedValue({
    title: "Fetched Document Title",
    content: "Fetched document content from Google Docs",
  }),
  DocsError: class DocsError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
}));

describe("POST /generate", () => {
  const app = express();
  app.use(express.json());
  app.use("/generate", generateRouter);

  it("should return 400 if neither documentContent nor googleDocsUrl is provided", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentTitle: "Title",
        slideCount: 5,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("Either documentContent or googleDocsUrl is required");
  });

  it("should return 400 if documentTitle is missing", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        slideCount: 5,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should return 400 if slideCount is missing", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should return 401 if accessToken is missing", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 5,
        userEmail: "test@example.com",
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("accessToken");
  });

  it("should return 401 if userEmail is missing", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 5,
        accessToken: "token",
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("userEmail");
  });

  it("should return 400 if slideCount is less than 3", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 2,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("slideCount must be between 3 and 10");
  });

  it("should return 400 if slideCount is greater than 10", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 11,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("slideCount must be between 3 and 10");
  });

  it("should return success with valid input", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 5,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.slidesUrl).toBeDefined();
    expect(response.body.slidesId).toBeDefined();
  });

  it("should accept valid template", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 5,
        template: "corporate",
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should return 400 for invalid template", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 5,
        template: "invalid-template",
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid template");
  });

  it("should accept googleDocsUrl instead of documentContent", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        googleDocsUrl: "https://docs.google.com/document/d/test123/edit",
        slideCount: 5,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.slidesUrl).toBeDefined();
  });

  it("should use fetched title when documentTitle not provided with googleDocsUrl", async () => {
    const response = await request(app)
      .post("/generate")
      .send({
        googleDocsUrl: "https://docs.google.com/document/d/test123/edit",
        slideCount: 5,
        userEmail: "test@example.com",
        accessToken: "token",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe("GET /generate/templates", () => {
  const app = express();
  app.use(express.json());
  app.use("/generate", generateRouter);

  it("should return list of available templates", async () => {
    const response = await request(app).get("/generate/templates");

    expect(response.status).toBe(200);
    expect(response.body.templates).toBeInstanceOf(Array);
    expect(response.body.templates.length).toBeGreaterThan(0);

    const templateIds = response.body.templates.map((t: { id: string }) => t.id);
    expect(templateIds).toContain("modern");
    expect(templateIds).toContain("corporate");
    expect(templateIds).toContain("creative");
    expect(templateIds).toContain("minimal");
    expect(templateIds).toContain("executive");
  });

  it("should return template with name and description", async () => {
    const response = await request(app).get("/generate/templates");

    const modernTemplate = response.body.templates.find((t: { id: string }) => t.id === "modern");
    expect(modernTemplate).toBeDefined();
    expect(modernTemplate.name).toBe("Modern");
    expect(modernTemplate.description).toBeDefined();
  });
});

describe("POST /generate/preview", () => {
  const app = express();
  app.use(express.json());
  app.use("/generate", generateRouter);

  it("should return 400 if neither documentContent nor googleDocsUrl is provided", async () => {
    const response = await request(app)
      .post("/generate/preview")
      .send({
        documentTitle: "Title",
        slideCount: 5,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Either documentContent or googleDocsUrl is required");
  });

  it("should return slide structure without requiring auth for paste mode", async () => {
    const response = await request(app)
      .post("/generate/preview")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
        slideCount: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.structure).toBeDefined();
    expect(response.body.structure.slides).toBeInstanceOf(Array);
  });

  it("should return 401 when googleDocsUrl provided without accessToken", async () => {
    const response = await request(app)
      .post("/generate/preview")
      .send({
        googleDocsUrl: "https://docs.google.com/document/d/test123/edit",
        slideCount: 5,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Sign in required to import from Google Docs");
  });

  it("should accept googleDocsUrl with accessToken", async () => {
    const response = await request(app)
      .post("/generate/preview")
      .send({
        googleDocsUrl: "https://docs.google.com/document/d/test123/edit",
        slideCount: 5,
        accessToken: "valid-token",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.structure).toBeDefined();
    expect(response.body.documentTitle).toBe("Fetched Document Title");
  });

  it("should return 400 if slideCount is missing", async () => {
    const response = await request(app)
      .post("/generate/preview")
      .send({
        documentContent: "Content",
        documentTitle: "Title",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Missing required fields");
  });
});
