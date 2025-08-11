#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { scrapeAllRankings, scrapeRankingsPage } from './scrape-rankings.js';
import { GistUpdater } from './update-gist.js';
import { DEFAULT_CONFIG } from './types.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testScraper() {
  console.log('🧪 Testing OpenRouter Rankings Scraper\n');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Scrape a single category/period
    console.log('\n📝 Test 1: Scraping single category (overall/day)...');
    const singleResult = await scrapeRankingsPage('overall', 'day', DEFAULT_CONFIG);
    
    if (singleResult.length > 0) {
      console.log(`✅ Found ${singleResult.length} models`);
      console.log(`   Top 3 models:`);
      singleResult.slice(0, 3).forEach(m => {
        console.log(`   ${m.rank}. ${m.name} (${(m.share * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('⚠️  No models found - HTML structure may have changed');
    }
    
    // Test 2: Scrape all categories
    console.log('\n📝 Test 2: Scraping all categories and periods...');
    const allResults = await scrapeAllRankings(DEFAULT_CONFIG);
    
    console.log(`\n📊 Results Summary:`);
    console.log(`   Version: ${allResults.version}`);
    console.log(`   Timestamp: ${allResults.timestamp}`);
    console.log(`   Total snapshots: ${allResults.snapshots.length}`);
    
    // Show breakdown by category
    const categories = ['overall', 'programming', 'translation', 'reasoning'];
    for (const category of categories) {
      const snapshots = allResults.snapshots.filter(s => s.category === category);
      const totalModels = snapshots.reduce((sum, s) => sum + s.models.length, 0);
      console.log(`   ${category}: ${snapshots.length} periods, ${totalModels} total entries`);
    }
    
    // Save test output
    const outputPath = resolve(__dirname, 'test-output.json');
    writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
    console.log(`\n💾 Test data saved to: ${outputPath}`);
    
    // Test 3: Validate Gist updater (dry run)
    console.log('\n📝 Test 3: Testing Gist updater (dry run)...');
    
    if (process.env.GIST_ID && process.env.GH_TOKEN) {
      const updater = new GistUpdater({
        gistId: process.env.GIST_ID,
        token: process.env.GH_TOKEN
      });
      
      try {
        await updater.compareWithCurrent(allResults);
        console.log('✅ Gist updater validation passed');
        
        // Only update if explicitly requested
        if (process.argv.includes('--update-gist')) {
          console.log('\n📤 Updating Gist...');
          await updater.update(allResults);
          console.log('✅ Gist updated successfully!');
        } else {
          console.log('ℹ️  Skipping Gist update (use --update-gist to update)');
        }
      } catch (error) {
        console.error('❌ Gist updater error:', error);
      }
    } else {
      console.log('ℹ️  Skipping Gist test (GIST_ID and GH_TOKEN not set)');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    
    // Warnings
    if (allResults.snapshots.length === 0) {
      console.log('\n⚠️  WARNING: No snapshots were scraped!');
      console.log('   This likely means the HTML structure has changed.');
      console.log('   Check the selectors in scrape-rankings.ts');
    } else if (allResults.snapshots.some(s => s.models.length === 0)) {
      console.log('\n⚠️  WARNING: Some snapshots have no models!');
      console.log('   Categories with issues:');
      allResults.snapshots
        .filter(s => s.models.length === 0)
        .forEach(s => console.log(`   - ${s.category}/${s.period}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testScraper().catch(console.error);