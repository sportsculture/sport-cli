/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelRanking {
  rank: number;
  model_id: string;
  name: string;
  share: number;
  tokens?: number;
  url: string;
}

export interface RankingSnapshot {
  category: 'overall' | 'programming' | 'translation' | 'roleplay' | 'reasoning';
  period: 'day' | 'week' | 'month';
  models: ModelRanking[];
}

export interface RankingsData {
  version: string;
  timestamp: string;
  source: string;
  snapshots: RankingSnapshot[];
}

export interface ScraperConfig {
  userAgent: string;
  delayMs: number;
  maxRetries: number;
  baseUrl: string;
}

export const DEFAULT_CONFIG: ScraperConfig = {
  userAgent: 'sport-cli-rankings-bot/1.0 (https://github.com/sportsculture/sport-cli)',
  delayMs: 750,
  maxRetries: 3,
  baseUrl: 'https://openrouter.ai'
};