import { describe, it, expect } from "vitest";
import { buildExecutivePrompt } from "../services/prompts.js";

describe("buildExecutivePrompt", () => {
  it("should include the document content", () => {
    const prompt = buildExecutivePrompt({
      content: "Test document content",
      slideCount: 5,
    });

    expect(prompt).toContain("Test document content");
  });

  it("should specify the correct slide count", () => {
    const prompt = buildExecutivePrompt({
      content: "Content",
      slideCount: 7,
    });

    expect(prompt).toContain("7-slide presentation");
    expect(prompt).toContain("exactly 7 slides");
  });

  it("should include custom prompt when provided", () => {
    const prompt = buildExecutivePrompt({
      content: "Content",
      slideCount: 5,
      customPrompt: "Focus on revenue metrics",
    });

    expect(prompt).toContain("Focus on revenue metrics");
    expect(prompt).toContain("ADDITIONAL INSTRUCTIONS FROM USER");
  });

  it("should not include custom prompt section when not provided", () => {
    const prompt = buildExecutivePrompt({
      content: "Content",
      slideCount: 5,
    });

    expect(prompt).not.toContain("ADDITIONAL INSTRUCTIONS FROM USER");
  });

  it("should request JSON output format", () => {
    const prompt = buildExecutivePrompt({
      content: "Content",
      slideCount: 5,
    });

    expect(prompt).toContain("valid JSON");
    expect(prompt).toContain('"slides"');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"bullets"');
  });

  it("should include executive-focused instructions", () => {
    const prompt = buildExecutivePrompt({
      content: "Content",
      slideCount: 5,
    });

    expect(prompt).toContain("executive");
    expect(prompt).toContain("Key decisions");
    expect(prompt).toContain("metrics");
  });
});
