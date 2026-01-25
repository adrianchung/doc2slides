import { Router, Request, Response } from "express";
import { GenerateRequest, GenerateResponse } from "../types/index.js";
import { summarizeDocument } from "../services/claude.js";
import { createPresentation } from "../services/slides.js";

export const generateRouter = Router();

// Preview endpoint - just returns AI-generated content without creating slides
generateRouter.post("/preview", async (req: Request, res: Response) => {
  try {
    const { documentContent, documentTitle, slideCount, customPrompt } = req.body;

    if (!documentContent || !documentTitle || !slideCount) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const structure = await summarizeDocument({
      content: documentContent,
      title: documentTitle,
      slideCount,
      customPrompt,
    });

    res.json({ success: true, structure });
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

generateRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateRequest;

    // Validate required fields
    if (!body.documentContent || !body.documentTitle || !body.slideCount) {
      const response: GenerateResponse = {
        success: false,
        error: "Missing required fields: documentContent, documentTitle, slideCount",
      };
      res.status(400).json(response);
      return;
    }

    if (!body.accessToken || !body.userEmail) {
      const response: GenerateResponse = {
        success: false,
        error: "Missing authentication: accessToken and userEmail required",
      };
      res.status(401).json(response);
      return;
    }

    if (body.slideCount < 3 || body.slideCount > 10) {
      const response: GenerateResponse = {
        success: false,
        error: "slideCount must be between 3 and 10",
      };
      res.status(400).json(response);
      return;
    }

    // Step 1: Use Claude to summarize and structure content
    const presentationStructure = await summarizeDocument({
      content: body.documentContent,
      title: body.documentTitle,
      slideCount: body.slideCount,
      customPrompt: body.customPrompt,
    });

    // Step 2: Create Google Slides presentation
    const { slidesUrl, slidesId } = await createPresentation({
      structure: presentationStructure,
      accessToken: body.accessToken,
      userEmail: body.userEmail,
    });

    const response: GenerateResponse = {
      success: true,
      slidesUrl,
      slidesId,
    };
    res.json(response);
  } catch (error) {
    console.error("Generation error:", error);
    const response: GenerateResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
    res.status(500).json(response);
  }
});
