/**
 * Doc2Slides - Google Workspace Add-on
 * Converts Google Docs to executive-ready presentations using AI
 */

// Configuration - Update this to your deployed backend URL
const BACKEND_URL = 'http://localhost:3000';

// Validation constants
const MIN_SLIDE_COUNT = 3;
const MAX_SLIDE_COUNT = 10;
const MIN_CONTENT_LENGTH = 50;

/**
 * Creates the add-on menu when the document is opened
 */
function onOpen() {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Generate Slides', 'showSidebar')
    .addItem('Preview Slides', 'showPreviewSidebar')
    .addToUi();
}

/**
 * Runs when the add-on is installed
 */
function onInstall() {
  onOpen();
}

/**
 * Homepage trigger for the add-on
 */
function onHomepage() {
  return createHomepageCard();
}

/**
 * Creates the homepage card for the add-on
 */
function createHomepageCard() {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Doc2Slides'))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText('Convert this document into an executive-ready presentation.')
        )
        .addWidget(
          CardService.newTextButton()
            .setText('Open Generator')
            .setOnClickAction(
              CardService.newAction().setFunctionName('showSidebar')
            )
        )
    )
    .build();

  return card;
}

/**
 * Shows the sidebar for slide generation configuration
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Doc2Slides')
    .setWidth(300);
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Shows the preview sidebar
 */
function showPreviewSidebar() {
  showSidebar();
}

/**
 * Gets the current document content and metadata
 * @returns {Object} Document data including title, content, and user email
 */
function getDocumentData() {
  const doc = DocumentApp.getActiveDocument();
  if (!doc) {
    throw new Error('No active document found. Please open a Google Doc.');
  }

  const content = doc.getBody().getText();
  const title = doc.getName();
  const userEmail = Session.getActiveUser().getEmail();

  return {
    title: title,
    content: content,
    userEmail: userEmail
  };
}

/**
 * Gets the OAuth token for the current user
 * @returns {string} OAuth access token
 */
function getOAuthToken() {
  return ScriptApp.getOAuthToken();
}

/**
 * Validates the generation configuration
 * @param {Object} config - The configuration object
 * @param {number} config.slideCount - Number of slides
 * @returns {Object} Validation result with isValid and error properties
 */
function validateConfig(config) {
  if (!config) {
    return { isValid: false, error: 'Configuration is required' };
  }

  if (typeof config.slideCount !== 'number') {
    return { isValid: false, error: 'Slide count must be a number' };
  }

  if (config.slideCount < MIN_SLIDE_COUNT || config.slideCount > MAX_SLIDE_COUNT) {
    return {
      isValid: false,
      error: 'Slide count must be between ' + MIN_SLIDE_COUNT + ' and ' + MAX_SLIDE_COUNT
    };
  }

  return { isValid: true };
}

/**
 * Validates the document content
 * @param {string} content - The document content
 * @returns {Object} Validation result with isValid and error properties
 */
function validateContent(content) {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Document content is required' };
  }

  if (content.trim().length < MIN_CONTENT_LENGTH) {
    return {
      isValid: false,
      error: 'Document content is too short. Please add more content (minimum ' + MIN_CONTENT_LENGTH + ' characters).'
    };
  }

  return { isValid: true };
}

/**
 * Calls the backend API to generate slides
 * @param {Object} config - Generation configuration
 * @param {number} config.slideCount - Number of slides to generate
 * @param {string} config.customPrompt - Optional custom instructions
 * @returns {Object} Result with success status and either slidesUrl or error
 */
function generateSlides(config) {
  // Validate config
  const configValidation = validateConfig(config);
  if (!configValidation.isValid) {
    return { success: false, error: configValidation.error };
  }

  // Get document data
  let docData;
  try {
    docData = getDocumentData();
  } catch (e) {
    return { success: false, error: e.message };
  }

  // Validate content
  const contentValidation = validateContent(docData.content);
  if (!contentValidation.isValid) {
    return { success: false, error: contentValidation.error };
  }

  // Get OAuth token
  let accessToken;
  try {
    accessToken = getOAuthToken();
  } catch (e) {
    return { success: false, error: 'Failed to get authentication token: ' + e.message };
  }

  if (!accessToken) {
    return { success: false, error: 'Authentication token is empty. Please re-authorize the add-on.' };
  }

  const payload = {
    documentContent: docData.content,
    documentTitle: docData.title,
    slideCount: config.slideCount,
    customPrompt: config.customPrompt || '',
    userEmail: docData.userEmail,
    accessToken: accessToken
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(BACKEND_URL + '/generate', options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // Handle HTTP errors
    if (responseCode >= 500) {
      return {
        success: false,
        error: 'Server error (' + responseCode + '). Please try again later.'
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return {
        success: false,
        error: 'Invalid response from server. Please try again.'
      };
    }

    if (responseCode >= 400) {
      return {
        success: false,
        error: result.error || 'Request failed with status ' + responseCode
      };
    }

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
  } catch (error) {
    // Handle network errors
    const errorMessage = error.toString();
    if (errorMessage.includes('Unable to fetch') || errorMessage.includes('DNS')) {
      return {
        success: false,
        error: 'Cannot connect to server. Please check your internet connection.'
      };
    }
    return {
      success: false,
      error: 'Failed to connect to server: ' + errorMessage
    };
  }
}

/**
 * Preview slides without creating them (no OAuth required for backend)
 * @param {Object} config - Generation configuration
 * @param {number} config.slideCount - Number of slides to generate
 * @param {string} config.customPrompt - Optional custom instructions
 * @returns {Object} Result with success status and slide structure or error
 */
function previewSlides(config) {
  // Validate config
  const configValidation = validateConfig(config);
  if (!configValidation.isValid) {
    return { success: false, error: configValidation.error };
  }

  // Get document data
  let docData;
  try {
    docData = getDocumentData();
  } catch (e) {
    return { success: false, error: e.message };
  }

  // Validate content
  const contentValidation = validateContent(docData.content);
  if (!contentValidation.isValid) {
    return { success: false, error: contentValidation.error };
  }

  const payload = {
    documentContent: docData.content,
    documentTitle: docData.title,
    slideCount: config.slideCount,
    customPrompt: config.customPrompt || ''
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(BACKEND_URL + '/generate/preview', options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 500) {
      return {
        success: false,
        error: 'Server error (' + responseCode + '). Please try again later.'
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return {
        success: false,
        error: 'Invalid response from server.'
      };
    }

    if (responseCode >= 400) {
      return {
        success: false,
        error: result.error || 'Request failed with status ' + responseCode
      };
    }

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
  } catch (error) {
    return {
      success: false,
      error: 'Failed to connect to server: ' + error.toString()
    };
  }
}

/**
 * Gets the backend URL for display/debugging
 * @returns {string} The configured backend URL
 */
function getBackendUrl() {
  return BACKEND_URL;
}

/**
 * Test connection to the backend server
 * @returns {Object} Result with success status and message
 */
function testConnection() {
  try {
    const response = UrlFetchApp.fetch(BACKEND_URL + '/health', {
      method: 'get',
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return { success: true, message: 'Connected to backend successfully' };
    } else {
      return {
        success: false,
        message: 'Backend returned status ' + responseCode
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Cannot connect to backend: ' + error.toString()
    };
  }
}
