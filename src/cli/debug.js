
const chalk = require('chalk');
const config = require('../core/config');

module.exports = (program) => {
  program
    .command('debug')
    .description('Toggle debug mode on or off')
    .action(() => {
      const on = config.toggleDebug();
      console.log(chalk.green(`Debug mode is now ${on ? 'ON' : 'OFF'}`));
    });
};
