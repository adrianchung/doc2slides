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

describe("POST /generate", () => {
  const app = express();
  app.use(express.json());
  app.use("/generate", generateRouter);

  it("should return 400 if documentContent is missing", async () => {
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
    expect(response.body.error).toContain("Missing required fields");
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
});

describe("POST /generate/preview", () => {
  const app = express();
  app.use(express.json());
  app.use("/generate", generateRouter);

  it("should return 400 if required fields are missing", async () => {
    const response = await request(app)
      .post("/generate/preview")
      .send({
        documentTitle: "Title",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Missing required fields");
  });

  it("should return slide structure without requiring auth", async () => {
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
});
