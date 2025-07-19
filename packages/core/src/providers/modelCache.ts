/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelInfo } from './types.js';

interface CachedModels {
  models: ModelInfo[];
  timestamp: number;
}

/**
 * Centralized model caching service to reduce API calls across providers
 */
export class ModelCacheService {
  private static instance: ModelCacheService;
  private cache = new Map<string, CachedModels>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): ModelCacheService {
    if (!ModelCacheService.instance) {
      ModelCacheService.instance = new ModelCacheService();
    }
    return ModelCacheService.instance;
  }

  /**
   * Get cached models for a provider
   */
  getCachedModels(providerId: string): ModelInfo[] | null {
    const cached = this.cache.get(providerId);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(providerId);
      return null;
    }

    return cached.models;
  }

  /**
   * Cache models for a provider
   */
  setCachedModels(providerId: string, models: ModelInfo[]): void {
    this.cache.set(providerId, {
      models,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for a specific provider or all providers
   */
  clearCache(providerId?: string): void {
    if (providerId) {
      this.cache.delete(providerId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache age for a provider in milliseconds
   */
  getCacheAge(providerId: string): number | null {
    const cached = this.cache.get(providerId);
    if (!cached) return null;
    return Date.now() - cached.timestamp;
  }

  /**
   * Check if cache is stale for a provider
   */
  isCacheStale(providerId: string): boolean {
    const age = this.getCacheAge(providerId);
    if (age === null) return true;
    return age > this.CACHE_TTL;
  }
}