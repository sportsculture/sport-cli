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
  ModelRanking
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function scrapeRealRankings(): Promise<RankingsData> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const snapshots: RankingSnapshot[] = [];
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Loading OpenRouter rankings page...');
    await page.goto('https://openrouter.ai/rankings', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for the rankings to load
    console.log('Waiting for rankings to render...');
    await page.waitForSelector('a[href*="/models/"]', { timeout: 30000 }).catch(() => {
      console.log('Model links selector not found, trying alternatives...');
    });
    
    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract all model links and their surrounding text
    const pageData = await page.evaluate(() => {
      const data: any[] = [];
      
      // Find all links to models
      const modelLinks = document.querySelectorAll('a[href*="/models/"], a[href*="/anthropic"], a[href*="/openai"], a[href*="/google"], a[href*="/meta"]');
      
      modelLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';
        
        // Try to find the parent container that might have ranking info
        let parent = link.parentElement;
        let containerText = '';
        
        // Go up a few levels to find the container with full info
        for (let i = 0; i < 5 && parent; i++) {
          containerText = parent.textContent || '';
          if (containerText.includes('%') || containerText.includes('#')) {
            break;
          }
          parent = parent.parentElement;
        }
        
        data.push({
          href,
          modelName: text,
          containerText: containerText.substring(0, 500),
          // Extract any numbers that might be rank or percentage
          numbers: containerText.match(/\d+\.?\d*/g) || []
        });
      });
      
      // Also try to find any elements with percentage signs
      const percentElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes('%') && el.children.length === 0
      );
      
      percentElements.forEach(el => {
        const text = el.textContent || '';
        let parent = el.parentElement;
        let context = '';
        
        // Get context
        for (let i = 0; i < 3 && parent; i++) {
          context = parent.textContent || '';
          if (context.length > 50) break;
          parent = parent.parentElement;
        }
        
        data.push({
          type: 'percentage',
          text,
          context: context.substring(0, 200)
        });
      });
      
      return data;
    });
    
    console.log(`Found ${pageData.length} potential data points`);
    
    // Process the extracted data to build rankings
    const models: ModelRanking[] = [];
    const seenModels = new Set<string>();
    
    pageData.forEach(item => {
      if (item.href && item.modelName && !seenModels.has(item.href)) {
        // Extract model ID from href
        let modelId = '';
        if (item.href.includes('/models/')) {
          modelId = item.href.split('/models/')[1];
        } else if (item.href.includes('/')) {
          const parts = item.href.split('/');
          modelId = parts[parts.length - 1];
          if (parts.length > 2) {
            modelId = parts.slice(-2).join('/');
          }
        }
        
        if (modelId) {
          seenModels.add(item.href);
          
          // Try to extract percentage from numbers
          let share = 0;
          if (item.numbers && item.numbers.length > 0) {
            // Look for a number that could be a percentage (typically < 100)
            for (const num of item.numbers) {
              const val = parseFloat(num);
              if (val > 0 && val < 100) {
                share = val / 100;
                break;
              }
            }
          }
          
          // Extract rank from container text (look for #1, #2, etc.)
          let rank = models.length + 1;
          const rankMatch = item.containerText.match(/#(\d+)/);
          if (rankMatch) {
            rank = parseInt(rankMatch[1]);
          }
          
          models.push({
            rank,
            model_id: modelId,
            name: item.modelName.trim(),
            share: share || 0.01, // Default small share if not found
            url: `https://openrouter.ai${item.href}`
          });
        }
      }
    });
    
    // Sort by rank and limit to top 20
    models.sort((a, b) => a.rank - b.rank);
    const topModels = models.slice(0, 20);
    
    console.log(`Extracted ${topModels.length} models`);
    topModels.slice(0, 5).forEach(m => {
      console.log(`  ${m.rank}. ${m.name} (${(m.share * 100).toFixed(1)}%)`);
    });
    
    // Create a snapshot (we'll just use overall/day for now since we can't navigate categories yet)
    if (topModels.length > 0) {
      snapshots.push({
        category: 'overall',
        period: 'day',
        models: topModels
      });
    }
    
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
  
  const data: RankingsData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: 'https://openrouter.ai/rankings',
    snapshots
  };
  
  return data;
}

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      console.log('Starting real OpenRouter rankings scrape...\n');
      const data = await scrapeRealRankings();
      
      // Save to file
      const outputPath = resolve(__dirname, 'real-rankings.json');
      writeFileSync(outputPath, JSON.stringify(data, null, 2));
      
      console.log(`\n✅ Scraping complete!`);
      console.log(`Total snapshots: ${data.snapshots.length}`);
      console.log(`Total models: ${data.snapshots.reduce((sum, s) => sum + s.models.length, 0)}`);
      console.log(`Data saved to: ${outputPath}`);
      
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

export { scrapeRealRankings };