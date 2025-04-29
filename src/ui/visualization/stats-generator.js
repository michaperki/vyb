/**
 * Statistics generation module for vibe-code
 */
const path = require('path');
const chalk = require('chalk');
const { formatFileSize } = require('../../utils/formatting');

/**
 * Generate repository statistics
 * @param {object} dependencies - The dependency data
 * @param {string} baseDir - Base directory of the repository
 */
function generateStats(dependencies, baseDir) {
  // Get the repository name from the base directory
  const repoName = path.basename(baseDir);
  
  console.log(chalk.cyan(`\nRepository Statistics for: ${chalk.bold(repoName)}\n`));
  
  // Files
  console.log(chalk.yellow('File Statistics:'));
  console.log(`Total Files: ${dependencies.nodes.length}`);
  
  if (dependencies.metadata.filesByType) {
    console.log('\nFiles by Type:');
    Object.entries(dependencies.metadata.filesByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
  }
  
  if (dependencies.metadata.filesByDirectory) {
    console.log('\nFiles by Directory:');
    Object.entries(dependencies.metadata.filesByDirectory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dir, count]) => {
        console.log(`  ${dir || '.'}: ${count}`);
      });
  }
  
  if (dependencies.metadata.averageFileSize) {
    console.log(`\nAverage File Size: ${formatFileSize(dependencies.metadata.averageFileSize)}`);
  }
  
  if (dependencies.metadata.averageLineCount) {
    console.log(`Average Line Count: ${Math.round(dependencies.metadata.averageLineCount)}`);
  }
  
  // Imports
  console.log(chalk.yellow('\nDependency Statistics:'));
  console.log(`Total Dependencies: ${dependencies.links.length}`);
  
  if (dependencies.metadata.averageImportsPerFile) {
    console.log(`Average Dependencies per File: ${dependencies.metadata.averageImportsPerFile.toFixed(2)}`);
  }
  
  if (dependencies.metadata.mostImported) {
    console.log('\nMost Imported Files:');
    dependencies.metadata.mostImported.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.file} (${item.count} imports)`);
    });
  }
  
  if (dependencies.metadata.mostImporting) {
    console.log('\nFiles with Most Dependencies:');
    dependencies.metadata.mostImporting.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.file} (${item.count} dependencies)`);
    });
  }
  
  console.log('');
}

module.exports = {
  generateStats
};
