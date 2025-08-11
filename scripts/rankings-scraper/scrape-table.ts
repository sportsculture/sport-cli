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

async function scrapeOpenRouterRankings(): Promise<RankingsData> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const snapshots: RankingSnapshot[] = [];
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📊 Loading OpenRouter rankings page...');
    await page.goto('https://openrouter.ai/rankings', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for content to stabilize
    console.log('⏳ Waiting for rankings table to render...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Try to click on different tabs to get more data
    const categories = [
      { name: 'overall', selector: null }, // Default view
      { name: 'programming', selector: 'button:has-text("Programming"), [data-category="programming"], div:has-text("Programming")' },
      { name: 'translation', selector: 'button:has-text("Translation"), [data-category="translation"], div:has-text("Translation")' },
      { name: 'reasoning', selector: 'button:has-text("Reasoning"), [data-category="reasoning"], div:has-text("Reasoning")' }
    ];
    
    for (const category of categories) {
      console.log(`\n📈 Scraping ${category.name} rankings...`);
      
      // Click category tab if not overall
      if (category.selector) {
        try {
          await page.evaluate((selector) => {
            const elements = document.querySelectorAll('button, div');
            for (const el of elements) {
              if (el.textContent?.toLowerCase().includes(category.name)) {
                (el as HTMLElement).click();
                return true;
              }
            }
            return false;
          }, category.name);
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
          console.log(`  ⚠️ Could not find ${category.name} tab`);
        }
      }
      
      // Extract ranking data
      const rankingData = await page.evaluate(() => {
        const models: any[] = [];
        
        // Strategy 1: Look for table rows
        const rows = document.querySelectorAll('tr, [role="row"], div[class*="row"]');
        console.log(`Found ${rows.length} potential rows`);
        
        rows.forEach((row, index) => {
          const text = row.textContent || '';
          
          // Look for patterns like "#1", "1.", or just "1" at the start
          const rankMatch = text.match(/^#?(\d+)\.?\s/);
          if (rankMatch) {
            const rank = parseInt(rankMatch[1]);
            
            // Find model link within this row
            const modelLink = row.querySelector('a[href*="/models/"], a[href*="/anthropic/"], a[href*="/openai/"], a[href*="/google/"], a[href*="/meta-llama/"]');
            
            if (modelLink) {
              const href = modelLink.getAttribute('href') || '';
              const modelName = modelLink.textContent?.trim() || '';
              
              // Extract percentage (look for XX.X% pattern)
              const percentMatch = text.match(/(\d+\.?\d*)%/);
              const share = percentMatch ? parseFloat(percentMatch[1]) / 100 : 0;
              
              // Extract model ID from href
              let modelId = href;
              if (href.startsWith('/')) {
                modelId = href.substring(1);
              }
              if (modelId.startsWith('models/')) {
                modelId = modelId.substring(7);
              }
              
              models.push({
                rank,
                model_id: modelId,
                name: modelName,
                share: share,
                url: `https://openrouter.ai${href}`
              });
            }
          }
        });
        
        // Strategy 2: If no table rows found, look for model links and try to infer ranking
        if (models.length === 0) {
          const modelLinks = document.querySelectorAll('a[href*="/models/"], a[href*="/anthropic/claude"], a[href*="/openai/gpt"], a[href*="/google/gemini"], a[href*="/meta-llama/llama"]');
          const uniqueModels = new Map();
          
          modelLinks.forEach((link, index) => {
            const href = link.getAttribute('href') || '';
            const modelName = link.textContent?.trim() || '';
            
            // Skip provider pages (too short hrefs)
            if (href.split('/').length < 3) return;
            
            // Skip if we've seen this model
            if (uniqueModels.has(href)) return;
            
            // Get surrounding text for context
            let parent = link.parentElement;
            let context = '';
            for (let i = 0; i < 3 && parent; i++) {
              context = parent.textContent || '';
              if (context.length > 20) break;
              parent = parent.parentElement;
            }
            
            // Extract percentage
            const percentMatch = context.match(/(\d+\.?\d*)%/);
            const share = percentMatch ? parseFloat(percentMatch[1]) / 100 : 0;
            
            // Extract rank
            const rankMatch = context.match(/#?(\d+)\.?\s/);
            const rank = rankMatch ? parseInt(rankMatch[1]) : index + 1;
            
            let modelId = href;
            if (href.startsWith('/')) {
              modelId = href.substring(1);
            }
            if (modelId.startsWith('models/')) {
              modelId = modelId.substring(7);
            }
            
            uniqueModels.set(href, {
              rank,
              model_id: modelId,
              name: modelName,
              share: share,
              url: `https://openrouter.ai${href}`
            });
          });
          
          models.push(...uniqueModels.values());
        }
        
        // Sort by rank
        models.sort((a, b) => a.rank - b.rank);
        
        return models;
      });
      
      console.log(`  ✅ Found ${rankingData.length} models`);
      
      if (rankingData.length > 0) {
        // Show top 3
        rankingData.slice(0, 3).forEach(m => {
          console.log(`     ${m.rank}. ${m.name} (${(m.share * 100).toFixed(1)}%)`);
        });
        
        // Add to snapshots
        snapshots.push({
          category: category.name as any,
          period: 'day',
          models: rankingData.slice(0, 20) // Top 20 models
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error during scraping:', error);
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
      console.log('🚀 OpenRouter Rankings Scraper v1.0\n');
      const data = await scrapeOpenRouterRankings();
      
      // Save to file
      const outputPath = resolve(__dirname, 'scraped-rankings.json');
      writeFileSync(outputPath, JSON.stringify(data, null, 2));
      
      console.log(`\n✅ Scraping complete!`);
      console.log(`📊 Total snapshots: ${data.snapshots.length}`);
      console.log(`🤖 Total models: ${data.snapshots.reduce((sum, s) => sum + s.models.length, 0)}`);
      console.log(`💾 Data saved to: ${outputPath}`);
      
      // Now update the Gist if we have good data
      if (data.snapshots.length > 0) {
        console.log('\n📤 Ready to update Gist with real data!');
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

export { scrapeOpenRouterRankings };