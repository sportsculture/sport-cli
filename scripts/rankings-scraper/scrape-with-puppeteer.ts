#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePuppeteerPage(
  page: puppeteer.Page,
  category: string,
  period: string
): Promise<ModelRanking[]> {
  const url = `https://openrouter.ai/rankings?category=${category}&period=${period}`;
  console.log(`Scraping: ${url}`);
  
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Wait for content to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try to extract rankings data
  const models = await page.evaluate(() => {
    const results: any[] = [];
    
    // Try multiple selectors
    const selectors = [
      '.ranking-table tbody tr',
      'table tbody tr',
      '[data-testid="ranking-row"]',
      '.model-ranking-row',
      '.rankings-list .ranking-item'
    ];
    
    let rows: Element[] = [];
    for (const selector of selectors) {
      const found = Array.from(document.querySelectorAll(selector));
      if (found.length > 0) {
        rows = found;
        console.log(`Found ${found.length} rows with selector: ${selector}`);
        break;
      }
    }
    
    if (rows.length === 0) {
      // Try to find any table on the page
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        rows = Array.from(tables[0].querySelectorAll('tbody tr'));
      }
    }
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          // Extract rank
          const rankText = cells[0]?.textContent?.trim() || String(index + 1);
          const rank = parseInt(rankText.replace(/[^0-9]/g, ''));
          
          // Extract model name and ID
          const modelCell = cells[1];
          const modelLink = modelCell?.querySelector('a');
          const modelName = modelLink?.textContent?.trim() || 
                          modelCell?.textContent?.trim() || '';
          
          const href = modelLink?.getAttribute('href') || '';
          const modelId = href.split('/').pop() || modelName.toLowerCase().replace(/\s+/g, '-');
          
          // Extract share percentage if available
          let share = 0;
          for (let i = 2; i < cells.length; i++) {
            const text = cells[i]?.textContent || '';
            if (text.includes('%')) {
              share = parseFloat(text.replace('%', '')) / 100;
              break;
            }
          }
          
          if (modelName) {
            results.push({
              rank: rank || index + 1,
              model_id: modelId,
              name: modelName,
              share: share,
              url: `https://openrouter.ai/models/${modelId}`
            });
          }
        }
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error);
      }
    });
    
    return results;
  });
  
  console.log(`Scraped ${models.length} models for ${category}/${period}`);
  return models;
}

async function scrapeWithPuppeteer(config: ScraperConfig = DEFAULT_CONFIG): Promise<RankingsData> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent(config.userAgent);
    
    // Enable console logging from page
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('PAGE LOG:', msg.text());
      }
    });
    
    const categories = ['overall', 'programming', 'translation', 'reasoning'];
    const periods = ['day', 'week', 'month'];
    const snapshots: RankingSnapshot[] = [];
    
    console.log('Starting Puppeteer-based scraping...');
    console.log(`User-Agent: ${config.userAgent}`);
    
    for (const category of categories) {
      for (const period of periods) {
        try {
          await delay(config.delayMs);
          const models = await scrapePuppeteerPage(page, category, period);
          
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
    
  } finally {
    await browser.close();
  }
}

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      const data = await scrapeWithPuppeteer();
      
      // Save to local file
      const outputPath = resolve(__dirname, 'rankings-puppeteer.json');
      writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`\nData saved to: ${outputPath}`);
      
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

export { scrapeWithPuppeteer };