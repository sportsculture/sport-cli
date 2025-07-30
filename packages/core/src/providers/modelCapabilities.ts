/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelCapability {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsSystemInstruction?: boolean;
  maxContextWindow?: number;
  supportedMimeTypes?: string[];
}

/**
 * Registry of known model capabilities.
 * This helps prevent API errors by not sending tools to models that don't support them.
 */
export class ModelCapabilityRegistry {
  private static instance: ModelCapabilityRegistry;
  private capabilities: Map<string, ModelCapability> = new Map();

  private constructor() {
    this.initializeKnownCapabilities();
  }

  static getInstance(): ModelCapabilityRegistry {
    if (!ModelCapabilityRegistry.instance) {
      ModelCapabilityRegistry.instance = new ModelCapabilityRegistry();
    }
    return ModelCapabilityRegistry.instance;
  }

  private initializeKnownCapabilities(): void {
    // OpenRouter models that support tools
    const openRouterToolsSupported = [
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-2.1',
      'anthropic/claude-2',
      'openai/gpt-4',
      'openai/gpt-4-turbo',
      'openai/gpt-4-32k',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-3.5-turbo',
      'x-ai/grok-3',
      'x-ai/grok-3-fast',
      'x-ai/grok-4',
      'google/gemini-pro',
      'google/gemini-pro-1.5',
      'mistralai/mistral-large',
      'mistralai/mistral-medium',
    ];

    // OpenRouter models that don't support tools
    const openRouterNoToolsSupport = [
      'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
      'mistralai/mixtral-8x7b',
      'meta-llama/llama-3-70b',
      'meta-llama/llama-3-8b',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-coder',
    ];

    // Register models with tool support
    for (const modelId of openRouterToolsSupported) {
      this.capabilities.set(modelId, {
        supportsTools: true,
        supportsStreaming: true,
      });
    }

    // Register models without tool support
    for (const modelId of openRouterNoToolsSupport) {
      this.capabilities.set(modelId, {
        supportsTools: false,
        supportsStreaming: true,
      });
    }

    // Gemini models all support tools
    const geminiModels = [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking-exp',
      'gemini-pro',
    ];

    for (const modelId of geminiModels) {
      this.capabilities.set(modelId, {
        supportsTools: true,
        supportsStreaming: true,
        supportsSystemInstruction: true,
      });
    }
  }

  /**
   * Check if a model supports tool/function calling
   */
  supportsTools(modelId: string): boolean {
    const capability = this.capabilities.get(modelId);

    // If we don't know about the model, check patterns
    if (!capability) {
      // OpenAI models generally support tools
      if (modelId.includes('gpt-4') || modelId.includes('gpt-3.5-turbo')) {
        return true;
      }

      // Claude models generally support tools
      if (modelId.includes('claude')) {
        return true;
      }

      // Gemini models support tools
      if (modelId.includes('gemini')) {
        return true;
      }

      // Default to false for unknown models
      return false;
    }

    return capability.supportsTools;
  }

  /**
   * Get full capabilities for a model
   */
  getCapabilities(modelId: string): ModelCapability | undefined {
    return this.capabilities.get(modelId);
  }

  /**
   * Register or update capabilities for a model
   */
  registerCapability(modelId: string, capability: ModelCapability): void {
    this.capabilities.set(modelId, capability);
  }

  /**
   * Check capabilities from API response and cache them
   */
  cacheFromApiError(modelId: string, error: string): void {
    // If we get a "No endpoints found that support tool use" error, cache that
    if (error.includes('No endpoints found that support tool use')) {
      this.registerCapability(modelId, {
        supportsTools: false,
        supportsStreaming: true,
      });
    }
  }
}
