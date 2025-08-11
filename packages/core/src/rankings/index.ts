/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { RankingsClient } from './rankings-client.js';
import { RankingsCacheManager } from './rankings-cache.js';

export { RankingsClient, RankingsCacheManager };
export type {
  ModelRanking,
  RankingSnapshot,
  RankingsData,
  RankingsCache,
  TrendingModel
} from './types.js';

// Singleton instance for convenience
let defaultClient: RankingsClient | null = null;

/**
 * Get the default rankings client instance
 */
export function getRankingsClient(gistUrl?: string): RankingsClient {
  if (!defaultClient) {
    defaultClient = new RankingsClient(gistUrl);
  }
  return defaultClient;
}