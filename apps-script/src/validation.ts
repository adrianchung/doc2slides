/**
 * Validation functions for Doc2Slides Apps Script
 * This module contains the testable validation logic used by the Apps Script
 */

export const MIN_SLIDE_COUNT = 3;
export const MAX_SLIDE_COUNT = 10;
export const MIN_CONTENT_LENGTH = 50;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface GenerationConfig {
  slideCount: number;
  customPrompt?: string;
}

export interface DocumentData {
  title: string;
  content: string;
  userEmail: string;
}

export interface GeneratePayload {
  documentContent: string;
  documentTitle: string;
  slideCount: number;
  customPrompt: string;
  userEmail: string;
  accessToken: string;
}

export interface PreviewPayload {
  documentContent: string;
  documentTitle: string;
  slideCount: number;
  customPrompt: string;
}

export interface SlideContent {
  title: string;
  bullets: string[];
}

export interface PresentationStructure {
  title: string;
  slides: SlideContent[];
}

export interface GenerateResult {
  success: boolean;
  slidesUrl?: string;
  slidesId?: string;
  error?: string;
}

export interface PreviewResult {
  success: boolean;
  structure?: PresentationStructure;
  error?: string;
}

/**
 * Validates the generation configuration
 */
export function validateConfig(config: GenerationConfig | null | undefined): ValidationResult {
  if (!config) {
    return { isValid: false, error: 'Configuration is required' };
  }

  if (typeof config.slideCount !== 'number') {
    return { isValid: false, error: 'Slide count must be a number' };
  }

  if (config.slideCount < MIN_SLIDE_COUNT || config.slideCount > MAX_SLIDE_COUNT) {
    return {
      isValid: false,
      error: `Slide count must be between ${MIN_SLIDE_COUNT} and ${MAX_SLIDE_COUNT}`
    };
  }

  return { isValid: true };
}

/**
 * Validates the document content
 */
export function validateContent(content: string | null | undefined): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Document content is required' };
  }

  if (content.trim().length < MIN_CONTENT_LENGTH) {
    return {
      isValid: false,
      error: `Document content is too short. Please add more content (minimum ${MIN_CONTENT_LENGTH} characters).`
    };
  }

  return { isValid: true };
}

/**
 * Builds the payload for the generate endpoint
 */
export function buildGeneratePayload(
  docData: DocumentData,
  config: GenerationConfig,
  accessToken: string
): GeneratePayload {
  return {
    documentContent: docData.content,
    documentTitle: docData.title,
    slideCount: config.slideCount,
    customPrompt: config.customPrompt || '',
    userEmail: docData.userEmail,
    accessToken: accessToken
  };
}

/**
 * Builds the payload for the preview endpoint
 */
export function buildPreviewPayload(
  docData: DocumentData,
  config: GenerationConfig
): PreviewPayload {
  return {
    documentContent: docData.content,
    documentTitle: docData.title,
    slideCount: config.slideCount,
    customPrompt: config.customPrompt || ''
  };
}

/**
 * Parses the HTTP response and returns a standardized result
 */
export function parseGenerateResponse(
  responseCode: number,
  responseText: string
): GenerateResult {
  // Handle server errors
  if (responseCode >= 500) {
    return {
      success: false,
      error: `Server error (${responseCode}). Please try again later.`
    };
  }

  // Parse JSON
  let result: GenerateResult;
  try {
    result = JSON.parse(responseText);
  } catch {
    return {
      success: false,
      error: 'Invalid response from server. Please try again.'
    };
  }

  // Handle client errors
  if (responseCode >= 400) {
    return {
      success: false,
      error: result.error || `Request failed with status ${responseCode}`
    };
  }

  // Handle success/failure from response body
  if (result.success) {
    return {
      success: true,
      slidesUrl: result.slidesUrl,
      slidesId: result.slidesId
    };
  } else {
    return {
      success: false,
      error: result.error || 'Unknown error occurred'
    };
  }
}

/**
 * Parses the HTTP response for preview endpoint
 */
export function parsePreviewResponse(
  responseCode: number,
  responseText: string
): PreviewResult {
  // Handle server errors
  if (responseCode >= 500) {
    return {
      success: false,
      error: `Server error (${responseCode}). Please try again later.`
    };
  }

  // Parse JSON
  let result: PreviewResult;
  try {
    result = JSON.parse(responseText);
  } catch {
    return {
      success: false,
      error: 'Invalid response from server.'
    };
  }

  // Handle client errors
  if (responseCode >= 400) {
    return {
      success: false,
      error: result.error || `Request failed with status ${responseCode}`
    };
  }

  // Handle success/failure from response body
  if (result.success) {
    return {
      success: true,
      structure: result.structure
    };
  } else {
    return {
      success: false,
      error: result.error || 'Unknown error occurred'
    };
  }
}

/**
 * Parses network errors into user-friendly messages
 */
export function parseNetworkError(errorMessage: string): string {
  if (errorMessage.includes('Unable to fetch') || errorMessage.includes('DNS')) {
    return 'Cannot connect to server. Please check your internet connection.';
  }
  return `Failed to connect to server: ${errorMessage}`;
}
