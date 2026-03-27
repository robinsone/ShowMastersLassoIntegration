'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'mapping.config.json');
const mappingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

if (!process.env.LASSO_API_KEY) {
  throw new Error('LASSO_API_KEY is required. Copy .env.example to .env and fill in your values.');
}
if (!process.env.DIVISION_ID) {
  throw new Error('DIVISION_ID is required. Copy .env.example to .env and fill in your values.');
}

module.exports = {
  apiKey: process.env.LASSO_API_KEY,
  baseUrl: (process.env.LASSO_BASE_URL || 'https://test1.lasso.io').replace(/\/$/, ''),
  divisionId: parseInt(process.env.DIVISION_ID, 10),
  mapping: mappingConfig,
};
