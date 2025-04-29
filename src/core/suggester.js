/**
 * Suggester module for vibe-code
 * Handles LLM integration and response parsing
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const https = require('https');

/**
 * Process files with an LLM and get suggestions
 * @param {string} prompt - The LLM prompt
 * @param {object} options - Options for the LLM request
 * @returns {Promise<object>} The suggestions
 */
async function getSuggestions(prompt, options = {}) {
  console.log(chalk.blue('Sending prompt to LLM...'));
  
  // If a provider is specified, use that
  const provider = options.provider || 'generic';
  
  switch (provider) {
    case 'openai':
      return await requestOpenAI(prompt, options);
    case 'anthropic':
      return await requestAnthropic(prompt, options);
    case 'mock':
      return mockLLMResponse();
    default:
      // Use the configured API endpoint
      return await genericLLMRequest(prompt, options);
  }
}

/**
 * Parse the LLM response into a structured suggestions object
 * @param {string} response - The LLM response text
 * @returns {object} The parsed suggestions
 */
function parseSuggestions(response) {
  console.log(chalk.blue('Parsing LLM response...'));
  
  // Extract JSON from the response
  let jsonContent = extractJSON(response);
  
  if (!jsonContent) {
    console.log(chalk.yellow('No valid JSON found in the response. Trying to extract code blocks...'));
    jsonContent = extractCodeBlocks(response);
  }
  
  if (!jsonContent) {
    console.log(chalk.red('Could not parse LLM response. Using empty suggestions.'));
    return {
      files: [],
      summary: 'Could not parse LLM response'
    };
  }
  
  try {
    const suggestions = JSON.parse(jsonContent);
    
    // Validate the suggestions format
    if (!suggestions.files || !Array.isArray(suggestions.files)) {
      throw new Error('Invalid suggestions format: missing or invalid "files" array');
    }
    
    // Validate each file and change
    suggestions.files.forEach(file => {
      if (!file.path) {
        throw new Error('Invalid file format: missing "path"');
      }
      
      if (!file.changes || !Array.isArray(file.changes)) {
        throw new Error(`Invalid file format for ${file.path}: missing or invalid "changes" array`);
      }
      
      file.changes.forEach(change => {
        if (!change.type || !['replace', 'insert', 'delete'].includes(change.type)) {
          throw new Error(`Invalid change format for ${file.path}: missing or invalid "type"`);
        }
        
        if (change.lineStart === undefined) {
          throw new Error(`Invalid change format for ${file.path}: missing "lineStart"`);
        }
      });
    });
    
    return suggestions;
  } catch (err) {
    console.log(chalk.red(`Error parsing suggestions: ${err.message}`));
    console.log(chalk.yellow('Using default empty suggestions.'));
    
    return {
      files: [],
      summary: `Error parsing LLM response: ${err.message}`
    };
  }
}

/**
 * Save suggestions to a file
 * @param {object} suggestions - The suggestions object
 * @param {string} outputFile - Path to the output file
 * @returns {string} Path to the output file
 */
function saveSuggestions(suggestions, outputFile) {
  fs.writeFileSync(outputFile, JSON.stringify(suggestions, null, 2));
  console.log(chalk.green(`Saved suggestions to ${outputFile}`));
  return outputFile;
}

/**
 * Apply accepted changes to the codebase
 * @param {object} changes - The changes to apply
 * @param {string} baseDir - Base directory of the repository
 * @returns {Array<string>} Array of modified files
 */
function applyChanges(changes, baseDir) {
  console.log(chalk.blue('Applying changes to codebase...'));
  
  const modifiedFiles = new Set();
  
  // Group changes by file
  const changesByFile = {};
  
  changes.forEach(change => {
    if (!changesByFile[change.file]) {
      changesByFile[change.file] = [];
    }
    changesByFile[change.file].push(change.change);
  });
  
  // Process each file's changes
  Object.entries(changesByFile).forEach(([filePath, fileChanges]) => {
    const fullPath = path.join(baseDir, filePath);
    
    try {
      // Read the file content
      let content = fs.readFileSync(fullPath, 'utf8');
      let lines = content.split('\n');
      
      // Sort changes in reverse order to avoid affecting line numbers
      fileChanges.sort((a, b) => b.lineStart - a.lineStart);
      
      // Apply each change
      fileChanges.forEach(change => {
        const lineStart = change.lineStart - 1; // Convert to 0-based index
        const lineEnd = (change.lineEnd || change.lineStart) - 1;
        
        switch (change.type) {
          case 'replace':
            const replacementLines = change.suggested.split('\n');
            lines.splice(lineStart, (lineEnd - lineStart) + 1, ...replacementLines);
            break;
            
          case 'insert':
            const insertLines = change.suggested.split('\n');
            lines.splice(lineStart, 0, ...insertLines);
            break;
            
          case 'delete':
            lines.splice(lineStart, (lineEnd - lineStart) + 1);
            break;
        }
      });
      
      // Write the modified content back to the file
      fs.writeFileSync(fullPath, lines.join('\n'));
      modifiedFiles.add(filePath);
      
      console.log(chalk.green(`Modified file: ${filePath}`));
    } catch (err) {
      console.log(chalk.red(`Error modifying file ${filePath}: ${err.message}`));
    }
  });
  
  return Array.from(modifiedFiles);
}

/**
 * Make a request to OpenAI's API
 * @private
 */
