#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeProgrammingRankings, ModelRanking } from './scrape-programming-rankings.js';
import type { RankingSnapshot, RankingsData } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

async function updateGistWithScrapedRankings() {
  console.log('\n📊 Starting rankings update process...\n');
  
  // Step 1: Scrape the current rankings
  const scrapedRankings = await scrapeProgrammingRankings();
  
  if (scrapedRankings.length === 0) {
    console.error('❌ No rankings were scraped. Aborting update.');
    process.exit(1);
  }
  
  console.log(`\n✅ Successfully scraped ${scrapedRankings.length} rankings`);
  
  // Step 2: Update the Gist
  const { Octokit } = await import('@octokit/rest');
  
  const octokit = new Octokit({
    auth: process.env.GH_TOKEN
  });

  const gistId = process.env.GIST_ID || 'a8f3bac998db4178457d3bd9f0a0d705';
  
  // Convert to our storage format
  const snapshot: RankingSnapshot = {
    timestamp: new Date().toISOString(),
    rankings: scrapedRankings.map(r => ({
      rank: r.rank,
      modelId: r.modelId,
      modelName: r.modelName,
      provider: r.provider,
      category: 'Programming',
      usage: {
        totalTokens: r.usage.totalTokens,
        percentageChange: r.usage.percentageChange === 'new' ? 0 : r.usage.percentageChange
      },
      ...(r.cost && { cost: r.cost })
    }))
  };
  
  const rankingsData: RankingsData = {
    lastUpdated: new Date().toISOString(),
    source: 'OpenRouter Rankings - Programming (Weekly)',
    currentSnapshot: snapshot,
    historicalSnapshots: []
  };
  
  try {
    // First, fetch existing data to preserve history
    const { data: existingGist } = await octokit.gists.get({ gist_id: gistId });
    const existingContent = existingGist.files['openrouter-rankings.json']?.content;
    
    if (existingContent) {
      try {
        const existingData = JSON.parse(existingContent) as RankingsData;
        // Keep last 30 days of history
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        rankingsData.historicalSnapshots = (existingData.historicalSnapshots || [])
          .filter(s => new Date(s.timestamp).getTime() > thirtyDaysAgo);
        
        // Add current snapshot to history (if different from last)
        const lastSnapshot = rankingsData.historicalSnapshots[rankingsData.historicalSnapshots.length - 1];
        if (!lastSnapshot || JSON.stringify(lastSnapshot.rankings) !== JSON.stringify(snapshot.rankings)) {
          rankingsData.historicalSnapshots.push(snapshot);
        }
      } catch (e) {
        console.log('⚠️ Could not parse existing data, starting fresh');
      }
    }
    
    // Update the gist
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        'openrouter-rankings.json': {
          content: JSON.stringify(rankingsData, null, 2)
        }
      }
    });
    
    console.log('\n✅ Successfully updated Gist with scraped rankings');
    console.log(`📊 View at: https://gist.github.com/sportsculture/${gistId}`);
    
    // Display what was updated
    console.log('\n🏆 Updated Rankings:');
    console.log('='.repeat(60));
    scrapedRankings.forEach(model => {
      const cost = model.cost 
        ? `$${model.cost.input}/$${model.cost.output} per MTok`
        : 'Pricing unknown';
      const growth = model.usage.percentageChange === 'new' 
        ? 'NEW' 
        : `${model.usage.percentageChange > 0 ? '+' : ''}${model.usage.percentageChange}%`;
      console.log(`${model.rank}. ${model.modelName} - ${growth} - ${cost}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to update Gist:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateGistWithScrapedRankings().catch(console.error);
}

export { updateGistWithScrapedRankings };