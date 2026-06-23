const crypto = require('crypto');
const logger = require('../config/logger');

class HashService {
  static generateHash(data, algorithm = 'sha256') {
    try {
      let contentString = data;

      // Convert objects to JSON string for consistent hashing
      if (typeof data === 'object') {
        contentString = JSON.stringify(data);
      }

      const hash = crypto
        .createHash(algorithm)
        .update(contentString)
        .digest('hex');

      return hash;
    } catch (error) {
      logger.error({ error }, 'Error generating hash');
      throw error;
    }
  }

  static calculateSimilarity(str1, str2) {
    // Levenshtein distance calculation for similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  static getEditDistance(s1, s2) {
    const costs = [];

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }

    return costs[s2.length];
  }

  static isContentSimilar(content1, content2, threshold = 0.85) {
    const str1 = typeof content1 === 'string' ? content1 : JSON.stringify(content1);
    const str2 = typeof content2 === 'string' ? content2 : JSON.stringify(content2);

    const similarity = this.calculateSimilarity(str1, str2);
    return similarity >= threshold;
  }
}

module.exports = HashService;
