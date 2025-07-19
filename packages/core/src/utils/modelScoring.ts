/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import * as fs from 'fs';

interface ScoringWeights {
  popularity_multiplier: number;
  free_model_bonus: number;
  context_length_factor: number;
  cost_sensitivity: number;
}

interface VersionKeywords {
  [version: string]: number;
}

interface ModelFamily {
  name: string;
  bonus: number;
  description: string;
  version_keywords: VersionKeywords;
  patterns: string[];
}

interface SpecialTag {
  bonus: number;
  indicators: string[];
}

interface ModelMetadata {
  scoring_weights: ScoringWeights;
  model_families: Record<string, ModelFamily>;
  special_tags: Record<string, SpecialTag>;
}

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  // Add popularity if available from API
  popularity?: number;
}

interface ScoredModel extends OpenRouterModel {
  score: number;
  matchedFamily?: string;
  scoreBreakdown: {
    baseScore: number;
    familyBonus: number;
    versionBonus: number;
    pricingScore: number;
    popularityScore: number;
    contextScore: number;
    specialTagsScore: number;
  };
}

let cachedMetadata: ModelMetadata | null = null;

function loadModelMetadata(): ModelMetadata {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  try {
    const metadataPath = path.join(
      __dirname,
      '..',
      'config',
      'model-metadata.json',
    );
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    cachedMetadata = JSON.parse(metadataContent);
    return cachedMetadata!;
  } catch (error) {
    console.warn('Failed to load model metadata, using defaults:', error);
    // Return sensible defaults if file is missing
    return {
      scoring_weights: {
        popularity_multiplier: 100,
        free_model_bonus: 500,
        context_length_factor: 0.001,
        cost_sensitivity: 100,
      },
      model_families: {
        'cognitivecomputations/dolphin': {
          name: 'Dolphin',
          bonus: 1000,
          description: 'Uncensored, fine-tuned models',
          version_keywords: { '3.0': 200, '8x22b': 150 },
          patterns: ['cognitivecomputations/dolphin'],
        },
      },
      special_tags: {},
    };
  }
}

function calculateFamilyScore(
  modelId: string,
  metadata: ModelMetadata,
): { familyBonus: number; versionBonus: number; matchedFamily?: string } {
  let familyBonus = 0;
  let versionBonus = 0;
  let matchedFamily: string | undefined;

  // Check each model family
  for (const [familyKey, family] of Object.entries(metadata.model_families)) {
    // Check if model matches any of the family patterns
    const matches = family.patterns.some((pattern) =>
      modelId.toLowerCase().includes(pattern.toLowerCase()),
    );

    if (matches) {
      familyBonus = family.bonus;
      matchedFamily = family.name;

      // Check for version keywords
      for (const [keyword, bonus] of Object.entries(family.version_keywords)) {
        if (modelId.toLowerCase().includes(keyword.toLowerCase())) {
          versionBonus += bonus;
        }
      }
      break; // Use first matching family
    }
  }

  return { familyBonus, versionBonus, matchedFamily };
}

function calculatePricingScore(
  model: OpenRouterModel,
  metadata: ModelMetadata,
): number {
  const { free_model_bonus, cost_sensitivity } = metadata.scoring_weights;

  // Check if it's a free model
  if (model.id.includes(':free') || model.id.includes('free')) {
    return free_model_bonus;
  }

  // Calculate cost score based on pricing
  if (model.pricing?.prompt && model.pricing?.completion) {
    try {
      const promptCost = parseFloat(model.pricing.prompt);
      const completionCost = parseFloat(model.pricing.completion);

      if (promptCost === 0 && completionCost === 0) {
        return free_model_bonus;
      }

      const totalCost = promptCost + completionCost;
      if (totalCost > 0) {
        // Lower cost = higher score (inverse relationship)
        return cost_sensitivity / (totalCost * 1000000); // Convert to per-million-token cost
      }
    } catch (error) {
      // If parsing fails, return neutral score
      return 0;
    }
  }

  return 0; // No pricing information
}

function calculateSpecialTagsScore(
  modelId: string,
  modelName: string,
  metadata: ModelMetadata,
): number {
  let score = 0;
  const textToCheck = (modelId + ' ' + modelName).toLowerCase();

  for (const [tagName, tag] of Object.entries(metadata.special_tags)) {
    const hasIndicator = tag.indicators.some((indicator) =>
      textToCheck.includes(indicator.toLowerCase()),
    );

    if (hasIndicator) {
      score += tag.bonus;
    }
  }

  return score;
}

export function scoreModels(models: OpenRouterModel[]): ScoredModel[] {
  const metadata = loadModelMetadata();
  const { popularity_multiplier, context_length_factor } =
    metadata.scoring_weights;

  const scoredModels: ScoredModel[] = models.map((model) => {
    const baseScore = 100; // Everyone starts with base score

    // Family and version scoring
    const { familyBonus, versionBonus, matchedFamily } = calculateFamilyScore(
      model.id,
      metadata,
    );

    // Pricing scoring
    const pricingScore = calculatePricingScore(model, metadata);

    // Popularity scoring (if available)
    const popularityScore = model.popularity
      ? model.popularity * popularity_multiplier
      : 0;

    // Context length scoring
    const contextScore = model.context_length
      ? model.context_length * context_length_factor
      : 0;

    // Special tags scoring
    const specialTagsScore = calculateSpecialTagsScore(
      model.id,
      model.name,
      metadata,
    );

    const totalScore =
      baseScore +
      familyBonus +
      versionBonus +
      pricingScore +
      popularityScore +
      contextScore +
      specialTagsScore;

    return {
      ...model,
      score: totalScore,
      matchedFamily,
      scoreBreakdown: {
        baseScore,
        familyBonus,
        versionBonus,
        pricingScore,
        popularityScore,
        contextScore,
        specialTagsScore,
      },
    };
  });

  // Sort by score (highest first)
  return scoredModels.sort((a, b) => b.score - a.score);
}

export function getTopRecommendations(
  models: OpenRouterModel[],
  count: number = 6,
): ScoredModel[] {
  const scored = scoreModels(models);
  return scored.slice(0, count);
}

// Helper function to format model recommendations for display
export function formatModelForDisplay(model: ScoredModel): {
  id: string;
  recommendedFor: string;
  provider: string;
  score?: number;
} {
  let recommendedFor = model.matchedFamily || 'General Use';

  // Add specific recommendations based on model characteristics
  if (model.id.includes('dolphin')) {
    if (model.id.includes('3.0')) {
      recommendedFor = 'Dolphin 3.0';
    } else if (model.id.includes('coder')) {
      recommendedFor = 'Coding (Dolphin)';
    } else {
      recommendedFor = 'Uncensored';
    }
  } else if (model.id.includes(':free')) {
    recommendedFor = 'Free';
  } else if (model.id.includes('coder') || model.id.includes('code')) {
    recommendedFor = 'Coding';
  } else if (model.id.includes('chat')) {
    recommendedFor = 'Chat';
  }

  return {
    id: model.id,
    recommendedFor,
    provider: 'OpenRouter',
    score: Math.round(model.score),
  };
}
