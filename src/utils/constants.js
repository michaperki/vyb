/**
 * Constants and configuration for visualization
 */

/**
 * Default styles for visualization CSS
 */
const DEFAULT_STYLES = `
:root {
  --bg-color: #f8f9fa;
  --text-color: #333;
  --primary-color: #4c6ef5;
  --secondary-color: #7950f2;
  --link-color: #868e96;
  --panel-bg: #fff;
  --border-color: #dee2e6;
  --selection-color: #fa5252;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #212529;
    --text-color: #f8f9fa;
    --primary-color: #748ffc;
    --secondary-color: #9775fa;
    --link-color: #adb5bd;
    --panel-bg: #343a40;
    --border-color: #495057;
    --selection-color: #ff6b6b;
  }
}
`;

/**
 * File extension colors for visualization
 */
const EXTENSION_COLORS = {
  '.js': '#f1e05a',   // JavaScript (yellow)
  '.jsx': '#f1e05a',  // JSX (yellow)
  '.ts': '#3178c6',   // TypeScript (blue)
  '.tsx': '#3178c6',  // TSX (blue)
  '.vue': '#41b883',  // Vue (green)
  '.css': '#563d7c',  // CSS (purple)
  '.scss': '#c6538c', // SCSS (pink)
  '.html': '#e34c26', // HTML (orange)
  '.json': '#292929', // JSON (dark)
  '.md': '#083fa1'    // Markdown (navy)
};

/**
 * Default visualization options
 */
const DEFAULT_OPTIONS = {
  showLabels: true,
  groupByFolder: true,
  sizeByLines: false,
  defaultLayout: 'force'
};

module.exports = {
  DEFAULT_STYLES,
  EXTENSION_COLORS,
  DEFAULT_OPTIONS
};
