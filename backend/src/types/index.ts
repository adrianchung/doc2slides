// Available slide templates
export type SlideTemplate =
  | "modern"      // Clean, minimalist with blue accents
  | "corporate"   // Professional with dark headers
  | "creative"    // Bold colors and dynamic layouts
  | "minimal"     // Simple black and white
  | "executive";  // Traditional executive style

export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface TemplateConfig {
  name: string;
  description: string;
  titleColor: RgbColor;
  bodyColor: RgbColor;
  backgroundColor: RgbColor;
}

export const SLIDE_TEMPLATES: Record<SlideTemplate, TemplateConfig> = {
  modern: {
    name: "Modern",
    description: "Clean, minimalist design with blue accents",
    titleColor: { red: 0.1, green: 0.3, blue: 0.6 },
    bodyColor: { red: 0.2, green: 0.2, blue: 0.2 },
    backgroundColor: { red: 1, green: 1, blue: 1 },
  },
  corporate: {
    name: "Corporate",
    description: "Professional design with dark headers",
    titleColor: { red: 0.15, green: 0.15, blue: 0.15 },
    bodyColor: { red: 0.3, green: 0.3, blue: 0.3 },
    backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 },
  },
  creative: {
    name: "Creative",
    description: "Bold colors and dynamic style",
    titleColor: { red: 0.8, green: 0.2, blue: 0.4 },
    bodyColor: { red: 0.25, green: 0.25, blue: 0.25 },
    backgroundColor: { red: 1, green: 0.98, blue: 0.95 },
  },
  minimal: {
    name: "Minimal",
    description: "Simple black and white design",
    titleColor: { red: 0, green: 0, blue: 0 },
    bodyColor: { red: 0.3, green: 0.3, blue: 0.3 },
    backgroundColor: { red: 1, green: 1, blue: 1 },
  },
  executive: {
    name: "Executive",
    description: "Traditional executive presentation style",
    titleColor: { red: 0.1, green: 0.2, blue: 0.4 },
    bodyColor: { red: 0.2, green: 0.2, blue: 0.2 },
    backgroundColor: { red: 0.95, green: 0.95, blue: 0.97 },
  },
};

export interface GenerateRequest {
  documentContent?: string;
  googleDocsUrl?: string;
  documentTitle: string;
  slideCount: number;
  customPrompt?: string;
  template?: SlideTemplate;
  userEmail: string;
  accessToken: string; // OAuth token from user for Slides/Docs API
}

export interface GoogleDocsContent {
  title: string;
  content: string;
}

export type DocsErrorCode =
  | "INVALID_URL"
  | "DOCUMENT_NOT_FOUND"
  | "ACCESS_DENIED";

export interface GenerateResponse {
  success: boolean;
  slidesUrl?: string;
  slidesId?: string;
  error?: string;
}

export interface SlideContent {
  title: string;
  bullets: string[];
}

export interface PresentationStructure {
  title: string;
  slides: SlideContent[];
}
