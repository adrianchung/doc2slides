// Auth utility functions
// The main authentication is handled via OAuth tokens passed from the Apps Script client
// This file can be extended for additional auth needs (e.g., API key validation)

export function validateApiKey(apiKey: string | undefined): boolean {
  // For future use: validate incoming API keys if needed
  return !!apiKey && apiKey.length > 0;
}
