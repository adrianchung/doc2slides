import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  validateContent,
  buildGeneratePayload,
  buildPreviewPayload,
  parseGenerateResponse,
  parsePreviewResponse,
  parseNetworkError,
  MIN_SLIDE_COUNT,
  MAX_SLIDE_COUNT,
  MIN_CONTENT_LENGTH
} from '../validation.js';

describe('validateConfig', () => {
  it('should return error when config is null', () => {
    const result = validateConfig(null);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Configuration is required');
  });

  it('should return error when config is undefined', () => {
    const result = validateConfig(undefined);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Configuration is required');
  });

  it('should return error when slideCount is not a number', () => {
    const result = validateConfig({ slideCount: 'five' as unknown as number });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Slide count must be a number');
  });

  it('should return error when slideCount is below minimum', () => {
    const result = validateConfig({ slideCount: MIN_SLIDE_COUNT - 1 });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(`between ${MIN_SLIDE_COUNT} and ${MAX_SLIDE_COUNT}`);
  });

  it('should return error when slideCount is above maximum', () => {
    const result = validateConfig({ slideCount: MAX_SLIDE_COUNT + 1 });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(`between ${MIN_SLIDE_COUNT} and ${MAX_SLIDE_COUNT}`);
  });

  it('should return valid for minimum slide count', () => {
    const result = validateConfig({ slideCount: MIN_SLIDE_COUNT });
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for maximum slide count', () => {
    const result = validateConfig({ slideCount: MAX_SLIDE_COUNT });
    expect(result.isValid).toBe(true);
  });

  it('should return valid for middle range slide count', () => {
    const result = validateConfig({ slideCount: 5 });
    expect(result.isValid).toBe(true);
  });

  it('should accept config with optional customPrompt', () => {
    const result = validateConfig({ slideCount: 5, customPrompt: 'Focus on metrics' });
    expect(result.isValid).toBe(true);
  });
});

