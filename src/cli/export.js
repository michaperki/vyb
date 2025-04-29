
/**
 * src/cli/export.js
 *
 * Exports a set of selected files (by ID) for LLM prompt generation.
 * Uses exportSelectionJSON or exportFilesForLLM from core/exporter.
 *
 * Usage:
 *   vibe-code export --selection selection.json --output prompt.md
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('../core/config');
const scanner = require('../core/scanner');
const analyzer = require('../core/analyzer');
const exporter = require('../core/exporter');

module.exports = (program) => {
  program
    .command('export')
    .description('Export selected files for LLM processing')
    .option('-s, --selection <path>', 'Path to JSON file with { files: [id,…] }', 'vibe-selection.json')
    .option('-o, --output <path>', 'Path to write the LLM prompt to', 'vibe-prompt.md')
    .action((options) => {
      (async () => {
        console.log(chalk.blue('📦 Running export command...'));
        try {
          const cfg = config.loadConfig();
          const cwd = process.cwd();

          // Read selection JSON
          const selPath = path.resolve(options.selection);
          if (!fs.existsSync(selPath)) {
            console.error(chalk.red(`❌ Selection file not found: ${selPath}`));
            return process.exit(1);
          }
          const selection = JSON.parse(fs.readFileSync(selPath, 'utf8'));
          const fileIds = selection.files.map(f => f.id);

          // Scan & analyze for fresh context
          console.log(chalk.gray('Scanning repository...'));
          const files = scanner.scanRepository(cwd, cfg);
          console.log(chalk.gray('Extracting dependencies...'));
          const deps = analyzer.extractDependencies(files, cwd, cfg.debugMode);

          // Export for LLM
          const outPath = path.resolve(options.output);
          console.log(chalk.gray(`Exporting ${fileIds.length} files to ${outPath}`));
          exporter.exportFilesForLLM(fileIds, deps, cwd, outPath);

          console.log(chalk.green(`✅ Prompt exported to ${outPath}`));
        } catch (err) {
          console.error(chalk.red('❌ Error in export:'), err.message);
          process.exit(1);
        }
      })();
    });
};
