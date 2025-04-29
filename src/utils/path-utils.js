
/**
 * Cross‐platform path helpers
 */
const pathUtils = {
  basename(p) {
    return p.split('/').pop();
  },
  dirname(p) {
    const parts = p.split('/');
    parts.pop();
    return parts.join('/') || '.';
  }
};

module.exports = {
  pathUtils
};
