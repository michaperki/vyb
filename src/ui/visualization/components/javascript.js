const fs   = require('fs');
const ejs  = require('ejs');
const path = require('path');

const TEMPLATE = path.join(
  __dirname,
  '../../templates/partials/visualization-scripts.ejs'
);

async function generateJavaScript(dependencies, repoName) {
  const tpl = await fs.promises.readFile(TEMPLATE, 'utf8');
  return ejs.render(tpl, { dependencies, repoName });
}

module.exports = { generateJavaScript };
