// src/ui/visualization/visualization-generator.js
const fs   = require('fs');
const ejs  = require('ejs');
const path = require('path');

const TEMPLATE = path.resolve(
  __dirname,
  '../templates/partials/visualization-scripts.ejs'
);

async function generateHTMLVisualization(dependencies, outputFile, baseDir) {
  const repoName = path.basename(baseDir);
  const tpl      = await fs.promises.readFile(TEMPLATE, 'utf8');

  // Render the page
  const html = ejs.render(tpl, {
    repoName,
    dependencies,
    DEFAULT_STYLES: require('../../utils/constants').DEFAULT_STYLES
  });

  fs.writeFileSync(outputFile, html);
}

module.exports = { generateHTMLVisualization };
