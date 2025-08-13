#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

interface ModelRanking {
  rank: number;
  modelId: string;
  modelName: string;
  provider: string;
  usage: {
    totalTokens: number;
    percentageChange: number | 'new';
  };
  cost?: {
    input: number;
    output: number;
  };
}

// Known model ID mappings and pricing (per million tokens)
const MODEL_MAPPINGS: Record<string, { 
  modelId: string; 
  pricing?: { input: number; output: number };
  verified?: boolean;
}> = {
  'claude-sonnet-4': { 
    modelId: 'anthropic/claude-3.5-sonnet-20241022',
    pricing: { input: 3.00, output: 15.00 },
    verified: true
  },
  'claude-3.7-sonnet': { 
    modelId: 'anthropic/claude-3.5-sonnet',
    pricing: { input: 3.00, output: 15.00 },
    verified: true
  },
  'qwen3-coder': { 
    modelId: 'qwen/qwen-2.5-coder-32b-instruct',
    pricing: { input: 0.18, output: 0.18 },
    verified: false
  },
  'horizon-beta': { 
    modelId: 'openrouter/auto',
    pricing: { input: 0.50, output: 1.50 },
    verified: false
  },
  'kimi-k2': { 
    modelId: 'moonshotai/moonshot-v1-128k',
    pricing: { input: 0.30, output: 0.30 },
    verified: false
  },
  'gemini-2.5-pro': { 
    modelId: 'google/gemini-2.0-flash-exp',
    pricing: { input: 0.00, output: 0.00 },
    verified: false
  },
  'gemini-2.5-flash': { 
    modelId: 'google/gemini-2.0-flash',
    pricing: { input: 0.00, output: 0.00 },
    verified: false
  },
  'gpt-5': { 
    modelId: 'openai/gpt-4o-preview',
    pricing: { input: 15.00, output: 60.00 },
    verified: false
  },
  'glm-4.5': { 
    modelId: 'glm/glm-4-flash',
    pricing: { input: 0.50, output: 0.50 },
    verified: false
  },
  'glm-4.5-air': { 
    modelId: 'glm/glm-4-air',
    pricing: { input: 0.30, output: 0.30 },
    verified: false
  },
};

