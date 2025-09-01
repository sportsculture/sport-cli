/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { RankingsData, RankingsCache } from './types.js';

export class RankingsCacheManager {
  private memoryCache: RankingsCache = {
    data: null,
    lastFetch: null,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  };

  private readonly cacheDir: string;
  private readonly cacheFile: string;

  constructor(cacheDir?: string) {
    // Use provided cache dir or default to ~/.sport/cache
    this.cacheDir = cacheDir || join(homedir(), '.sport', 'cache');
    this.cacheFile = join(this.cacheDir, 'rankings.json');

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    // Load disk cache on initialization
    this.loadFromDisk();
  }

  /**
   * Get cached rankings data if still valid
   */
  get(): RankingsData | null {
    // Check memory cache first
    if (this.isValid(this.memoryCache)) {
      return this.memoryCache.data;
    }

    // Try loading from disk
    this.loadFromDisk();
    if (this.isValid(this.memoryCache)) {
      return this.memoryCache.data;
    }

    return null;
  }

  /**
   * Store rankings data in cache
   */
  set(data: RankingsData): void {
    this.memoryCache = {
      data,
      lastFetch: new Date(),
      ttl: 24 * 60 * 60 * 1000,
    };

    // Persist to disk
    this.saveToDisk();
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.memoryCache = {
      data: null,
      lastFetch: null,
      ttl: 24 * 60 * 60 * 1000,
    };

    // Remove disk cache
    if (existsSync(this.cacheFile)) {
      try {
        writeFileSync(this.cacheFile, '{}');
      } catch (error) {
        console.warn('Failed to clear disk cache:', error);
      }
    }
  }

  /**
   * Check if cache is still valid
   */
  isValid(cache: RankingsCache): boolean {
    if (!cache.data || !cache.lastFetch) {
      return false;
    }

    const age = Date.now() - cache.lastFetch.getTime();
    return age < cache.ttl;
  }

  /**
   * Get cache age in hours
   */
  getAge(): number | null {
    if (!this.memoryCache.lastFetch) {
      return null;
    }

    const age = Date.now() - this.memoryCache.lastFetch.getTime();
    return age / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Load cache from disk
   */
  private loadFromDisk(): void {
    if (!existsSync(this.cacheFile)) {
      return;
    }

    try {
      const content = readFileSync(this.cacheFile, 'utf-8');
      const cached = JSON.parse(content);

      if (cached.data && cached.lastFetch) {
        this.memoryCache = {
          data: cached.data,
          lastFetch: new Date(cached.lastFetch),
          ttl: cached.ttl || 24 * 60 * 60 * 1000,
        };
      }
    } catch (error) {
      console.warn('Failed to load rankings cache from disk:', error);
    }
  }

  /**
   * Save cache to disk
   */
  private saveToDisk(): void {
    try {
      const content = JSON.stringify(
        {
          data: this.memoryCache.data,
          lastFetch: this.memoryCache.lastFetch,
          ttl: this.memoryCache.ttl,
        },
        null,
        2,
      );

      writeFileSync(this.cacheFile, content);
    } catch (error) {
      console.warn('Failed to save rankings cache to disk:', error);
    }
  }

  /**
   * Get statistics about the cache
   */
  getStats(): {
    hasData: boolean;
    isValid: boolean;
    ageHours: number | null;
    snapshotCount: number;
    modelCount: number;
    lastUpdate: string | null;
  } {
    const hasData = !!this.memoryCache.data;
    const isValid = this.isValid(this.memoryCache);
    const ageHours = this.getAge();
    const snapshotCount = this.memoryCache.data?.snapshots.length || 0;
    const modelCount =
      this.memoryCache.data?.snapshots.reduce(
        (sum, s) => sum + s.models.length,
        0,
      ) || 0;
    const lastUpdate = this.memoryCache.data?.timestamp || null;

    return {
      hasData,
      isValid,
      ageHours,
      snapshotCount,
      modelCount,
      lastUpdate,
    };
  }
}
