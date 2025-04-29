
/**
 * src/cli/review.js
 *
 * Generates an HTML interface for reviewing LLM suggestions, then opens it.
 *
 * Usage:
 *   vibe-code review --suggestions suggestions.json --output review.html
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const open = require('open');
const visualization = require('../ui/visualization');  // placeholder path

module.exports = (program) => {
  program
    .command('review')
    .description('Generate and open HTML review interface for suggestions')
    .option('-s, --suggestions <path>', 'Path to suggestions JSON', 'vibe-suggestions.json')
    .option('-o, --output <path>', 'Path to write review HTML', 'vibe-review.html')
    .action(async (options) => {
      console.log(chalk.blue('🧐 Running review command...'));
      try {
        const sugPath = path.resolve(options.suggestions);
        if (!fs.existsSync(sugPath)) {
          console.error(chalk.red(`❌ Suggestions file not found: ${sugPath}`));
          return process.exit(1);
        }
        const suggestions = JSON.parse(fs.readFileSync(sugPath, 'utf8'));

        const outPath = path.resolve(options.output);
        visualization.generateReviewInterface(suggestions, outPath);
        console.log(chalk.green(`✅ Review interface generated: ${outPath}`));

        await open(outPath);
      } catch (err) {
        console.error(chalk.red('❌ Error in review:'), err.message);
        process.exit(1);
      }
    });
};
