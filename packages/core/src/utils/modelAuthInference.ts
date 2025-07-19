/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '../core/contentGenerator.js';

/**
 * Infers the appropriate AuthType based on the model ID.
 * This function helps determine which provider to use when starting
 * the CLI with a --model flag for non-Gemini models.
 */
export function inferAuthTypeFromModel(modelId: string): AuthType | undefined {
  // Normalize the model ID to lowercase for comparison
  const normalizedModel = modelId.toLowerCase();

  // Gemini models
  if (
    normalizedModel.startsWith('gemini') ||
    normalizedModel.startsWith('models/gemini')
  ) {
    return AuthType.USE_GEMINI;
  }

  // OpenRouter models - check for known provider prefixes
  const openRouterPrefixes = [
    'openai/',
    'anthropic/',
    'meta-llama/',
    'mistralai/',
    'google/',
    'meta/',
    'microsoft/',
    'nousresearch/',
    'phind/',
    'intel/',
    'nvidia/',
    'qwen/',
    'deepseek/',
    'databricks/',
    'cohere/',
    'moonshotai/',
    'yi/',
    'cognitivecomputations/',
    'openchat/',
    'inflection/',
    'xai/',
    'grok-',
    'grok2-',
    'wizardlm/',
    'teknium/',
    'ai21/',
    'claude-',
    'gpt-',
    'llama-',
    'mixtral-',
    'palm-',
    'command-',
  ];

  for (const prefix of openRouterPrefixes) {
    if (normalizedModel.startsWith(prefix)) {
      return AuthType.USE_OPENROUTER;
    }
  }

  // Check for models that contain certain patterns
  const openRouterPatterns = [
    '/gpt-',
    '/claude-',
    '/llama-',
    '/mixtral-',
    '/command-',
    '/palm-',
  ];

  for (const pattern of openRouterPatterns) {
    if (normalizedModel.includes(pattern)) {
      return AuthType.USE_OPENROUTER;
    }
  }

  // If we can't determine the auth type, return undefined
  // This will allow the system to fall back to default behavior
  return undefined;
}

/**
 * Checks if a model ID is likely an OpenRouter model based on its format.
 * This is a more lenient check that can be used for validation.
 */
export function isLikelyOpenRouterModel(modelId: string): boolean {
  // OpenRouter models typically have a provider/model format
  return modelId.includes('/') && !modelId.startsWith('models/');
}

/**
 * Gets a human-readable provider name for a given auth type.
 */
export function getProviderNameForAuthType(authType: AuthType): string {
  switch (authType) {
    case AuthType.USE_GEMINI:
      return 'Gemini';
    case AuthType.USE_OPENROUTER:
      return 'OpenRouter';
    case AuthType.USE_CUSTOM_API:
      return 'Custom API';
    case AuthType.USE_VERTEX_AI:
      return 'Vertex AI';
    case AuthType.LOGIN_WITH_GOOGLE:
      return 'Google (OAuth)';
    case AuthType.CLOUD_SHELL:
      return 'Cloud Shell';
    default:
      return 'Unknown';
  }
}
