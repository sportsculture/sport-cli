/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Models } from '@google/genai';
import { ContentGeneratorConfig } from '../core/contentGenerator.js';
import { IProvider, ModelInfo, ProviderStatus } from './types.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';

/**
 * Wrapper for GoogleGenAI that implements IProvider interface
 */
export class GeminiContentGenerator implements IProvider {
  private googleGenAI: GoogleGenAI;
  private models: Models;
  private apiKey?: string;

  constructor(config: ContentGeneratorConfig) {
    this.apiKey = config.apiKey;
    this.googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
    });
    this.models = this.googleGenAI.models;
  }

  // Delegate all ContentGenerator methods to the models instance
  async generateContent(...args: Parameters<Models['generateContent']>) {
    return this.models.generateContent(...args);
  }

  async generateContentStream(...args: Parameters<Models['generateContentStream']>) {
    return this.models.generateContentStream(...args);
  }

  async countTokens(...args: Parameters<Models['countTokens']>) {
    return this.models.countTokens(...args);
  }

  async embedContent(...args: Parameters<Models['embedContent']>) {
    return this.models.embedContent(...args);
  }

  async getTier() {
    // The getTier method might not exist on all Models implementations
    if ('getTier' in this.models && typeof this.models.getTier === 'function') {
      return this.models.getTier();
    }
    return undefined;
  }

  // IProvider implementation
  async getAvailableModels(): Promise<ModelInfo[]> {
    // Gemini doesn't have an API to list models dynamically, so we return a static list
    const models: ModelInfo[] = [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'Gemini',
        isDefault: true,
        description: 'Advanced reasoning model with 1M context window',
        capabilities: {
          contextWindow: 1000000,
          supportsFunctions: true,
          supportsStreaming: true,
          strengths: ['Advanced reasoning', 'Large context', 'Multi-modal'],
        },
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'Gemini',
        isDefault: false,
        description: 'Fast responses with 1M context window',
        capabilities: {
          contextWindow: 1000000,
          supportsFunctions: true,
          supportsStreaming: true,
          strengths: ['Fast responses', 'Cost-effective', 'Large context'],
        },
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Gemini',
        isDefault: false,
        description: 'Previous generation model with 2M context window',
        capabilities: {
          contextWindow: 2000000,
          supportsFunctions: true,
          supportsStreaming: true,
          strengths: ['Largest context window', 'Stable', 'Multi-modal'],
        },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'Gemini',
        isDefault: false,
        description: 'Previous generation fast model',
        capabilities: {
          contextWindow: 1000000,
          supportsFunctions: true,
          supportsStreaming: true,
          strengths: ['Fast', 'Efficient', 'Good for simple tasks'],
        },
      },
    ];

    return models;
  }

  async checkConfiguration(): Promise<ProviderStatus> {
    if (!this.apiKey) {
      return {
        isConfigured: false,
        errorMessage: 'No API key configured',
        configInstructions: 'Set GEMINI_API_KEY environment variable with your Gemini API key from https://aistudio.google.com/apikey',
      };
    }

    try {
      // Try to count tokens for a simple message to verify the API key
      await this.models.countTokens({
        model: DEFAULT_GEMINI_MODEL,
        contents: 'test',
      });

      return {
        isConfigured: true,
      };
    } catch (error: any) {
      if (error.message?.includes('API_KEY_INVALID')) {
        return {
          isConfigured: false,
          errorMessage: 'Invalid API key',
          configInstructions: 'Check your GEMINI_API_KEY is valid at https://aistudio.google.com/apikey',
        };
      }

      return {
        isConfigured: false,
        errorMessage: `Configuration error: ${error.message}`,
        configInstructions: 'Ensure GEMINI_API_KEY is set correctly',
      };
    }
  }

  getProviderName(): string {
    return 'Gemini';
  }
}