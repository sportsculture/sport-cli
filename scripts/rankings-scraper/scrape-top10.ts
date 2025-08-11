#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';

interface ModelInfo {
  rank: number;
  name: string;
  provider: string;
  tokens: string;
  growth: string;
  cost?: {
    input: number;
    output: number;
  };
}

// Known model pricing (per million tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'gemini-2.0-flash': { input: 0.00, output: 0.00 }, // Free
  'gemini-2.5-flash': { input: 0.00, output: 0.00 }, // Free
  'horizon-beta': { input: 0.50, output: 1.50 },
  'deepseek-v3-0324-free': { input: 0.00, output: 0.00 }, // Free
  'deepseek-v3-0324': { input: 0.14, output: 0.28 },
  'gemini-2.5-pro': { input: 0.00, output: 0.00 }, // Free
  'claude-3.7-sonnet': { input: 3.00, output: 15.00 },
  'qwen3-coder': { input: 0.18, output: 0.18 },
  'qwen3-30b-a3b': { input: 0.18, output: 0.18 },
  'gpt-5': { input: 15.00, output: 60.00 },
  'gpt-4o': { input: 5.00, output: 15.00 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
};

async function scrapeTop10() {
  console.log('🚀 Scraping Top 10 Models from OpenRouter Rankings\n');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const url = 'https://openrouter.ai/rankings';
    console.log(`\n📍 Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    console.log('⏳ Waiting for rankings to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract the top 10 models from the page
    console.log('📊 Extracting top 10 models...\n');
    
    const models = await page.evaluate(() => {
      const results: any[] = [];
      
      // Look for the ranking list items
      // They appear to be in a grid/list with numbers 1-10
      const allElements = document.querySelectorAll('*');
      
      for (const element of allElements) {
        const text = element.textContent || '';
        
        // Look for pattern "1." through "10." at the start
        const match = text.match(/^(\d+)\.\s+(.+?)by\s+(\w+)/);
        if (match && parseInt(match[1]) <= 10) {
          const rank = parseInt(match[1]);
          const modelName = match[2].trim();
          const provider = match[3].trim();
          
          // Look for tokens and growth in the same element or nearby
          const tokensMatch = text.match(/(\d+[A-Z]?)\s*tokens/);
          const growthMatch = text.match(/([↑↓]?\d+%|new)/);
          
          results.push({
            rank,
            name: modelName,
            provider,
            tokens: tokensMatch ? tokensMatch[1] : 'N/A',
            growth: growthMatch ? growthMatch[1] : '',
            text: text.substring(0, 200)
          });
        }
      }
      
      // Alternative: Look for links to model pages
      const modelLinks = document.querySelectorAll('a[href*="/models/"], a[href*="/anthropic/"], a[href*="/google/"], a[href*="/qwen/"], a[href*="/deepseek/"], a[href*="/openrouter/"], a[href*="/x-ai/"]');
      
      modelLinks.forEach((link, index) => {
        if (index >= 10) return;
        
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';
        
        // Skip provider-only links
        if (href.split('/').length < 3) return;
        
        // Get parent context for rank and tokens
        let parent = link.parentElement;
        let context = '';
        for (let i = 0; i < 5 && parent; i++) {
          context = parent.textContent || '';
          if (context.includes('tokens')) break;
          parent = parent.parentElement;
        }
        
        results.push({
          rank: index + 1,
          name: text.trim(),
          provider: href.split('/')[1] || 'unknown',
          tokens: context.match(/(\d+[A-Z]?)\s*tokens/)?.[1] || 'N/A',
          growth: context.match(/([↑↓]?\d+%|new)/)?.[1] || '',
          href
        });
      });
      
      return results;
    });
    
    // Process and display the top 10
    const seen = new Set();
    const top10: ModelInfo[] = [];
    
    for (const model of models) {
      if (top10.length >= 10) break;
      
      const key = model.name;
      if (!key || seen.has(key)) continue;
      
      seen.add(key);
      
      // Get pricing if known
      const modelKey = model.name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      
      const pricing = MODEL_PRICING[modelKey];
      
      top10.push({
        rank: model.rank || top10.length + 1,
        name: model.name,
        provider: model.provider,
        tokens: model.tokens,
        growth: model.growth,
        cost: pricing
      });
    }
    
    // Display results in a nice table format
    console.log('🏆 TOP 10 MODELS FROM OPENROUTER RANKINGS');
    console.log('='.repeat(60));
    console.log();
    console.log('Rank | Model                          | Provider    | Tokens | Growth | Cost ($/MTok)');
    console.log('-----|--------------------------------|-------------|--------|--------|---------------');
    
    top10.forEach(model => {
      const rank = String(model.rank).padEnd(4);
      const name = model.name.substring(0, 30).padEnd(30);
      const provider = model.provider.substring(0, 11).padEnd(11);
      const tokens = (model.tokens || 'N/A').padEnd(6);
      const growth = (model.growth || 'stable').padEnd(6);
      const cost = model.cost 
        ? `$${model.cost.input}/$${model.cost.output}`
        : 'Free/Unknown';
      
      console.log(`${rank} | ${name} | ${provider} | ${tokens} | ${growth} | ${cost}`);
    });
    
    console.log();
    console.log('💡 Cost format: Input/Output per million tokens');
    console.log('📈 Growth: Percentage change in usage');
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'top10-rankings.png' });
    console.log('\n📸 Screenshot saved: top10-rankings.png');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeTop10().catch(console.error);