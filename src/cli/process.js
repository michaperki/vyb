
/**
 * src/cli/process.js
 *
 * Sends a prompt file to an LLM provider, receives suggestions,
 * parses and saves them to a JSON file.
 *
 * Usage:
 *   vibe-code process --prompt prompt.md --output suggestions.json --model gpt-4 --api openai
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const suggester = require('../core/suggester');

module.exports = (program) => {
  program
    .command('process')
    .description('Process files with LLM and generate suggestions JSON')
    .option('-p, --prompt <path>', 'Path to LLM prompt file', 'vibe-prompt.md')
    .option('-o, --output <path>', 'Path to write suggestions JSON', 'vibe-suggestions.json')
    .option('-m, --model <name>', 'Model name to use', 'gpt-4')
    .option('-a, --api <provider>', 'LLM provider (openai|anthropic|generic|mock)', 'generic')
    .action(async (options) => {
      console.log(chalk.blue('🤖 Running process command...'));
      try {
        const promptPath = path.resolve(options.prompt);
        if (!fs.existsSync(promptPath)) {
          console.error(chalk.red(`❌ Prompt file not found: ${promptPath}`));
          return process.exit(1);
        }
        const prompt = fs.readFileSync(promptPath, 'utf8');

        // Call the LLM
        console.log(chalk.gray(`Sending to ${options.api}@${options.model}...`));
        const suggestions = await suggester.getSuggestions(prompt, {
          provider: options.api,
          model: options.model
        });

        // Save output
        const outPath = path.resolve(options.output);
        suggester.saveSuggestions(suggestions, outPath);
        console.log(chalk.green(`✅ Suggestions saved to ${outPath}`));
      } catch (err) {
        console.error(chalk.red('❌ Error in process:'), err.message);
        process.exit(1);
      }
    });
};
