#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';

async function investigatePage() {
  console.log('🔍 Investigating OpenRouter Rankings Page Structure\n');
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
    
    console.log('⏳ Waiting for page to fully render...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-rankings.png' });
    console.log('📸 Initial screenshot saved: initial-rankings.png');
    
    // Look for tabs or filters
    console.log('\n🔍 Looking for tabs/filters on the page...');
    
    const tabs = await page.evaluate(() => {
      const results: any[] = [];
      
      // Look for tab-like elements
      const possibleTabs = document.querySelectorAll('button, div[role="button"], [role="tab"], a[href*="tab"], div[class*="tab"]');
      
      possibleTabs.forEach(element => {
        const text = element.textContent?.trim() || '';
        if (text && text.length < 20) { // Likely a tab label
          results.push({
            text,
            tagName: element.tagName,
            className: element.className,
            role: element.getAttribute('role')
          });
        }
      });
      
      return results;
    });
    
    console.log('\nFound possible tabs/filters:');
    tabs.forEach(tab => {
      console.log(`  - "${tab.text}" (${tab.tagName}, role: ${tab.role})`);
    });
    
    // Try to find and click Programming tab
    console.log('\n🎯 Attempting to click Programming tab...');
    
    const programmingClicked = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const element of elements) {
        const text = element.textContent?.trim() || '';
        // Look for exact match or contains
        if (text === 'Programming' || (text.includes('Programming') && text.length < 30)) {
          console.log('Found Programming element:', element.tagName, element.className);
          (element as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    
    if (programmingClicked) {
      console.log('✅ Clicked Programming tab/filter');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot after clicking
      await page.screenshot({ path: 'programming-rankings.png' });
      console.log('📸 Programming view screenshot saved: programming-rankings.png');
    }
    
    // Now look for the specific models from the user's list
    console.log('\n🔍 Looking for specific models from the list...');
    
    const searchTerms = [
      'Claude Sonnet 4',
      'Qwen3 Coder',
      'Horizon Beta',
      'Kimi K2',
      'Gemini 2.5 Pro',
      'GLM 4.5'
    ];
    
    const foundModels = await page.evaluate((terms) => {
      const results: any[] = [];
      const pageText = document.body.innerText;
      
      terms.forEach(term => {
        if (pageText.includes(term)) {
          // Try to find the context around this term
          const lines = pageText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(term)) {
              results.push({
                model: term,
                found: true,
                context: lines.slice(Math.max(0, i-2), Math.min(lines.length, i+3)).join('\n')
              });
              break;
            }
          }
        } else {
          results.push({
            model: term,
            found: false
          });
        }
      });
      
      return results;
    }, searchTerms);
    
    console.log('\nModel search results:');
    foundModels.forEach(result => {
      if (result.found) {
        console.log(`✅ Found: ${result.model}`);
        console.log(`   Context:\n${result.context.split('\n').map(l => '     ' + l).join('\n')}`);
      } else {
        console.log(`❌ Not found: ${result.model}`);
      }
    });
    
    // Extract the full page text for analysis
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Save the page HTML for analysis
    const html = await page.content();
    const fs = await import('fs');
    fs.writeFileSync('full-page-investigation.html', html);
    fs.writeFileSync('full-page-text.txt', pageText);
    console.log('\n📄 Full page HTML saved: full-page-investigation.html');
    console.log('📄 Full page text saved: full-page-text.txt');
    
    // Look for ranking patterns
    console.log('\n🔍 Looking for ranking patterns...');
    
    const rankingPatterns = await page.evaluate(() => {
      const patterns: any[] = [];
      const text = document.body.innerText;
      
      // Look for patterns like "1." or "#1" followed by model names
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for ranking patterns
        if (line.match(/^[#]?\d+\.?\s/) || line.match(/^\d+\s/)) {
          patterns.push({
            line: line.substring(0, 100),
            lineNumber: i,
            nextLines: lines.slice(i, i+3).join(' | ')
          });
        }
      }
      
      return patterns.slice(0, 20); // First 20 patterns
    });
    
    console.log('\nFound ranking patterns:');
    rankingPatterns.forEach(pattern => {
      console.log(`  Line ${pattern.lineNumber}: ${pattern.line}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Investigation complete');
  }
}

// Run the investigation
investigatePage().catch(console.error);