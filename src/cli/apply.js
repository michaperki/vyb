
/**
 * src/cli/apply.js
 *
 * Applies accepted changes (from review) back into the codebase.
 *
 * Usage:
 *   vibe-code apply --changes applied-changes.json
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const suggester = require('../core/suggester');

module.exports = (program) => {
  program
    .command('apply')
    .description('Apply changes from a JSON file to the codebase')
    .option('-c, --changes <path>', 'Path to applied-changes JSON', 'vibe-applied-changes.json')
    .action((options) => {
      console.log(chalk.blue('🔧 Running apply command...'));
      try {
        const chPath = path.resolve(options.changes);
        if (!fs.existsSync(chPath)) {
          console.error(chalk.red(`❌ Changes file not found: ${chPath}`));
          return process.exit(1);
        }
        const changesData = JSON.parse(fs.readFileSync(chPath, 'utf8'));
        const cwd = process.cwd();

        const modified = suggester.applyChanges(changesData.changes, cwd);
        console.log(chalk.green(`✅ Applied changes to ${modified.length} files:`));
        modified.forEach(f => console.log(`  - ${f}`));
      } catch (err) {
        console.error(chalk.red('❌ Error in apply:'), err.message);
        process.exit(1);
      }
    });
};
