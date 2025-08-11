/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fetch from 'node-fetch';
import { RankingsData, ModelRanking, RankingSnapshot, TrendingModel } from './types.js';
import { RankingsCacheManager } from './rankings-cache.js';

export class RankingsClient {
  private readonly gistUrl: string;
  private readonly cache: RankingsCacheManager;
  private readonly fallbackUrl = 'https://gist.githubusercontent.com/sportsculture/a8f3bac998db4178457d3bd9f0a0d705/raw/openrouter-rankings.json';

  constructor(gistUrl?: string, cacheDir?: string) {
    this.gistUrl = gistUrl || this.fallbackUrl;
    this.cache = new RankingsCacheManager(cacheDir);
  }

  /**
   * Fetch latest rankings data (with caching)
   */
  async fetchLatest(forceRefresh = false): Promise<RankingsData | null> {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = this.cache.get();
      if (cached) {
        console.debug(`Using cached rankings (age: ${this.cache.getAge()?.toFixed(1)} hours)`);
        return cached;
      }
    }

    try {
      console.debug('Fetching fresh rankings from Gist...');
      const response = await fetch(this.gistUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'sport-cli/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as RankingsData;
      
      // Validate data structure
      if (!data.version || !data.snapshots) {
        throw new Error('Invalid rankings data structure');
      }

      // Cache the fresh data
      this.cache.set(data);
      console.debug(`Rankings updated: ${data.snapshots.length} snapshots, ${this.getTotalModels(data)} models`);
      
      return data;
    } catch (error) {
      console.warn('Failed to fetch rankings:', error);
      
      // Fall back to cached data if available
      const cached = this.cache.get();
      if (cached) {
        console.debug('Using stale cache due to fetch error');
        return cached;
      }
      
      return null;
    }
  }

  /**
   * Get cached rankings without fetching
   */
  getCached(): RankingsData | null {
    return this.cache.get();
  }

  /**
   * Get top N models for a category/period
   */
  async getTopModels(
    category: RankingSnapshot['category'] = 'overall',
    period: RankingSnapshot['period'] = 'day',
    count = 10
  ): Promise<ModelRanking[]> {
    const data = await this.fetchLatest();
    if (!data) return [];

    const snapshot = data.snapshots.find(
      s => s.category === category && s.period === period
    );

    if (!snapshot) return [];
    
    return snapshot.models.slice(0, count);
  }

  /**
   * Get a specific model's rank
   */
  async getModelRank(
    modelId: string,
    category: RankingSnapshot['category'] = 'overall',
    period: RankingSnapshot['period'] = 'day'
  ): Promise<ModelRanking | null> {
    const data = await this.fetchLatest();
    if (!data) return null;

    const snapshot = data.snapshots.find(
      s => s.category === category && s.period === period
    );

    if (!snapshot) return null;
    
    return snapshot.models.find(m => 
      m.model_id === modelId || 
      m.model_id.endsWith(`/${modelId}`) ||
      modelId.endsWith(`/${m.model_id}`)
    ) || null;
  }

  /**
   * Get trending models (comparing week vs day)
   */
  async getTrending(limit = 5): Promise<TrendingModel[]> {
    const data = await this.fetchLatest();
    if (!data) return [];

    const daySnapshot = data.snapshots.find(
      s => s.category === 'overall' && s.period === 'day'
    );
    const weekSnapshot = data.snapshots.find(
      s => s.category === 'overall' && s.period === 'week'
    );

    if (!daySnapshot || !weekSnapshot) return [];

    const trending: TrendingModel[] = [];

    // Compare day rankings with week rankings
    for (const dayModel of daySnapshot.models.slice(0, 20)) {
      const weekModel = weekSnapshot.models.find(m => m.model_id === dayModel.model_id);
      
      if (!weekModel) {
        // New model in daily rankings
        trending.push({
          ...dayModel,
          trend: 'new',
          previousRank: undefined,
          rankChange: undefined
        });
      } else {
        const rankChange = weekModel.rank - dayModel.rank;
        const shareChange = dayModel.share - weekModel.share;
        
        trending.push({
          ...dayModel,
          previousRank: weekModel.rank,
          rankChange,
          shareChange,
          trend: rankChange > 2 ? 'rising' : 
                 rankChange < -2 ? 'falling' : 
                 'stable'
        });
      }
    }

    // Sort by positive rank change (biggest climbers first)
    return trending
      .filter(m => m.trend === 'rising' || m.trend === 'new')
      .sort((a, b) => {
        if (a.trend === 'new' && b.trend !== 'new') return -1;
        if (b.trend === 'new' && a.trend !== 'new') return 1;
        return (b.rankChange || 0) - (a.rankChange || 0);
      })
      .slice(0, limit);
  }

  /**
   * Search for models by name
   */
  async searchModels(query: string): Promise<ModelRanking[]> {
    const data = await this.fetchLatest();
    if (!data) return [];

    const results: Map<string, ModelRanking> = new Map();
    const queryLower = query.toLowerCase();

    // Search across all snapshots
    for (const snapshot of data.snapshots) {
      for (const model of snapshot.models) {
        if (
          model.name.toLowerCase().includes(queryLower) ||
          model.model_id.toLowerCase().includes(queryLower)
        ) {
          // Keep the best ranking for each model
          const existing = results.get(model.model_id);
          if (!existing || model.rank < existing.rank) {
            results.set(model.model_id, model);
          }
        }
      }
    }

    return Array.from(results.values()).sort((a, b) => a.rank - b.rank);
  }

  /**
   * Get category leaders (top model in each category)
   */
  async getCategoryLeaders(): Promise<Record<string, ModelRanking | null>> {
    const data = await this.fetchLatest();
    if (!data) return {};

    const leaders: Record<string, ModelRanking | null> = {};
    const categories: RankingSnapshot['category'][] = ['overall', 'programming', 'translation', 'reasoning'];

    for (const category of categories) {
      const snapshot = data.snapshots.find(
        s => s.category === category && s.period === 'day'
      );
      leaders[category] = snapshot?.models[0] || null;
    }

    return leaders;
  }

  /**
   * Get statistics about the rankings
   */
  async getStats(): Promise<{
    lastUpdate: string | null;
    totalModels: number;
    totalSnapshots: number;
    cacheAge: number | null;
    categories: string[];
  }> {
    const data = await this.fetchLatest();
    const cacheStats = this.cache.getStats();

    if (!data) {
      return {
        lastUpdate: null,
        totalModels: 0,
        totalSnapshots: 0,
        cacheAge: null,
        categories: []
      };
    }

    const categories = [...new Set(data.snapshots.map(s => s.category))];

    return {
      lastUpdate: data.timestamp,
      totalModels: this.getTotalModels(data),
      totalSnapshots: data.snapshots.length,
      cacheAge: cacheStats.ageHours,
      categories
    };
  }

  /**
   * Helper to count total unique models
   */
  private getTotalModels(data: RankingsData): number {
    const uniqueModels = new Set<string>();
    for (const snapshot of data.snapshots) {
      for (const model of snapshot.models) {
        uniqueModels.add(model.model_id);
      }
    }
    return uniqueModels.size;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}