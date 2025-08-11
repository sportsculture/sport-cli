#!/usr/bin/env node
import { getRankingsClient } from './packages/core/src/rankings/index.js';

async function testRankingsIntegration() {
  console.log('🧪 Testing Rankings Integration\n');
  console.log('================================\n');
  
  const client = getRankingsClient();
  
  try {
    // Test 1: Fetch latest rankings
    console.log('📊 Test 1: Fetching latest rankings from Gist...');
    const data = await client.fetchLatest();
    
    if (data) {
      console.log('✅ Successfully fetched rankings!');
      console.log(`  Version: ${data.version}`);
      console.log(`  Timestamp: ${data.timestamp}`);
      console.log(`  Snapshots: ${data.snapshots.length}`);
      console.log(`  Source: ${data.source}\n`);
    } else {
      console.log('❌ Failed to fetch rankings\n');
      return;
    }
    
    // Test 2: Get top models
    console.log('🏆 Test 2: Getting top models...');
    const topModels = await client.getTopModels('overall', 'day', 5);
    console.log(`  Found ${topModels.length} top models:`);
    topModels.forEach(m => {
      console.log(`    ${m.rank}. ${m.name} (${(m.share * 100).toFixed(1)}%)`);
    });
    console.log();
    
    // Test 3: Get trending models
    console.log('📈 Test 3: Getting trending models...');
    const trending = await client.getTrending(3);
    console.log(`  Found ${trending.length} trending models:`);
    trending.forEach(m => {
      const trendIcon = m.trend === 'rising' ? '↗️' : 
                       m.trend === 'falling' ? '↘️' : 
                       m.trend === 'new' ? '🆕' : '➡️';
      console.log(`    ${trendIcon} ${m.name}`);
    });
    console.log();
    
    // Test 4: Get category leaders
    console.log('👑 Test 4: Getting category leaders...');
    const leaders = await client.getCategoryLeaders();
    Object.entries(leaders).forEach(([category, model]) => {
      if (model) {
        console.log(`    ${category}: ${model.name}`);
      }
    });
    console.log();
    
    // Test 5: Cache status
    console.log('💾 Test 5: Cache status...');
    const stats = await client.getStats();
    console.log(`  Last update: ${stats.lastUpdate}`);
    console.log(`  Cache age: ${stats.cacheAge?.toFixed(1)} hours`);
    console.log(`  Total models: ${stats.totalModels}`);
    console.log();
    
    console.log('✅ All tests passed!\n');
    console.log('The rankings client is successfully fetching data from:');
    console.log('https://gist.githubusercontent.com/sportsculture/a8f3bac998db4178457d3bd9f0a0d705/raw/openrouter-rankings.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRankingsIntegration().catch(console.error);