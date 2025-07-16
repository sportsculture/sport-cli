/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ContentGeneratorConfig, AuthType, OpenRouterContentGenerator } from '@google/gemini-cli-core';

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: any;
}

interface UseOpenRouterModelsResult {
  models: OpenRouterModel[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Cache models with TTL
const modelCache = new Map<string, { models: OpenRouterModel[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useOpenRouterModels(config: ContentGeneratorConfig | null): UseOpenRouterModelsResult {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchModels = async () => {
    if (!config || config.authType !== AuthType.USE_OPENROUTER || !config.apiKey) {
      setError(new Error('OpenRouter not configured'));
      return;
    }

    const cacheKey = config.apiKey;
    
    // Check cache first
    const cached = modelCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setModels(cached.models);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generator = new OpenRouterContentGenerator(config);

      const fetchedModels = await generator.fetchModels();
      
      // Cache the results
      modelCache.set(cacheKey, {
        models: fetchedModels,
        timestamp: Date.now(),
      });

      setModels(fetchedModels);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch models'));
      // If fetch fails, try to use cached data even if expired
      const cached = modelCache.get(cacheKey);
      if (cached) {
        setModels(cached.models);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [config?.apiKey, config?.authType]);

  return {
    models,
    loading,
    error,
    refetch: fetchModels,
  };
}