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

async function scrapeRankingsPage(
  page: puppeteer.Page,
  category: string = 'overall',
  period: string = 'day'
): Promise<ModelRanking[]> {
  const url = `https://openrouter.ai/rankings`;
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url, { 
    waitUntil: 'networkidle0',
    timeout: 60000 
  });
  
  // Wait for the page to load and render
  console.log('Waiting for content to render...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Take a screenshot for debugging
  await page.screenshot({ path: `rankings-${category}-${period}.png` });
  
  // Get the page content for analysis
  const content = await page.content();
  writeFileSync(`page-content-${category}-${period}.html`, content);
  
  console.log('Analyzing page structure...');
  
  // Try to find and extract model data
  const models = await page.evaluate(() => {
    const results: any[] = [];
    
    // Look for any elements that might contain model names
    const possibleSelectors = [
      'a[href*="/models/"]',
      'a[href*="anthropic"]',
      'a[href*="openai"]',
      'a[href*="google"]',
      'a[href*="meta"]',
      '[data-testid*="model"]',
      '[class*="model"]',
      '[class*="ranking"]',
      'tr',
      'tbody tr',
      'div[class*="row"]'
    ];
    
    for (const selector of possibleSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector ${selector} found ${elements.length} elements`);
      
      if (elements.length > 0) {
        elements.forEach((el, index) => {
          const text = el.textContent || '';
          if (text.includes('claude') || text.includes('gpt') || text.includes('gemini') || text.includes('llama')) {
            results.push({
              selector,
              index,
              text: text.substring(0, 200),
              href: (el as HTMLAnchorElement).href || ''
            });
          }
        });
      }
    }
    
    // Also look for any JSON data in script tags
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const content = script.textContent || '';
      if (content.includes('rankings') || content.includes('models')) {
        results.push({
          type: 'script',
          content: content.substring(0, 500)
        });
      }
    });
    
    return results;
  });
  
  console.log(`Found ${models.length} potential model elements`);
  models.forEach(m => console.log(JSON.stringify(m, null, 2)));
  
  return [];
}

async function scrapeWithAdvanced(): Promise<void> {
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(DEFAULT_CONFIG.userAgent);
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    // Try to scrape
    await scrapeRankingsPage(page, 'overall', 'day');
    
    console.log('\nAnalysis complete. Check the generated files:');
    console.log('- rankings-overall-day.png (screenshot)');
    console.log('- page-content-overall-day.html (full HTML)');
    
  } finally {
    await browser.close();
  }
}

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeWithAdvanced().catch(console.error);
}

export { scrapeWithAdvanced };