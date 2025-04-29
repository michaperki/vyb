
const fs   = require('fs');
const path = require('path');
const ejs  = require('ejs');

const TEMPLATE = path.resolve(
  __dirname,
  '../../../ui/templates/partials/sidebar.ejs'
);

/**
 * Render the sidebar via EJS
 * @param {object} dependencies
 * @returns {string} HTML
 */
function generateSidebar(dependencies) {
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  return ejs.render(tpl, { dependencies }, {
    // set base path so <% include %> works
    filename: TEMPLATE
  });
}

module.exports = { generateSidebar };

