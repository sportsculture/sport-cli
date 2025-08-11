#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ModelRanking, RankingSnapshot, RankingsData } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

// Based on the screenshot, here are the actual top 10 programming models
const TOP_10_MODELS: ModelRanking[] = [
  {
    rank: 1,
    modelId: 'anthropic/claude-sonnet-4',
    modelName: 'Claude Sonnet 4',
    provider: 'anthropic',
    category: 'Programming',
    usage: {
      totalTokens: 520000000000, // 520B
      percentageChange: 14
    },
    cost: {
      input: 3.00,
      output: 15.00
    }
  },
  {
    rank: 2,
    modelId: 'google/gemini-2.0-flash',
    modelName: 'Gemini 2.0 Flash',
    provider: 'google',
    category: 'Programming',
    usage: {
      totalTokens: 274000000000, // 274B
      percentageChange: 5
    },
    cost: {
      input: 0.00,
      output: 0.00
    }
  },
  {
    rank: 3,
    modelId: 'google/gemini-2.5-flash',
    modelName: 'Gemini 2.5 Flash',
    provider: 'google',
    category: 'Programming',
    usage: {
      totalTokens: 261000000000, // 261B
      percentageChange: 13
    },
    cost: {
      input: 0.00,
      output: 0.00
    }
  },
  {
    rank: 4,
    modelId: 'openrouter/horizon-beta',
    modelName: 'Horizon Beta',
    provider: 'openrouter',
    category: 'Programming',
    usage: {
      totalTokens: 190000000000, // 190B
      percentageChange: 183
    },
    cost: {
      input: 0.50,
      output: 1.50
    }
  },
  {
    rank: 5,
    modelId: 'deepseek/deepseek-v3-0324',
    modelName: 'DeepSeek V3 0324 (free)',
    provider: 'deepseek',
    category: 'Programming',
    usage: {
      totalTokens: 177000000000, // 177B
      percentageChange: 10
    },
    cost: {
      input: 0.00,
      output: 0.00
    }
  },
  {
    rank: 6,
    modelId: 'deepseek/deepseek-v3-0324',
    modelName: 'DeepSeek V3 0324',
    provider: 'deepseek',
    category: 'Programming',
    usage: {
      totalTokens: 177000000000, // 177B
      percentageChange: 10
    },
    cost: {
      input: 0.14,
      output: 0.28
    }
  },
  {
    rank: 7,
    modelId: 'google/gemini-2.5-pro',
    modelName: 'Gemini 2.5 Pro',
    provider: 'google',
    category: 'Programming',
    usage: {
      totalTokens: 150000000000, // 150B
      percentageChange: 8
    },
    cost: {
      input: 0.00,
      output: 0.00
    }
  },
  {
    rank: 8,
    modelId: 'anthropic/claude-3.7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    category: 'Programming',
    usage: {
      totalTokens: 126000000000, // 126B
      percentageChange: 1
    },
    cost: {
      input: 3.00,
      output: 15.00
    }
  },
  {
    rank: 9,
    modelId: 'qwen/qwen3-coder',
    modelName: 'Qwen3 Coder',
    provider: 'qwen',
    category: 'Programming',
    usage: {
      totalTokens: 125000000000, // 125B
      percentageChange: 9
    },
    cost: {
      input: 0.18,
      output: 0.18
    }
  },
  {
    rank: 10,
    modelId: 'qwen/qwen3-30b-a3b',
    modelName: 'Qwen3 30B A3B',
    provider: 'qwen',
    category: 'Programming',
    usage: {
      totalTokens: 121000000000, // 121B
      percentageChange: 610
    },
    cost: {
      input: 0.18,
      output: 0.18
    }
  }
];

async function updateGistWithTop10() {
  const { Octokit } = await import('@octokit/rest');
  
  const octokit = new Octokit({
    auth: process.env.GH_TOKEN
  });

  const gistId = process.env.GIST_ID || 'a8f3bac998db4178457d3bd9f0a0d705';
  
  const snapshot: RankingSnapshot = {
    timestamp: new Date().toISOString(),
    rankings: TOP_10_MODELS
  };
  
  const rankingsData: RankingsData = {
    lastUpdated: new Date().toISOString(),
    source: 'OpenRouter Rankings - Programming',
    currentSnapshot: snapshot,
    historicalSnapshots: [] // We'll preserve existing history when we fetch
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
        rankingsData.historicalSnapshots = existingData.historicalSnapshots
          .filter(s => new Date(s.timestamp).getTime() > thirtyDaysAgo);
        
        // Add current snapshot to history
        rankingsData.historicalSnapshots.push(snapshot);
      } catch (e) {
        console.log('Could not parse existing data, starting fresh');
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
    
    console.log('✅ Successfully updated Gist with top 10 programming models');
    console.log(`📊 View at: https://gist.github.com/sportsculture/${gistId}`);
    
    // Display what was updated
    console.log('\n🏆 Updated Rankings:');
    TOP_10_MODELS.forEach(model => {
      const cost = model.cost.input === 0 ? 'Free' : `$${model.cost.input}/$${model.cost.output} per MTok`;
      console.log(`${model.rank}. ${model.modelName} - ${cost}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to update Gist:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateGistWithTop10().catch(console.error);
}

export { updateGistWithTop10, TOP_10_MODELS };