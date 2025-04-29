// File: src/ui/visualization/review-interface.js

const fs    = require('fs').promises;
const path  = require('path');
const ejs   = require('ejs');
const { DEFAULT_STYLES } = require('../../utils/constants');
const { pathUtils }      = require('../../utils/path-utils');

const TEMPLATE = path.resolve(__dirname, '../templates/review.ejs');
const RENDER_OPTS = {
  async: true,
  views: [ path.resolve(__dirname, '../templates/') ]
};

async function generateReviewInterface(suggestions, outputFile) {
  // Render the EJS template into a full HTML page
  const html = await ejs.renderFile(TEMPLATE, {
    suggestions,
    DEFAULT_STYLES,
    pathUtils
  }, RENDER_OPTS);

  // Write it out
  await fs.writeFile(outputFile, html, 'utf8');
}

module.exports = {
  generateReviewInterface
};
