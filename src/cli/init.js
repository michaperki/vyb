
const chalk = require('chalk');
const config = require('../core/config');

module.exports = (program) => {
  program
    .command('init')
    .description('Initialize vibe-code in the current repository')
    .action(() => {
      console.log(chalk.green('Initializing vibe-code...'));
      config.initConfig();
      console.log(chalk.cyan('vibe-code initialized successfully!'));
    });
};
