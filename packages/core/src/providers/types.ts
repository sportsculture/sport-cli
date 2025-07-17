/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContentGenerator } from '../core/contentGenerator.js';

/**
 * Model metadata for display in model listing
 */
export interface ModelInfo {
  /** Model identifier (e.g., 'gemini-2.5-pro', 'anthropic/claude-3-opus') */
  id: string;
  
  /** Human-readable name for display */
  name: string;
  
  /** Brief description of model capabilities */
  description?: string;
  
  /** Provider name (e.g., 'Gemini', 'OpenRouter', 'Custom API') */
  provider: string;
  
  /** Whether this is the default model for the provider */
  isDefault?: boolean;
  
  /** Model capabilities */
  capabilities?: {
    /** Maximum context window in tokens */
    contextWindow?: number;
    
    /** Whether the model supports function calling */
    supportsFunctions?: boolean;
    
    /** Whether the model supports streaming */
    supportsStreaming?: boolean;
    
    /** Model's strengths or use cases */
    strengths?: string[];
  };
  
  /** Pricing information (optional) */
  pricing?: {
    /** Cost per 1K input tokens in USD */
    inputPer1k?: number;
    
    /** Cost per 1K output tokens in USD */
    outputPer1k?: number;
    
    /** Pricing tier description (e.g., 'Free', 'Pro', 'Enterprise') */
    tier?: string;
  };
}

/**
 * Provider availability status
 */
export interface ProviderStatus {
  /** Whether the provider is configured with valid credentials */
  isConfigured: boolean;
  
  /** Error message if configuration is invalid */
  errorMessage?: string;
  
  /** Instructions for configuring the provider */
  configInstructions?: string;
}

/**
 * Extended provider interface with model discovery
 */
export interface IProvider extends ContentGenerator {
  /**
   * Get list of available models for this provider
   * @returns Array of model information
   */
  getAvailableModels(): Promise<ModelInfo[]>;
  
  /**
   * Check if the provider is properly configured
   * @returns Provider configuration status
   */
  checkConfiguration(): Promise<ProviderStatus>;
  
  /**
   * Get the provider's display name
   * @returns Human-readable provider name
   */
  getProviderName(): string;
}

/**
 * Type guard to check if a ContentGenerator implements IProvider
 */
export function isProvider(generator: ContentGenerator): generator is IProvider {
  return (
    'getAvailableModels' in generator &&
    'checkConfiguration' in generator &&
    'getProviderName' in generator
  );
}