async function requestOpenAI(prompt, options) {
  return new Promise((resolve, reject) => {
    // Ensure we have API key
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      reject(new Error('OpenAI API key not provided'));
      return;
    }
    
    const model = options.model || 'gpt-4';
    
    const requestBody = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant for code review and improvements.' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 4096
    });
    
    const requestOptions = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            reject(new Error(`OpenAI API error: ${response.error.message}`));
            return;
          }
          
          const content = response.choices[0].message.content;
          resolve(parseSuggestions(content));
        } catch (err) {
          reject(new Error(`Error parsing OpenAI response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`OpenAI request error: ${err.message}`));
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * Make a request to Anthropic's API
 * @private
 */
async function requestAnthropic(prompt, options) {
  return new Promise((resolve, reject) => {
    // Ensure we have API key
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      reject(new Error('Anthropic API key not provided'));
      return;
    }
    
    const model = options.model || 'claude-3-opus-20240229';
    
    const requestBody = JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 4096
    });
    
    const requestOptions = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            reject(new Error(`Anthropic API error: ${response.error.message}`));
            return;
          }
          
          const content = response.content[0].text;
          resolve(parseSuggestions(content));
        } catch (err) {
          reject(new Error(`Error parsing Anthropic response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Anthropic request error: ${err.message}`));
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * Make a generic LLM request to a configured endpoint
 * @private
 */
async function genericLLMRequest(prompt, options) {
  return new Promise((resolve, reject) => {
    // Use configured endpoint
    const endpoint = options.endpoint || process.env.LLM_API_ENDPOINT;
    if (!endpoint) {
      reject(new Error('LLM API endpoint not provided'));
      return;
    }
    
    const url = new URL(endpoint);
    
    // Prepare request based on the endpoint configuration
    const requestBody = JSON.stringify({
      prompt: prompt,
      ...options.requestParams
    });
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        ...options.headers
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(parseSuggestions(options.responseField ? response[options.responseField] : response));
        } catch (err) {
          reject(new Error(`Error parsing LLM response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`LLM request error: ${err.message}`));
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * Generate a mock LLM response for testing
 * @private
 */
function mockLLMResponse() {
  console.log(chalk.yellow('Using mock LLM response for testing'));
  
  return {
    files: [
      {
        path: 'lib/scanner.js',
        changes: [
          {
            type: 'replace',
            lineStart: 54,
            lineEnd: 54,
            original: 'let totalSize = 0;',
            suggested: 'let totalSize = 0, totalCount = 0;',
            reason: 'Added counter variable to track total number of files with size information'
          },
          {
            type: 'replace',
            lineStart: 65,
            lineEnd: 67,
            original: 'if (file.size) {\n      totalSize += file.size;\n      filesWithSize++;',
            suggested: 'if (file.size) {\n      totalSize += file.size;\n      filesWithSize++;\n      totalCount++;',
            reason: 'Track count of all processed files for better statistics'
          }
        ]
      },
      {
        path: 'lib/analyzer.js',
        changes: [
          {
            type: 'insert',
            lineStart: 121,
            lineEnd: 121,
            original: '',
            suggested: '  // Calculate additional metrics\n  dependencies.metadata.complexity = calculateComplexity(dependencies);',
            reason: 'Added complexity calculation function call'
          },
          {
            type: 'insert',
            lineStart: 242,
            lineEnd: 242,
            original: '',
            suggested: '/**\n * Calculate complexity metrics for dependencies\n * @private\n */\nfunction calculateComplexity(dependencies) {\n  // Calculate average connections per file\n  const connectionsPerFile = dependencies.links.length / dependencies.nodes.length;\n  \n  // Calculate max connections\n  const nodeCounts = {};\n  dependencies.links.forEach(link => {\n    const sourceId = typeof link.source === \'object\' ? link.source.id : link.source;\n    const targetId = typeof link.target === \'object\' ? link.target.id : link.target;\n    \n    if (!nodeCounts[sourceId]) nodeCounts[sourceId] = 0;\n    if (!nodeCounts[targetId]) nodeCounts[targetId] = 0;\n    \n    nodeCounts[sourceId]++;\n    nodeCounts[targetId]++;\n  });\n  \n  const maxConnections = Object.values(nodeCounts).reduce((max, count) => Math.max(max, count), 0);\n  \n  return {\n    averageConnections: connectionsPerFile,\n    maxConnections: maxConnections\n  };\n}',
            reason: 'Added complexity calculation function to provide deeper insights into codebase structure'
          }
        ]
      }
    ],
    summary: 'Added better variable tracking in the scanner module and implemented a complexity calculation function in the analyzer to provide more detailed metrics about the codebase structure.'
  };
}

/**
 * Extract JSON content from a string
 * @private
 */
function extractJSON(text) {
  // Try to extract content from a JSON code block
  const jsonBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/;
  const jsonBlockMatch = text.match(jsonBlockRegex);
  
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }
  
  // If no JSON block, try to find JSON between curly braces
  const jsonRegex = /{[\s\S]*}/;
  const jsonMatch = text.match(jsonRegex);
  
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return null;
}

/**
 * Extract code blocks from a string
 * @private
 */
function extractCodeBlocks(text) {
  const codeBlocks = [];
  const regex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    codeBlocks.push(match[1].trim());
  }
  
  // Join all code blocks or return null if none found
  return codeBlocks.length > 0 ? codeBlocks.join('\n') : null;
}

module.exports = {
  getSuggestions,
  parseSuggestions,
  saveSuggestions,
  applyChanges
};
