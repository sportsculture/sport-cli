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

export interface RankingsCache {
  data: RankingsData | null;
  lastFetch: Date | null;
  ttl: number; // milliseconds
}

export interface TrendingModel extends ModelRanking {
  previousRank?: number;
  rankChange?: number;
  shareChange?: number;
  trend: 'rising' | 'falling' | 'stable' | 'new';
}