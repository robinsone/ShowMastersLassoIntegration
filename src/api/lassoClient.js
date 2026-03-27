'use strict';

const axios = require('axios');
const config = require('../config');

const lassoClient = axios.create({
  baseURL: config.baseUrl,
  headers: {
    'LASSO-APIKEY': config.apiKey,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Fetches all pages of a paginated Lasso endpoint.
 * Handles both DRF-style { count, next, results } and plain array responses.
 */
async function getAll(endpoint, params = {}) {
  const results = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await lassoClient.get(endpoint, {
      params: { ...params, limit, offset },
    });

    const data = response.data;
    const page = Array.isArray(data) ? data : (data.results || []);
    results.push(...page);

    // Stop if no more pages
    if (!data.next || page.length < limit) break;
    offset += limit;
  }

  return results;
}

module.exports = { lassoClient, getAll };
