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
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL, DEFAULT_CUSTOM_API_MODEL } from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { UserTierId } from '../code_assist/types.js';
import { OpenRouterContentGenerator } from '../providers/openRouterContentGenerator.js';
import { CustomApiContentGenerator } from '../providers/customApiContentGenerator.js';
import { GeminiContentGenerator } from '../providers/geminiContentGenerator.js';
import { IProvider } from '../providers/types.js';

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

  getTier?(): Promise<UserTierId | undefined>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  USE_OPENROUTER = 'openrouter',
  USE_CUSTOM_API = 'custom-api',
  USE_ZEN_MCP = 'zen-mcp',
  USE_TASK_MASTER_MCP = 'task-master-mcp',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  customEndpoint?: string;
  customHeaders?: Record<string, string>;
  proxy?: string | undefined;
};

export function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): ContentGeneratorConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
  const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const customApiKey = process.env.CUSTOM_API_KEY;
  const customApiEndpoint = process.env.CUSTOM_API_ENDPOINT;

  // Determine the default model based on auth type
  let defaultModel = DEFAULT_GEMINI_MODEL;
  if (authType === AuthType.USE_OPENROUTER) {
    defaultModel = DEFAULT_OPENROUTER_MODEL;
  } else if (authType === AuthType.USE_CUSTOM_API) {
    defaultModel = DEFAULT_CUSTOM_API_MODEL;
  }
  
  // Use runtime model from config if available, otherwise fallback to default
  const effectiveModel = config.getModel() || defaultModel;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
    proxy: config?.getProxy(),
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
      contentGeneratorConfig.proxy,
    );

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

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
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    return createCodeAssistContentGenerator(
      httpOptions,
      config.authType,
      gcConfig,
      sessionId,
    );
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    return new GeminiContentGenerator(config);
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

export function isProvider(generator: ContentGenerator): generator is IProvider {
  return (
    'getAvailableModels' in generator &&
    'checkConfiguration' in generator &&
    'getProviderName' in generator
  );
}