async function scrapeProgrammingRankings(): Promise<ModelRanking[]> {
  console.log('🚀 Scraping Programming Rankings from OpenRouter\n');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const url = 'https://openrouter.ai/rankings';
    console.log(`📍 Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for initial page load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click on Programming filter
    console.log('🎯 Clicking Programming filter...');
    
    const clicked = await page.evaluate(() => {
      // Find all buttons with "Programming" text
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Look for the Programming button that's likely a filter (not in menu)
      for (const button of buttons) {
        const text = button.textContent?.trim();
        if (text === 'Programming' && !button.getAttribute('role')?.includes('menuitem')) {
          button.click();
          return true;
        }
      }
      
      // Fallback: click any Programming button
      for (const button of buttons) {
        if (button.textContent?.trim() === 'Programming') {
          button.click();
          return true;
        }
      }
      
      return false;
    });
    
    if (!clicked) {
      console.log('⚠️ Could not find Programming button');
      return [];
    }
    
    console.log('✅ Clicked Programming filter');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract rankings
    console.log('📊 Extracting programming rankings...\n');
    
    const rankings = await page.evaluate(() => {
      const results: any[] = [];
      const text = document.body.innerText;
      const lines = text.split('\n').map(l => l.trim());
      
      // Find where programming rankings start
      // Look for "1." that appears after we see specific programming context
      let startIndex = -1;
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i] === '1.') {
          // Check if this is the programming section by looking for "Claude Sonnet 4" or similar pattern
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            // Check for patterns that indicate this is the programming section
            // We expect model names, not provider names at rank 1
            if (nextLine && !['google', 'anthropic', 'openai', 'deepseek'].includes(nextLine.toLowerCase()) &&
                nextLine.length > 3) {
              // Additional check: look back for Programming context
              const prevLines = lines.slice(Math.max(0, i - 30), i).join(' ');
              if (i > 100 || prevLines.includes('Programming') || prevLines.includes('100%')) {
                startIndex = i;
                break;
              }
            }
          }
        }
      }
      
      if (startIndex === -1) {
        console.log('Could not find programming rankings start');
        return results;
      }
      
      // Parse rankings
      let i = startIndex;
      let rank = 1;
      
      while (i < lines.length && rank <= 10) {
        if (lines[i] === `${rank}.`) {
          // Next 5 lines should be: model name, "by", provider, tokens, percentage
          if (i + 5 < lines.length) {
            const modelName = lines[i + 1];
            const byLine = lines[i + 2];
            const provider = lines[i + 3];
            const tokensLine = lines[i + 4];
            const growthLine = lines[i + 5];
            
            // Parse tokens (e.g., "357B tokens" -> 357000000000)
            let totalTokens = 0;
            const tokensMatch = tokensLine.match(/^([\d.]+)([BMK]?)\s*tokens$/i);
            if (tokensMatch) {
              const value = parseFloat(tokensMatch[1]);
              const unit = tokensMatch[2].toUpperCase();
              if (unit === 'B') {
                totalTokens = value * 1e9;
              } else if (unit === 'M') {
                totalTokens = value * 1e6;
              } else if (unit === 'K') {
                totalTokens = value * 1e3;
              } else {
                totalTokens = value;
              }
            }
            
            // Parse growth (e.g., "14%" or "new")
            let percentageChange: number | 'new' = 0;
            if (growthLine === 'new') {
              percentageChange = 'new';
            } else {
              const growthMatch = growthLine.match(/^([+-]?\d+)%$/);
              if (growthMatch) {
                percentageChange = parseInt(growthMatch[1]);
              }
            }
            
            results.push({
              rank,
              modelName,
              provider,
              tokensLine,
              growthLine,
              totalTokens,
              percentageChange
            });
            
            rank++;
            i += 6; // Move to next potential ranking
          } else {
            break;
          }
        } else {
          i++;
        }
      }
      
      return results;
    });
    
    // Convert to our format
    const modelRankings: ModelRanking[] = rankings.map(r => {
      // Get mapping if known
      const modelKey = r.modelName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const mapping = MODEL_MAPPINGS[modelKey];
      
      // Use mapped ID or generate one
      const modelId = mapping?.modelId || 
        `${r.provider}/${r.modelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      
      return {
        rank: r.rank,
        modelId,
        modelName: r.modelName,
        provider: r.provider,
        usage: {
          totalTokens: r.totalTokens,
          percentageChange: r.percentageChange
        },
        ...(mapping?.pricing && { cost: mapping.pricing })
      };
    });
    
    // Display results
    console.log('🏆 TOP 10 PROGRAMMING MODELS:');
    console.log('='.repeat(60));
    console.log();
    console.log('Rank | Model                          | Provider    | Tokens   | Growth  | Cost ($/MTok)');
    console.log('-----|--------------------------------|-------------|----------|---------|---------------');
    
    modelRankings.forEach(model => {
      const rank = String(model.rank).padEnd(4);
      const name = model.modelName.substring(0, 30).padEnd(30);
      const provider = model.provider.substring(0, 11).padEnd(11);
      const tokens = model.usage.totalTokens 
        ? `${(model.usage.totalTokens / 1e9).toFixed(1)}B`.padEnd(8)
        : 'N/A'.padEnd(8);
      const growth = model.usage.percentageChange === 'new' 
        ? 'new'.padEnd(7)
        : `${model.usage.percentageChange > 0 ? '+' : ''}${model.usage.percentageChange}%`.padEnd(7);
      const cost = model.cost 
        ? `$${model.cost.input}/$${model.cost.output}`
        : 'Unknown';
      
      console.log(`${rank} | ${name} | ${provider} | ${tokens} | ${growth} | ${cost}`);
    });
    
    console.log();
    console.log('💡 Cost format: Input/Output per million tokens');
    console.log('📈 Growth: Week-over-week percentage change');
    
    return modelRankings;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeProgrammingRankings()
    .then(rankings => {
      console.log(`\n✅ Successfully scraped ${rankings.length} rankings`);
    })
    .catch(console.error);
}

export { scrapeProgrammingRankings, ModelRanking };