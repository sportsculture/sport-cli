/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';

export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Popular OpenRouter models
export const OPENROUTER_MODELS = {
  'claude-3-sonnet': 'anthropic/claude-3-sonnet',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'gpt-4': 'openai/gpt-4',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'deepseek-chat': 'deepseek/deepseek-chat',
  'deepseek-coder': 'deepseek/deepseek-coder',
  'mixtral-8x7b': 'mistralai/mixtral-8x7b',
  'llama-3-70b': 'meta-llama/llama-3-70b',
};

export const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-chat';
export const DEFAULT_CUSTOM_API_MODEL = 'deepseek-v3';
