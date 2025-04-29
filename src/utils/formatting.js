
/**
 * Formatting helpers
 */
function formatFileSize(size) {
  const units = ['B','KB','MB','GB'];
  let idx = 0, val = size;
  while (val >= 1024 && idx < units.length-1) {
    val /= 1024; idx++;
  }
  return `${val.toFixed(1)} ${units[idx]}`;
}

module.exports = {
  formatFileSize
};
