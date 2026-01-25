import { google } from "googleapis";
import { PresentationStructure } from "../types/index.js";

interface CreatePresentationParams {
  structure: PresentationStructure;
  accessToken: string;
  userEmail: string;
}

interface CreatePresentationResult {
  slidesUrl: string;
  slidesId: string;
}

export async function createPresentation(
  params: CreatePresentationParams
): Promise<CreatePresentationResult> {
  const { structure, accessToken } = params;

  // Create OAuth2 client with user's access token
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const slides = google.slides({ version: "v1", auth });

  // Step 1: Create a new presentation
  const presentation = await slides.presentations.create({
    requestBody: {
      title: structure.title,
    },
  });

  const presentationId = presentation.data.presentationId;
  if (!presentationId) {
    throw new Error("Failed to create presentation");
  }

  // Get the title slide ID (created by default)
  const titleSlideId = presentation.data.slides?.[0]?.objectId;

  // Step 2: Build batch update requests
  const requests: any[] = [];

  // Update title slide
  if (titleSlideId) {
    const titleShapeId = presentation.data.slides?.[0]?.pageElements?.find(
      (el) => el.shape?.placeholder?.type === "CENTERED_TITLE" ||
             el.shape?.placeholder?.type === "TITLE"
    )?.objectId;

    if (titleShapeId) {
      requests.push({
        insertText: {
          objectId: titleShapeId,
          text: structure.title,
          insertionIndex: 0,
        },
      });
    }
  }

  // Create content slides
  for (let i = 0; i < structure.slides.length; i++) {
    const slide = structure.slides[i];
    const slideId = `slide_${i}`;
    const titleId = `title_${i}`;
    const bodyId = `body_${i}`;

    // Create new slide with title and body layout
    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: i + 1,
        slideLayoutReference: {
          predefinedLayout: "TITLE_AND_BODY",
        },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: "TITLE", index: 0 },
            objectId: titleId,
          },
          {
            layoutPlaceholder: { type: "BODY", index: 0 },
            objectId: bodyId,
          },
        ],
      },
    });

    // Add title text
    requests.push({
      insertText: {
        objectId: titleId,
        text: slide.title,
        insertionIndex: 0,
      },
    });

    // Add bullet points
    const bulletText = slide.bullets.map((b) => `${b}`).join("\n");
    requests.push({
      insertText: {
        objectId: bodyId,
        text: bulletText,
        insertionIndex: 0,
      },
    });

    // Format as bullet list
    requests.push({
      createParagraphBullets: {
        objectId: bodyId,
        textRange: {
          type: "ALL",
        },
        bulletPreset: "BULLET_DISC_CIRCLE_SQUARE",
      },
    });
  }

  // Step 3: Execute batch update
  if (requests.length > 0) {
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests,
      },
    });
  }

  const slidesUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  return {
    slidesUrl,
    slidesId: presentationId,
  };
}
