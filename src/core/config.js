
/**
 * Configuration module for vibe-code
 * (migrated from lib/config.js)
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG_DIR = '.vibe-code';
const CONFIG_FILE = 'config.json';

const DEFAULT_CONFIG = {
  excludeDirs: ['node_modules', '.git', '.vibe-code', 'dist', 'build'],
  fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
  debugMode: false,
  metadata: {
    showLineCount: true,
    showFileSize: true,
    showLastModified: true
  }
};

function initConfig() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
  fs.writeFileSync(
    path.join(CONFIG_DIR, CONFIG_FILE),
    JSON.stringify(DEFAULT_CONFIG, null, 2)
  );
  console.log(chalk.green(`Created ${CONFIG_DIR}/${CONFIG_FILE}`));
}

function loadConfig() {
  const configPath = path.join(CONFIG_DIR, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    console.log(chalk.yellow('No config file found, using default settings'));
    return { ...DEFAULT_CONFIG };
  }
  try {
    const loaded = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...loaded };
  } catch (err) {
    console.log(chalk.red(`Failed to parse config: ${err.message}`));
    return { ...DEFAULT_CONFIG };
  }
}

function toggleDebug() {
  const configPath = path.join(CONFIG_DIR, CONFIG_FILE);
  const cfg = loadConfig();
  cfg.debugMode = !cfg.debugMode;
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
  return cfg.debugMode;
}

module.exports = {
  initConfig,
  loadConfig,
  toggleDebug
};
