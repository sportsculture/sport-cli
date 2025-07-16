/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL, DEFAULT_CUSTOM_API_MODEL } from '../config/models.js';
import { getEffectiveModel } from './modelCheck.js';
import { OpenRouterContentGenerator } from '../providers/openRouterContentGenerator.js';
import { CustomApiContentGenerator } from '../providers/customApiContentGenerator.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  USE_OPENROUTER = 'openrouter',
  USE_CUSTOM_API = 'custom-api',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  customEndpoint?: string;
  customHeaders?: Record<string, string>;
};

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
  config?: { getModel?: () => string },
): Promise<ContentGeneratorConfig> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const customApiKey = process.env.CUSTOM_API_KEY;
  const customApiEndpoint = process.env.CUSTOM_API_ENDPOINT;

  // Use runtime model from config if available, otherwise fallback to parameter or default
  let defaultModel = DEFAULT_GEMINI_MODEL;
  if (authType === AuthType.USE_OPENROUTER) {
    defaultModel = DEFAULT_OPENROUTER_MODEL;
  } else if (authType === AuthType.USE_CUSTOM_API) {
    defaultModel = DEFAULT_CUSTOM_API_MODEL;
  }
  
  // For OpenRouter and Custom API, prefer the model parameter over config
  let effectiveModel: string;
  if (authType === AuthType.USE_OPENROUTER || authType === AuthType.USE_CUSTOM_API) {
    effectiveModel = model || defaultModel;
  } else {
    effectiveModel = config?.getModel?.() || model || defaultModel;
  }

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
  };

  // if we are using google auth nothing else to validate for now
  if (authType === AuthType.LOGIN_WITH_GOOGLE) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    !!googleApiKey &&
    googleCloudProject &&
    googleCloudLocation
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_OPENROUTER && openRouterApiKey) {
    contentGeneratorConfig.apiKey = openRouterApiKey;
    // OpenRouter models don't need validation
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_CUSTOM_API && customApiKey && customApiEndpoint) {
    contentGeneratorConfig.apiKey = customApiKey;
    contentGeneratorConfig.customEndpoint = customApiEndpoint;
    // Custom API models don't need validation
    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  if (config.authType === AuthType.LOGIN_WITH_GOOGLE) {
    return createCodeAssistContentGenerator(
      httpOptions,
      config.authType,
      sessionId,
    );
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });

    return googleGenAI.models;
  }

  if (config.authType === AuthType.USE_OPENROUTER) {
    return new OpenRouterContentGenerator(config);
  }

  if (config.authType === AuthType.USE_CUSTOM_API) {
    return new CustomApiContentGenerator(config);
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
