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
