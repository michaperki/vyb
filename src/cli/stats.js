
/**
 * src/cli/stats.js
 *
 * Generates repository statistics: file counts, file‐type breakdowns,
 * dependencies, average file sizes/line counts, most‐imported and
 * most‐importing files.
 *
 * Usage:
 *   vibe-code stats
 */

const path = require('path');
const chalk = require('chalk');
const config = require('../core/config');
const scanner = require('../core/scanner');
const analyzer = require('../core/analyzer');
const statsGenerator = require('../ui/templates/stats-generator');  // placeholder path

module.exports = (program) => {
  program
    .command('stats')
    .description('Generate and display repository statistics')
    .action(() => {
      console.log(chalk.blue('🚀 Running stats command...'));
      try {
        // 1. Load config & current directory
        const cfg = config.loadConfig();
        const cwd = process.cwd();

        // 2. Scan and analyze
        console.log(chalk.gray('Scanning files...'));
        const files = scanner.scanRepository(cwd, cfg);
        console.log(chalk.green(`✔ Found ${files.length} files`));

        console.log(chalk.gray('Analyzing dependencies...'));
        const deps = analyzer.extractDependencies(files, cwd, cfg.debugMode);

        // 3. Delegate to stats generator (logs formatted output)
        statsGenerator.generateStats(deps, cwd);

      } catch (err) {
        console.error(chalk.red('❌ Error in stats:'), err.message);
        process.exit(1);
      }
    });
};
