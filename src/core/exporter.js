/**
 * Exporter module for vibe-code
 * Handles preparing files for LLM processing
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Export selected files for LLM processing
 * @param {Array<number>} fileIds - Array of file IDs to export
 * @param {object} dependencies - The dependency data
 * @param {string} baseDir - Base directory of the repository
 * @param {string} outputFile - Path to the output file (optional)
 * @returns {string} The formatted prompt or path to the output file
 */
function exportFilesForLLM(fileIds, dependencies, baseDir, outputFile = null) {
  console.log(chalk.blue(`Exporting ${fileIds.length} files for LLM processing...`));
  
  // Get the selected files
  const files = fileIds.map(id => dependencies.nodes.find(n => n.id === id))
    .filter(file => file !== undefined);
  
  if (files.length === 0) {
    console.log(chalk.yellow('No valid files selected for export.'));
    return null;
  }
  
  // Prepare context with file contents and relationships
  const context = {
    files: [],
    metadata: {
      totalFiles: files.length,
      repoName: path.basename(baseDir),
      timestamp: new Date().toISOString()
    }
  };
  
  // Process each file
  for (const file of files) {
    try {
      const filePath = path.join(baseDir, file.name);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find imports and exports for this file
      const imports = findImports(file.id, dependencies);
      const exports = findExports(file.id, dependencies);
      
      context.files.push({
        id: file.id,
        path: file.name,
        content: content,
        imports: imports,
        exports: exports,
        metadata: {
          size: file.size,
          lineCount: file.lineCount,
          lastModified: file.lastModifiedFormatted
        }
      });
    } catch (err) {
      console.log(chalk.red(`Error reading file ${file.name}: ${err.message}`));
    }
  }
  
  // Format the prompt for LLM
  const prompt = formatLLMPrompt(context);
  
  // Save to file if requested
  if (outputFile) {
    fs.writeFileSync(outputFile, prompt);
    console.log(chalk.green(`Exported prompt to ${outputFile}`));
    return outputFile;
  }
  
  return prompt;
}

/**
 * Format the context into a prompt for LLM
 * @param {object} context - The context object with files and metadata
 * @returns {string} The formatted prompt
 */
function formatLLMPrompt(context) {
  let prompt = `# Code Refactoring Request\n\n`;
  prompt += `You're analyzing ${context.files.length} files from the ${context.metadata.repoName} repository.\n\n`;
  
  // Add instructions
  prompt += `## Instructions\n\n`;
  prompt += `Please analyze these files and suggest improvements. Return your suggestions in this JSON format:\n\n`;
  prompt += "```json\n";
  prompt += `{\n`;
  prompt += `  "files": [\n`;
  prompt += `    {\n`;
  prompt += `      "path": "path/to/file.js",\n`;
  prompt += `      "changes": [\n`;
  prompt += `        {\n`;
  prompt += `          "type": "replace",  // replace, insert, or delete\n`;
  prompt += `          "lineStart": 42,    // line number where change begins\n`;
  prompt += `          "lineEnd": 42,      // line number where change ends (same as lineStart for single line)\n`;
  prompt += `          "original": "const oldCode = 'before';",  // original code\n`;
  prompt += `          "suggested": "const newCode = 'after';",  // suggested replacement code\n`;
  prompt += `          "reason": "Improved variable naming for clarity"  // brief explanation\n`;
  prompt += `        }\n`;
  prompt += `      ]\n`;
  prompt += `    }\n`;
  prompt += `  ],\n`;
  prompt += `  "summary": "Brief overview of suggestions and their rationale"\n`;
  prompt += `}\n`;
  prompt += "```\n\n";
  
  // Add specific instructions
  prompt += `Please follow these guidelines:\n`;
  prompt += `1. Make meaningful improvements (not just style changes)\n`;
  prompt += `2. Provide a clear reason for each change\n`;
  prompt += `3. Preserve the overall functionality of the code\n`;
  prompt += `4. Consider dependencies between files\n`;
  prompt += `5. Return strictly valid JSON in the format shown above\n\n`;
  
  // Format each file
  prompt += `## Files for Analysis\n\n`;
  
  context.files.forEach(file => {
    prompt += `### ${file.path}\n\n`;
    
    // Add file metadata
    if (file.metadata) {
      const metadata = [];
      if (file.metadata.lineCount) metadata.push(`${file.metadata.lineCount} lines`);
      if (file.metadata.size) metadata.push(`${formatSize(file.metadata.size)} bytes`);
      if (file.metadata.lastModified) metadata.push(`Last modified: ${file.metadata.lastModified}`);
      
      if (metadata.length > 0) {
        prompt += `*${metadata.join(' • ')}*\n\n`;
      }
    }
    
    // Add dependency info
    if (file.imports && file.imports.length > 0) {
      prompt += `**Imports:** ${file.imports.join(', ')}\n\n`;
    }
    
    if (file.exports && file.exports.length > 0) {
      prompt += `**Exports:** ${file.exports.join(', ')}\n\n`;
    }
    
    // Add file content with line numbers
    prompt += "```javascript\n";
    const lines = file.content.split('\n');
    lines.forEach((line, i) => {
      prompt += `${(i + 1).toString().padStart(4, ' ')}| ${line}\n`;
    });
    prompt += "```\n\n";
  });
  
  return prompt;
}

/**
 * Export a simple selection JSON
 * @param {Array<number>} fileIds - Array of file IDs to export
 * @param {object} dependencies - The dependency data
 * @param {string} baseDir - Base directory of the repository
 * @param {string} outputFile - Path to the output file
 * @returns {string} Path to the output file
 */
function exportSelectionJSON(fileIds, dependencies, baseDir, outputFile) {
  const files = fileIds.map(id => dependencies.nodes.find(n => n.id === id))
    .filter(file => file !== undefined);
  
  const selection = {
    files: files.map(file => ({
      id: file.id,
      path: file.name
    })),
    repoName: path.basename(baseDir),
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(selection, null, 2));
  console.log(chalk.green(`Exported selection to ${outputFile}`));
  
  return outputFile;
}

/**
 * Find files imported by the specified file
 * @param {number} fileId - The file ID
 * @param {object} dependencies - The dependency data
 * @returns {Array<string>} Array of imported file paths
 */
function findImports(fileId, dependencies) {
  const imports = [];
  
  dependencies.links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    if (sourceId === fileId) {
      const importedFile = dependencies.nodes.find(n => n.id === targetId);
      if (importedFile) {
        imports.push(importedFile.name);
      }
    }
  });
  
  return imports;
}

/**
 * Find files that import the specified file
 * @param {number} fileId - The file ID
 * @param {object} dependencies - The dependency data
 * @returns {Array<string>} Array of file paths that import this file
 */
function findExports(fileId, dependencies) {
  const exports = [];
  
  dependencies.links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    if (targetId === fileId) {
      const exportingFile = dependencies.nodes.find(n => n.id === sourceId);
      if (exportingFile) {
        exports.push(exportingFile.name);
      }
    }
  });
  
  return exports;
}

/**
 * Format file size
 * @param {number} size - File size in bytes
 * @returns {string} Formatted size
 */
function formatSize(size) {
  if (size < 1024) return `${size}`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

module.exports = {
  exportFilesForLLM,
  exportSelectionJSON
};
