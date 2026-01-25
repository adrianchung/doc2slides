export interface GenerateRequest {
  documentContent: string;
  documentTitle: string;
  slideCount: number;
  customPrompt?: string;
  userEmail: string;
  accessToken: string; // OAuth token from user for Slides API
}

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
