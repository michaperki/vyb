/**
 * Main entry point for the visualization module
 */
const { generateHTMLVisualization } = require('./visualization-generator');
const statsGenerator = require('./stats-generator');
const reviewInterface = require('./review-interface');

module.exports = {
  generateHTMLVisualization,
  generateStats: statsGenerator.generateStats,
  generateReviewInterface: reviewInterface.generateReviewInterface
};
