
const fs   = require('fs');
const ejs  = require('ejs');
const path = require('path');
const { formatFileSize } = require('../../../utils/formatting');

const TEMPLATE = path.resolve(
  __dirname,
  '../../ui/templates/partials/stats-panel.ejs'
);

async function generateStatsPanel(dependencies) {
  const tpl = await fs.promises.readFile(TEMPLATE, 'utf8');
  // Destructure just what the template needs
  const { nodes, links, metadata } = dependencies;
  return ejs.render(tpl, {
    nodes,
    links,
    metadata,
    formatFileSize
  });
}

module.exports = { generateStatsPanel };

