/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelInfo } from '@google/gemini-cli-core';

interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
  lastUpdated: number;
}

interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export class PricingService {
  private static instance: PricingService;
  private pricingCache: Map<string, ModelPricing> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Fallback pricing for common models (in dollars per 1k tokens)
  private readonly fallbackPricing: Record<string, Omit<ModelPricing, 'lastUpdated'>> = {
    // Gemini models (typically free or very low cost)
    'gemini-2.5-pro': { inputPer1k: 0, outputPer1k: 0 },
    'gemini-2.5-flash': { inputPer1k: 0, outputPer1k: 0 },
    'gemini-1.5-pro': { inputPer1k: 0, outputPer1k: 0 },
    'gemini-1.5-flash': { inputPer1k: 0, outputPer1k: 0 },
    
    // OpenRouter models
    'openai/gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
    'openai/gpt-4': { inputPer1k: 0.03, outputPer1k: 0.06 },
    'openai/gpt-3.5-turbo': { inputPer1k: 0.0005, outputPer1k: 0.0015 },
    'anthropic/claude-3-opus': { inputPer1k: 0.015, outputPer1k: 0.075 },
    'anthropic/claude-3-sonnet': { inputPer1k: 0.003, outputPer1k: 0.015 },
    'anthropic/claude-3-haiku': { inputPer1k: 0.00025, outputPer1k: 0.00125 },
    'deepseek/deepseek-chat': { inputPer1k: 0.0003, outputPer1k: 0.00085 },
    'deepseek/deepseek-coder': { inputPer1k: 0.0003, outputPer1k: 0.00085 },
    'mistralai/mistral-large': { inputPer1k: 0.002, outputPer1k: 0.006 },
  };

  private constructor() {}

  static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  /**
   * Update pricing information from model discovery
   */
  updatePricing(models: ModelInfo[]): void {
    for (const model of models) {
      if (model.pricing?.inputPer1k !== undefined && model.pricing?.outputPer1k !== undefined) {
        this.pricingCache.set(model.id, {
          inputPer1k: model.pricing.inputPer1k,
          outputPer1k: model.pricing.outputPer1k,
          lastUpdated: Date.now(),
        });
      }
    }
  }

  /**
   * Get pricing for a specific model
   */
  getPricing(modelId: string): ModelPricing | null {
    // Check cache first
    const cached = this.pricingCache.get(modelId);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    // Check fallback pricing
    const fallback = this.fallbackPricing[modelId];
    if (fallback) {
      return {
        ...fallback,
        lastUpdated: Date.now(),
      };
    }

    // No pricing available
    return null;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): CostCalculation | null {
    const pricing = this.getPricing(modelId);
    if (!pricing) {
      return null;
    }

    // Convert from per 1k to actual cost
    const inputCost = (inputTokens * pricing.inputPer1k) / 1000;
    const outputCost = (outputTokens * pricing.outputPer1k) / 1000;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
    };
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    if (cost === 0) {
      return 'Free';
    }
    if (cost < 0.0001) {
      return '<$0.0001';
    }
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`;
    }
    if (cost < 1) {
      return `$${cost.toFixed(3)}`;
    }
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Clear the pricing cache
   */
  clearCache(): void {
    this.pricingCache.clear();
  }
}