import { GoogleGenerativeAI } from "@google/generative-ai";
import { PresentationStructure, SlideContent } from "../types/index.js";
import { buildExecutivePrompt } from "./prompts.js";

// Lazy initialization to ensure env is loaded first
let genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return genAI;
}

// Check if we should use mock mode (no API key in development)
function shouldUseMock(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !apiKey || apiKey.trim() === "";
}

// Generate mock slides for testing without API key
function generateMockSlides(title: string, slideCount: number): PresentationStructure {
  const mockSlides: SlideContent[] = [];

  const sampleTitles = [
    "Executive Summary",
    "Key Findings",
    "Market Analysis",
    "Financial Overview",
    "Strategic Initiatives",
    "Risk Assessment",
    "Timeline & Milestones",
    "Resource Requirements",
    "Expected Outcomes",
    "Next Steps"
  ];

  const sampleBullets = [
    ["Revenue increased 25% quarter-over-quarter", "Customer acquisition cost reduced by 15%", "Net promoter score improved to 72"],
    ["Market share expanded to 18% in core segments", "Three new enterprise clients onboarded", "Product adoption rate exceeded targets by 20%"],
    ["Competitive landscape remains favorable", "New market opportunities identified in APAC", "Brand awareness increased 30% YoY"],
    ["Operating margin improved to 22%", "Cash reserves at $50M", "Debt-to-equity ratio at healthy 0.3"],
    ["Digital transformation 60% complete", "New product launch scheduled Q2", "Partnership discussions advancing with key players"]
  ];

  for (let i = 0; i < slideCount; i++) {
    mockSlides.push({
      title: sampleTitles[i % sampleTitles.length],
      bullets: sampleBullets[i % sampleBullets.length]
    });
  }

  return {
    title,
    slides: mockSlides
  };
}

interface SummarizeParams {
  content: string;
  title: string;
  slideCount: number;
  customPrompt?: string;
}

interface SlideResponse {
  slides: Array<{
    title: string;
    bullets: string[];
  }>;
}

export async function summarizeDocument(
  params: SummarizeParams
): Promise<PresentationStructure> {
  const { content, title, slideCount, customPrompt } = params;

  // Use mock data when no API key is configured (for local development/testing)
  if (shouldUseMock()) {
    console.log("[Mock Mode] Returning mock slides (no GEMINI_API_KEY configured)");
    return generateMockSlides(title, slideCount);
  }

  const prompt = buildExecutivePrompt({
    content,
    slideCount,
    customPrompt,
  });

  const model = getGenAI().getGenerativeModel({ model: "gemini-3-flash-preview" });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Parse JSON response
  let parsed: SlideResponse;
  try {
    // Clean up potential markdown code blocks
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${text}`);
  }

  // Validate structure
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error("Invalid response structure: missing slides array");
  }

  const slides: SlideContent[] = parsed.slides.map((slide, index) => {
    if (!slide.title || !Array.isArray(slide.bullets)) {
      throw new Error(`Invalid slide structure at index ${index}`);
    }
    return {
      title: slide.title,
      bullets: slide.bullets.filter((b) => typeof b === "string" && b.trim()),
    };
  });

  return {
    title,
    slides,
  };
}
