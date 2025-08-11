#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';

async function scrapeTop5Programming() {
  console.log('🚀 Scraping Top 5 Programming Models from OpenRouter\n');
  console.log('='.repeat(50));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Go directly to programming rankings
    const url = 'https://openrouter.ai/rankings';
    console.log(`\n📍 Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for page to fully render
    console.log('⏳ Waiting for content to render...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to click on Programming tab
    console.log('🔍 Looking for Programming tab...');
    
    const clicked = await page.evaluate(() => {
      // Try multiple selectors for the Programming tab
      const selectors = [
        'button:contains("Programming")',
        '[data-tab="programming"]',
        '[role="tab"]:contains("Programming")',
        'button',
        'div[role="button"]',
        'a',
        '[class*="tab"]'
      ];
      
      // Look for any element with "Programming" text
      const allElements = document.querySelectorAll('button, div, a, span, [role="tab"], [role="button"]');
      for (const element of allElements) {
        const text = element.textContent || '';
        if (text.trim() === 'Programming' || text.toLowerCase().includes('programming')) {
          console.log('Found Programming element:', element.tagName, element.className);
          (element as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      console.log('✅ Clicked Programming tab');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log('⚠️  Could not find Programming tab, continuing with default view');
    }
    
    // Extract the top 5 models
    console.log('\n📊 Extracting rankings data...');
    
    const models = await page.evaluate(() => {
      const results: any[] = [];
      
      // Look for ranking rows - try multiple strategies
      
      // Strategy 1: Look for numbered rankings
      const allText = document.body.innerText;
      const lines = allText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for pattern like "1." or "#1" at start of line
        const rankMatch = line.match(/^#?(\d+)\.?\s/);
        if (rankMatch && parseInt(rankMatch[1]) <= 5) {
          const rank = parseInt(rankMatch[1]);
          
          // The model name might be on this line or the next
          let modelInfo = line.replace(rankMatch[0], '').trim();
          
          // Look ahead for more info
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine && !nextLine.match(/^#?\d+\.?\s/)) {
              modelInfo += ' ' + nextLine;
            }
          }
          
          results.push({
            rank,
            rawText: modelInfo,
            foundAt: 'body text scan'
          });
        }
      }
      
      // Strategy 2: Look for links to model pages
      const modelLinks = document.querySelectorAll('a[href*="/models/"], a[href*="/anthropic/"], a[href*="/openai/"], a[href*="/google/"], a[href*="/meta-llama/"], a[href*="/qwen/"], a[href*="/deepseek/"], a[href*="/x-ai/"], a[href*="/moonshotai/"]');
      
      let modelCount = 0;
      modelLinks.forEach((link) => {
        if (modelCount >= 5) return; // Only top 5
        
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';
        
        // Skip provider-only links (too short)
        if (href.split('/').length < 3 || href === '/anthropic' || href === '/google' || href === '/openai') {
          return;
        }
        
        // Get parent element for context
        let parent = link.parentElement;
        let context = parent?.innerText || '';
        
        // Look for percentage or ranking info
        for (let i = 0; i < 3 && parent; i++) {
          context = parent.innerText || '';
          if (context.includes('%') || context.includes('tokens')) {
            break;
          }
          parent = parent.parentElement;
        }
        
        modelCount++;
        results.push({
          rank: modelCount,
          name: text.trim(),
          href,
          context: context.substring(0, 200),
          foundAt: 'model links'
        });
      });
      
      // Strategy 3: Look for table rows
      const rows = document.querySelectorAll('tr, [role="row"], div[class*="grid"], div[class*="row"]');
      rows.forEach((row, index) => {
        if (index >= 5) return;
        
        const text = row.textContent || '';
        if (text.includes('tokens') || text.includes('%')) {
          results.push({
            rank: index + 1,
            rawText: text.substring(0, 200),
            foundAt: 'table rows'
          });
        }
      });
      
      return results;
    });
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'programming-rankings.png' });
    console.log('📸 Screenshot saved: programming-rankings.png');
    
    // Display results
    console.log('\n🏆 TOP 5 PROGRAMMING MODELS:');
    console.log('-'.repeat(50));
    
    if (models.length === 0) {
      console.log('❌ No models found - page structure may have changed');
    } else {
      // Deduplicate and show top 5
      const seen = new Set();
      let count = 0;
      
      for (const model of models) {
        if (count >= 5) break;
        
        const key = model.name || model.rawText || model.context;
        if (!key || seen.has(key)) continue;
        
        seen.add(key);
        count++;
        
        console.log(`\n${count}. ${model.name || 'Unknown Model'}`);
        if (model.rawText) console.log(`   Raw: ${model.rawText.substring(0, 100)}`);
        if (model.context) console.log(`   Context: ${model.context.substring(0, 100)}`);
        if (model.href) console.log(`   URL: https://openrouter.ai${model.href}`);
        console.log(`   Found via: ${model.foundAt}`);
      }
    }
    
    // Also save the page HTML for analysis
    const html = await page.content();
    const fs = await import('fs');
    fs.writeFileSync('programming-page.html', html);
    console.log('\n📄 Full HTML saved: programming-page.html');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed');
  }
}

// Run the scraper
scrapeTop5Programming().catch(console.error);