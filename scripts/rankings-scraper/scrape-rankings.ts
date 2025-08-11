#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
  RankingsData, 
  RankingSnapshot, 
  ModelRanking,
  DEFAULT_CONFIG,
  ScraperConfig 
} from './types.js';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string, 
  config: ScraperConfig,
  attempt = 1
): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (attempt >= config.maxRetries) {
      throw error;
    }

    console.warn(`Attempt ${attempt} failed, retrying in ${config.delayMs * attempt}ms...`);
    await delay(config.delayMs * attempt);
    return fetchWithRetry(url, config, attempt + 1);
  }
}

function parseRankingsTable($: cheerio.CheerioAPI, tableSelector: string): ModelRanking[] {
  const models: ModelRanking[] = [];
  
  // Try multiple possible selectors for the rankings table
  const selectors = [
    `${tableSelector} table tbody tr`,
    `${tableSelector} .ranking-table tr`,
    `${tableSelector} [role="table"] [role="row"]`,
    `${tableSelector} .models-list .model-row`
  ];

  let rows: cheerio.Cheerio<cheerio.Element> | null = null;
  
  for (const selector of selectors) {
    const found = $(selector);
    if (found.length > 0) {
      rows = found;
      console.log(`Found ${found.length} rows using selector: ${selector}`);
      break;
    }
  }

  if (!rows || rows.length === 0) {
    console.warn(`No ranking rows found for selector: ${tableSelector}`);
    return models;
  }

  rows.each((index, element) => {
    try {
      const row = $(element);
      
      // Skip header rows
      if (row.find('th').length > 0) return;
      
      // Extract data with multiple fallback selectors
      const rank = parseInt(
        row.find('.rank, [data-rank], td:first-child').text().replace('#', '').trim()
      ) || index + 1;
      
      const modelLink = row.find('a[href*="/models/"], a[href*="/api/"], .model-link');
      const modelId = modelLink.attr('href')?.split('/').pop() || 
                      row.find('[data-model-id]').attr('data-model-id') ||
                      '';
      
      const name = modelLink.text().trim() || 
                   row.find('.model-name, .name').text().trim() ||
                   '';
      
      const shareText = row.find('.share, .market-share, [data-share]').text().trim();
      const share = parseFloat(shareText.replace('%', '')) / 100 || 0;
      
      const tokensText = row.find('.tokens, .usage, [data-tokens]').text().trim();
      const tokens = parseInt(tokensText.replace(/[^0-9]/g, '')) || undefined;
      
      if (modelId && name) {
        models.push({
          rank,
          model_id: modelId,
          name,
          share,
          tokens,
          url: `https://openrouter.ai/models/${modelId}`
        });
      }
    } catch (error) {
      console.warn(`Error parsing row ${index}:`, error);
    }
  });

  return models;
}

async function scrapeRankingsPage(
  category: string,
  period: string,
  config: ScraperConfig
): Promise<ModelRanking[]> {
  const url = `${config.baseUrl}/rankings?category=${category}&period=${period}`;
  console.log(`Scraping: ${url}`);
  
  await delay(config.delayMs);
  const html = await fetchWithRetry(url, config);
  const $ = cheerio.load(html);
  
  // Look for the main rankings container
  const containerSelectors = [
    '#rankings-container',
    '.rankings-content',
    'main [data-rankings]',
    '.models-ranking'
  ];
  
  for (const selector of containerSelectors) {
    const models = parseRankingsTable($, selector);
    if (models.length > 0) {
      console.log(`Successfully scraped ${models.length} models for ${category}/${period}`);
      return models;
    }
  }
  
  // If no container found, try parsing the whole page
  const models = parseRankingsTable($, 'body');
  console.log(`Scraped ${models.length} models from full page for ${category}/${period}`);
  return models;
}

async function scrapeAllRankings(config: ScraperConfig = DEFAULT_CONFIG): Promise<RankingsData> {
  const categories = ['overall', 'programming', 'translation', 'reasoning'];
  const periods = ['day', 'week', 'month'];
  const snapshots: RankingSnapshot[] = [];
  
  console.log('Starting OpenRouter rankings scrape...');
  console.log(`User-Agent: ${config.userAgent}`);
  
  for (const category of categories) {
    for (const period of periods) {
      try {
        const models = await scrapeRankingsPage(category, period, config);
        
        if (models.length > 0) {
          snapshots.push({
            category: category as any,
            period: period as any,
            models
          });
        }
      } catch (error) {
        console.error(`Failed to scrape ${category}/${period}:`, error);
      }
    }
  }
  
  const data: RankingsData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: 'https://openrouter.ai/rankings',
    snapshots
  };
  
  console.log(`\nScraping complete!`);
  console.log(`Total snapshots: ${snapshots.length}`);
  console.log(`Total models: ${snapshots.reduce((sum, s) => sum + s.models.length, 0)}`);
  
  return data;
}

// Main execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  (async () => {
    try {
      const data = await scrapeAllRankings();
      
      // Save to local file for testing
      const outputPath = resolve(__dirname, 'rankings.json');
      writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`\nData saved to: ${outputPath}`);
      
      // Output to stdout for GitHub Actions
      console.log('\n::set-output name=rankings::' + JSON.stringify(data));
      
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

export { scrapeAllRankings, scrapeRankingsPage };