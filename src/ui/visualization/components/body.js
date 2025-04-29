const fs   = require('fs');
const ejs  = require('ejs');
const path = require('path');

const TEMPLATE = path.resolve(
  __dirname,
  '../../templates/partials/body.ejs'
);

async function generateBody(dependencies, repoName) {
  const tpl = await fs.promises.readFile(TEMPLATE, 'utf8');
  return ejs.render(tpl, { dependencies, repoName, generateJavaScript: require('./javascript').generateJavaScript });
}

module.exports = { generateBody };
