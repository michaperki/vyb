
const fs   = require('fs');
const ejs  = require('ejs');
const path = require('path');
const { DEFAULT_STYLES } = require('../../../utils/constants');

const TEMPLATE = path.resolve(
  __dirname,
  '../../templates/partials/header.ejs'
);

async function generateHeader(repoName) {
  // you can either use ejs.renderFile (async) or read+renderSync
  const template = await fs.promises.readFile(TEMPLATE, 'utf8');
  return ejs.render(template, {
    repoName,
    DEFAULT_STYLES
  });
}

module.exports = { generateHeader };

