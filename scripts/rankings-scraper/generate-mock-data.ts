#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RankingsData, RankingSnapshot, ModelRanking } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Popular models based on typical OpenRouter rankings
const popularModels = [
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
  { id: 'deepseek/deepseek-coder', name: 'DeepSeek Coder' },
  { id: 'cohere/command-r-plus', name: 'Command R+' },
  { id: 'x-ai/grok-beta', name: 'Grok Beta' },
  { id: 'perplexity/llama-3.1-sonar-large', name: 'Sonar Large' }
];

function generateMockSnapshot(
  category: RankingSnapshot['category'],
  period: RankingSnapshot['period']
): RankingSnapshot {
  // Shuffle models slightly for different categories
  const shuffled = [...popularModels];
  
  // Different rankings for different categories
  if (category === 'programming') {
    // Move coding models up
    const coderIndex = shuffled.findIndex(m => m.id.includes('deepseek'));
    if (coderIndex > 0) {
      [shuffled[2], shuffled[coderIndex]] = [shuffled[coderIndex], shuffled[2]];
    }
  } else if (category === 'translation') {
    // Move multilingual models up
    const geminiIndex = shuffled.findIndex(m => m.id.includes('gemini'));
    if (geminiIndex > 0) {
      [shuffled[1], shuffled[geminiIndex]] = [shuffled[geminiIndex], shuffled[1]];
    }
  }
  
  // Generate market share distribution
  let remainingShare = 1.0;
  const models: ModelRanking[] = shuffled.map((model, index) => {
    const rank = index + 1;
    
    // Exponential decay for market share
    const share = rank === 1 ? 0.25 + Math.random() * 0.1 :
                  rank === 2 ? 0.15 + Math.random() * 0.05 :
                  rank === 3 ? 0.10 + Math.random() * 0.03 :
                  rank <= 5 ? 0.05 + Math.random() * 0.02 :
                  rank <= 10 ? 0.02 + Math.random() * 0.01 :
                  0.005 + Math.random() * 0.005;
    
    remainingShare -= share;
    
    // Generate token counts (higher for more popular models)
    const baseTokens = 1000000000;
    const tokens = Math.floor(baseTokens * share * (0.8 + Math.random() * 0.4));
    
    return {
      rank,
      model_id: model.id,
      name: model.name,
      share: Math.max(0.001, Math.min(share, remainingShare)),
      tokens,
      url: `https://openrouter.ai/models/${model.id}`
    };
  });
  
  return {
    category,
    period,
    models: models.slice(0, 10) // Return top 10
  };
}

function generateMockData(): RankingsData {
  const categories: RankingSnapshot['category'][] = ['overall', 'programming', 'translation', 'reasoning'];
  const periods: RankingSnapshot['period'][] = ['day', 'week', 'month'];
  const snapshots: RankingSnapshot[] = [];
  
  for (const category of categories) {
    for (const period of periods) {
      snapshots.push(generateMockSnapshot(category, period));
    }
  }
  
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: 'https://openrouter.ai/rankings',
    snapshots
  };
}

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = generateMockData();
  
  // Save mock data
  const outputPath = resolve(__dirname, 'mock-rankings.json');
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log('📊 Generated Mock Rankings Data');
  console.log('================================');
  console.log(`Version: ${data.version}`);
  console.log(`Timestamp: ${data.timestamp}`);
  console.log(`Snapshots: ${data.snapshots.length}`);
  console.log(`\nTop 5 Overall (Day):`);
  
  const overall = data.snapshots.find(s => s.category === 'overall' && s.period === 'day');
  overall?.models.slice(0, 5).forEach(m => {
    console.log(`  ${m.rank}. ${m.name} (${(m.share * 100).toFixed(1)}%)`);
  });
  
  console.log(`\nData saved to: ${outputPath}`);
}

export { generateMockData };