describe('validateContent', () => {
  it('should return error when content is null', () => {
    const result = validateContent(null);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Document content is required');
  });

  it('should return error when content is undefined', () => {
    const result = validateContent(undefined);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Document content is required');
  });

  it('should return error when content is empty string', () => {
    const result = validateContent('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Document content is required');
  });

  it('should return error when content is too short', () => {
    const shortContent = 'a'.repeat(MIN_CONTENT_LENGTH - 1);
    const result = validateContent(shortContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(`minimum ${MIN_CONTENT_LENGTH} characters`);
  });

  it('should return error when content is only whitespace', () => {
    const whitespaceContent = ' '.repeat(MIN_CONTENT_LENGTH + 10);
    const result = validateContent(whitespaceContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('should return valid for content at minimum length', () => {
    const validContent = 'a'.repeat(MIN_CONTENT_LENGTH);
    const result = validateContent(validContent);
    expect(result.isValid).toBe(true);
  });

  it('should return valid for long content', () => {
    const longContent = 'This is a test document with plenty of content. '.repeat(50);
    const result = validateContent(longContent);
    expect(result.isValid).toBe(true);
  });
});

describe('buildGeneratePayload', () => {
  const mockDocData = {
    title: 'Test Document',
    content: 'This is the document content.',
    userEmail: 'user@example.com'
  };

  it('should build payload with all required fields', () => {
    const config = { slideCount: 5 };
    const payload = buildGeneratePayload(mockDocData, config, 'test-token');

    expect(payload.documentContent).toBe(mockDocData.content);
    expect(payload.documentTitle).toBe(mockDocData.title);
    expect(payload.slideCount).toBe(5);
    expect(payload.userEmail).toBe(mockDocData.userEmail);
    expect(payload.accessToken).toBe('test-token');
    expect(payload.customPrompt).toBe('');
  });

  it('should include custom prompt when provided', () => {
    const config = { slideCount: 5, customPrompt: 'Focus on Q4 metrics' };
    const payload = buildGeneratePayload(mockDocData, config, 'test-token');

    expect(payload.customPrompt).toBe('Focus on Q4 metrics');
  });
});

describe('buildPreviewPayload', () => {
  const mockDocData = {
    title: 'Test Document',
    content: 'This is the document content.',
    userEmail: 'user@example.com'
  };

  it('should build payload without auth fields', () => {
    const config = { slideCount: 5 };
    const payload = buildPreviewPayload(mockDocData, config);

    expect(payload.documentContent).toBe(mockDocData.content);
    expect(payload.documentTitle).toBe(mockDocData.title);
    expect(payload.slideCount).toBe(5);
    expect(payload.customPrompt).toBe('');
    expect((payload as Record<string, unknown>).accessToken).toBeUndefined();
    expect((payload as Record<string, unknown>).userEmail).toBeUndefined();
  });
});

describe('parseGenerateResponse', () => {
  it('should handle server error (500)', () => {
    const result = parseGenerateResponse(500, '{}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Server error (500)');
  });

  it('should handle server error (503)', () => {
    const result = parseGenerateResponse(503, '{}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Server error (503)');
  });

  it('should handle invalid JSON response', () => {
    const result = parseGenerateResponse(200, 'not json');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid response');
  });

  it('should handle 400 error with message', () => {
    const responseBody = JSON.stringify({ success: false, error: 'Missing required fields' });
    const result = parseGenerateResponse(400, responseBody);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing required fields');
  });

  it('should handle 401 error', () => {
    const responseBody = JSON.stringify({ success: false, error: 'Unauthorized' });
    const result = parseGenerateResponse(401, responseBody);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('should handle 400 error without message', () => {
    const responseBody = JSON.stringify({ success: false });
    const result = parseGenerateResponse(400, responseBody);
    expect(result.success).toBe(false);
    expect(result.error).toContain('status 400');
  });

  it('should handle successful response', () => {
    const responseBody = JSON.stringify({
      success: true,
      slidesUrl: 'https://docs.google.com/presentation/d/123',
      slidesId: '123'
    });
    const result = parseGenerateResponse(200, responseBody);
    expect(result.success).toBe(true);
    expect(result.slidesUrl).toBe('https://docs.google.com/presentation/d/123');
    expect(result.slidesId).toBe('123');
  });

  it('should handle response with success:false in body', () => {
    const responseBody = JSON.stringify({
      success: false,
      error: 'API quota exceeded'
    });
    const result = parseGenerateResponse(200, responseBody);
    expect(result.success).toBe(false);
    expect(result.error).toBe('API quota exceeded');
  });

  it('should handle response with success:false but no error message', () => {
    const responseBody = JSON.stringify({ success: false });
    const result = parseGenerateResponse(200, responseBody);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error occurred');
  });
});

describe('parsePreviewResponse', () => {
  it('should handle server error', () => {
    const result = parsePreviewResponse(500, '{}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Server error');
  });

  it('should handle invalid JSON', () => {
    const result = parsePreviewResponse(200, 'invalid');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid response');
  });

  it('should handle successful preview response', () => {
    const structure = {
      title: 'Test Presentation',
      slides: [
        { title: 'Slide 1', bullets: ['Point 1', 'Point 2'] }
      ]
    };
    const responseBody = JSON.stringify({ success: true, structure });
    const result = parsePreviewResponse(200, responseBody);

    expect(result.success).toBe(true);
    expect(result.structure).toEqual(structure);
  });

  it('should handle preview error response', () => {
    const responseBody = JSON.stringify({ success: false, error: 'Content too long' });
    const result = parsePreviewResponse(200, responseBody);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Content too long');
  });

  it('should handle 400 error', () => {
    const responseBody = JSON.stringify({ error: 'Invalid slide count' });
    const result = parsePreviewResponse(400, responseBody);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid slide count');
  });
});

describe('parseNetworkError', () => {
  it('should handle DNS error', () => {
    const result = parseNetworkError('DNS lookup failed');
    expect(result).toBe('Cannot connect to server. Please check your internet connection.');
  });

  it('should handle fetch error', () => {
    const result = parseNetworkError('Unable to fetch URL');
    expect(result).toBe('Cannot connect to server. Please check your internet connection.');
  });

  it('should handle generic error', () => {
    const result = parseNetworkError('Connection timeout');
    expect(result).toBe('Failed to connect to server: Connection timeout');
  });
});

describe('constants', () => {
  it('should have correct minimum slide count', () => {
    expect(MIN_SLIDE_COUNT).toBe(3);
  });

  it('should have correct maximum slide count', () => {
    expect(MAX_SLIDE_COUNT).toBe(10);
  });

  it('should have correct minimum content length', () => {
    expect(MIN_CONTENT_LENGTH).toBe(50);
  });
});
