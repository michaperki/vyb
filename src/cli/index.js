
const { program } = require('commander');
const pkg = require('../../package.json');

// Basic CLI setup
program
  .name('vibe-code')
  .version(pkg.version)
  .description('Interactive dependency visualization and LLM-assisted refactoring tool');

// Attach sub‐commands
require('./init')(program);
require('./debug')(program);
// (stats, export, process, review, apply will follow next)

// Default (no sub-command) → generate the visualization
program
  .argument('[output]', 'Output filename', 'vibe-diagram.html')
  .action(async (output) => {
    const chalk = require('chalk');
    const path = require('path');
    const open = require('open');
    const config = require('../core/config');
    const scanner = require('../core/scanner');
    const analyzer = require('../core/analyzer');
    const visualization = require('../ui/visualization');

    console.log(chalk.green('Analyzing repository...'));
    const cfg = config.loadConfig();
    const cwd = process.cwd();

    const files = scanner.scanRepository(cwd, cfg);
    console.log(chalk.green(`Found ${files.length} files to analyze`));

    const deps = analyzer.extractDependencies(files, cwd, cfg.debugMode);
    console.log(chalk.green('Extracted dependencies between files'));

    const outPath = path.resolve(output);
    visualization.generateHTMLVisualization(deps, outPath, cwd);
    console.log(chalk.cyan(`Generated interactive visualization: ${outPath}`));

    await open(outPath);
  });

program.parse(process.argv);
