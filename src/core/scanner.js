/**
 * File scanner module for vibe-code
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Scans the repository for files matching the configuration
 * @param {string} baseDir - The base directory to scan
 * @param {object} config - The configuration object
 * @returns {Array<object>} - Array of file objects with metadata
 */
function scanRepository(baseDir, config) {
  console.log(chalk.blue('Scanning repository...'));
  
  const files = scanDirectory(baseDir, '.', config.excludeDirs, config.fileTypes);
  
  // Enhance files with metadata if configured
  if (config.metadata) {
    return files.map(filePath => {
      const stats = fs.statSync(filePath);
      const relativePath = path.relative(baseDir, filePath);
      
      const fileObj = {
        path: filePath,
        relativePath: relativePath.replace(/\\/g, '/'),
      };
      
      // Add optional metadata
      if (config.metadata.showFileSize) {
        fileObj.size = stats.size;
        fileObj.sizeFormatted = formatFileSize(stats.size);
      }
      
      if (config.metadata.showLastModified) {
        fileObj.lastModified = stats.mtime;
        fileObj.lastModifiedFormatted = stats.mtime.toISOString();
      }
      
      if (config.metadata.showLineCount) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          fileObj.lineCount = content.split('\n').length;
        } catch (err) {
          fileObj.lineCount = 0;
        }
      }
      
      return fileObj;
    });
  }
  
  return files.map(filePath => ({
    path: filePath,
    relativePath: path.relative(baseDir, filePath).replace(/\\/g, '/')
  }));
}

/**
 * Recursively scan a directory for files
 * @private
 */
function scanDirectory(baseDir, currentDir, excludeDirs, fileTypes) {
  const files = [];
  const fullPath = path.join(baseDir, currentDir);
  
  try {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const fullEntryPath = path.join(baseDir, entryPath);
      
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          files.push(...scanDirectory(baseDir, entryPath, excludeDirs, fileTypes));
        }
      } else {
        const ext = path.extname(entry.name);
        if (fileTypes.includes(ext)) {
          files.push(fullEntryPath);
        }
      }
    }
  } catch (err) {
    console.log(chalk.yellow(`Error scanning directory ${fullPath}: ${err.message}`));
  }
  
  return files;
}

/**
 * Format file size to human-readable format
 * @private
 */
function formatFileSize(size) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = size;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
}

module.exports = {
  scanRepository
};
