/**
 * Doc2Slides - Google Workspace Add-on
 * Converts Google Docs to executive-ready presentations using AI
 */

// Configuration - Update this to your deployed backend URL
const BACKEND_URL = 'https://your-backend-url.com';

/**
 * Creates the add-on menu when the document is opened
 */
function onOpen() {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Generate Slides', 'showSidebar')
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
 * Gets the current document content and metadata
 */
function getDocumentData() {
  const doc = DocumentApp.getActiveDocument();
  return {
    title: doc.getName(),
    content: doc.getBody().getText(),
    userEmail: Session.getActiveUser().getEmail()
  };
}

/**
 * Gets the OAuth token for the current user
 */
function getOAuthToken() {
  return ScriptApp.getOAuthToken();
}

/**
 * Calls the backend API to generate slides
 * @param {Object} config - Generation configuration
 * @param {number} config.slideCount - Number of slides to generate
 * @param {string} config.customPrompt - Optional custom instructions
 */
function generateSlides(config) {
  const docData = getDocumentData();
  const accessToken = getOAuthToken();

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
    const result = JSON.parse(response.getContentText());

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
    return {
      success: false,
      error: 'Failed to connect to server: ' + error.toString()
    };
  }
}
