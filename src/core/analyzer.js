/**
 * Dependency analyzer module for vibe-code
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Extract dependencies between files
 * @param {Array<object>} files - Array of file objects from scanner
 * @param {string} baseDir - Base directory path
 * @param {boolean} debugMode - Whether to output debug information
 * @returns {object} - Dependency graph data
 */
function extractDependencies(files, baseDir, debugMode = false) {
  const dependencies = {
    nodes: [],
    links: [],
    metadata: {
      totalFiles: files.length,
      filesByType: {},
      filesByDirectory: {},
      averageFileSize: 0,
      averageLineCount: 0,
    }
  };
  
  // Calculate metadata
  calculateMetadata(files, dependencies.metadata);
  
  const fileMap = {};
  
  // First pass: create nodes for all files
  files.forEach((file, index) => {
    const normalizedPath = file.relativePath;
    
    // Store both the absolute path (for resolving) and the index
    fileMap[normalizedPath] = index;
    fileMap[file.path.replace(/\\/g, '/')] = index;
    
    // Extract language from file extension
    const ext = path.extname(normalizedPath);
    const language = ext.replace('.', '');
    
    // Create node with all available metadata
    const node = {
      id: index,
      name: normalizedPath,
      path: file.path,
      basename: path.basename(normalizedPath),
      directory: path.dirname(normalizedPath),
      group: path.dirname(normalizedPath).split('/').length, // Group by directory depth
      extension: ext,
      language: language
    };
    
    // Add optional metadata if available
    if (file.size) node.size = file.size;
    if (file.sizeFormatted) node.sizeFormatted = file.sizeFormatted;
    if (file.lastModified) node.lastModified = file.lastModified;
    if (file.lastModifiedFormatted) node.lastModifiedFormatted = file.lastModifiedFormatted;
    if (file.lineCount) node.lineCount = file.lineCount;
    
    dependencies.nodes.push(node);
  });
  
  if (debugMode) {
    console.log('File map keys:');
    Object.keys(fileMap).forEach(key => {
      console.log(` - ${key}`);
    });
  }
  
  // Second pass: extract imports/dependencies
  files.forEach((file, sourceIndex) => {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const imports = extractImports(content, file.path);
      
      if (debugMode) {
        console.log(chalk.blue(`File: ${file.relativePath}`));
        console.log(chalk.blue(`Imports: ${Array.from(imports).join(', ')}`));
      }
      
      // Process the imports to find local file dependencies
      imports.forEach(importPath => {
        // Skip package imports (not starting with . or /)
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          return;
        }
        
        // Resolve the import path relative to the current file
        let resolvedPath;
        try {
          if (importPath.startsWith('.')) {
            resolvedPath = path.resolve(path.dirname(file.path), importPath);
          } else if (importPath.startsWith('/')) {
            resolvedPath = path.resolve(baseDir, importPath.slice(1));
          }
          
          // Add common extensions if none specified
          if (path.extname(resolvedPath) === '') {
            let found = false;
            for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.vue']) {
              const testPath = resolvedPath + ext;
              if (fs.existsSync(testPath)) {
                resolvedPath = testPath;
                found = true;
                break;
              }
            }
            
            // If no file with extensions found, try index files
            if (!found) {
              for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.vue']) {
                const indexPath = path.join(resolvedPath, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                  resolvedPath = indexPath;
                  break;
                }
              }
            }
          }
          
          // Normalize the path for lookup
          const normalizedPath = resolvedPath.replace(/\\/g, '/');
          const relativePath = path.relative(baseDir, resolvedPath).replace(/\\/g, '/');
          
          if (debugMode) {
            console.log(chalk.blue(`  Resolved ${importPath} to ${relativePath}`));
          }
          
          // Try different path formats to find a match
          let targetIndex = fileMap[normalizedPath];
          
          if (targetIndex === undefined) {
            // Try with the relative path
            targetIndex = fileMap[relativePath];
          }
          
          // If the target file is in our file map, add a link
          if (targetIndex !== undefined) {
            dependencies.links.push({
              source: sourceIndex,
              target: targetIndex,
              type: 'import',
              value: 1
            });
            
            if (debugMode) {
              console.log(chalk.green(`  Added link: ${file.relativePath} -> ${relativePath}`));
            }
          } else if (debugMode) {
            console.log(chalk.yellow(`  Could not find ${relativePath} in file map`));
            console.log(chalk.yellow(`  Tried paths: ${normalizedPath}, ${relativePath}`));
          }
        } catch (err) {
          // Skip failed resolutions
          if (debugMode) {
            console.log(chalk.red(`  Error resolving ${importPath}: ${err.message}`));
          }
        }
      });
    } catch (err) {
      console.log(chalk.yellow(`Error analyzing file ${file.path}: ${err.message}`));
    }
  });
  
  // Calculate dependency stats
  dependencies.metadata.totalImports = dependencies.links.length;
  dependencies.metadata.averageImportsPerFile = dependencies.links.length / files.length;
  
  // Find most imported files and most importing files
  const importCounts = {};
  const exportCounts = {};
  
  dependencies.links.forEach(link => {
    // Count exports (files being imported)
    if (!exportCounts[link.target]) exportCounts[link.target] = 0;
    exportCounts[link.target]++;
    
    // Count imports (files importing others)
    if (!importCounts[link.source]) importCounts[link.source] = 0;
    importCounts[link.source]++;
  });
  
  dependencies.metadata.mostImported = findTopNodeIds(exportCounts, dependencies.nodes, 5);
  dependencies.metadata.mostImporting = findTopNodeIds(importCounts, dependencies.nodes, 5);
  
  return dependencies;
}

