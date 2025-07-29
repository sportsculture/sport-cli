/**
 * Provider Factory using the Registry System
 * 
 * This replaces the switch statement in contentGenerator.ts with a
 * plugin-based approach that's easier to maintain and extend.
 */

import { ContentGenerator, ContentGeneratorConfig, AuthType } from '../core/contentGenerator.js';
import { Config } from '../config/config.js';
import { providerRegistry } from './registry.js';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';

/**
 * Create a content generator using the provider registry
 */
export async function createProviderContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  // Initialize registry if needed
  await providerRegistry.initialize();

  // Handle special cases that aren't providers
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    const httpOptions = config.proxy ? { proxy: config.proxy } : undefined;
    return createCodeAssistContentGenerator(
      gcConfig,
      httpOptions,
      config.model,
      config.userTier,
      sessionId,
    );
  }

  // Use registry for all provider-based auth types
  try {
    return await providerRegistry.createProvider(
      config.authType!,
      config,
      gcConfig,
      sessionId
    );
  } catch (error) {
    throw new Error(
      `Error creating contentGenerator: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all available providers from the registry
 */
export async function getAvailableProviders() {
  await providerRegistry.initialize();
  return providerRegistry.getEnabledProviders();
}

/**
 * Check configuration status for all providers
 */
export async function checkAllProviderConfigurations() {
  await providerRegistry.initialize();
  return providerRegistry.checkAllConfigurations();
}