/**
 * Extract import paths from file content
 * @private
 */
function extractImports(content, filePath) {
  const imports = new Set();
  const ext = path.extname(filePath);
  
  // JavaScript/TypeScript style imports (ES6 and CommonJS)
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    // Find ES6 imports
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    
    // Find CommonJS requires
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
  }
  
  // Vue imports (script section)
  if (ext === '.vue') {
    const scriptMatch = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let scriptContent;
    
    while ((scriptMatch = scriptMatch.exec(content)) !== null) {
      scriptContent = scriptMatch[1];
      
      // Find ES6 imports in script section
      const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(scriptContent)) !== null) {
        imports.add(match[1]);
      }
      
      // Find CommonJS requires in script section
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(scriptContent)) !== null) {
        imports.add(match[1]);
      }
    }
  }
  
  return imports;
}

/**
 * Calculate metadata for files
 * @private
 */
function calculateMetadata(files, metadata) {
  const filesByType = {};
  const filesByDirectory = {};
  let totalSize = 0;
  let totalLines = 0;
  let filesWithSize = 0;
  let filesWithLines = 0;
  
  files.forEach(file => {
    // Count by file type
    const ext = path.extname(file.relativePath);
    if (!filesByType[ext]) filesByType[ext] = 0;
    filesByType[ext]++;
    
    // Count by directory
    const dir = path.dirname(file.relativePath);
    if (!filesByDirectory[dir]) filesByDirectory[dir] = 0;
    filesByDirectory[dir]++;
    
    // Sum up file sizes
    if (file.size) {
      totalSize += file.size;
      filesWithSize++;
    }
    
    // Sum up line counts
    if (file.lineCount) {
      totalLines += file.lineCount;
      filesWithLines++;
    }
  });
  
  metadata.filesByType = filesByType;
  metadata.filesByDirectory = filesByDirectory;
  metadata.averageFileSize = filesWithSize > 0 ? totalSize / filesWithSize : 0;
  metadata.averageLineCount = filesWithLines > 0 ? totalLines / filesWithLines : 0;
}

/**
 * Find top node IDs by count
 * @private
 */
function findTopNodeIds(countMap, nodes, limit) {
  const sorted = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return sorted.map(([nodeId, count]) => ({
    file: nodes[nodeId].name,
    count: count
  }));
}

module.exports = {
  extractDependencies
};
