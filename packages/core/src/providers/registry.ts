/**
 * Provider Registry System
 *
 * This plugin-style architecture allows for easy addition of new providers
 * without modifying core code, minimizing merge conflicts with upstream.
 */

import {
  ContentGenerator,
  ContentGeneratorConfig,
  AuthType,
} from '../core/contentGenerator.js';
import { IProvider, ProviderStatus, ModelInfo } from './types.js';
import { Config } from '../config/config.js';

/**
 * Provider factory function type
 */
export type ProviderFactory = (
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
) => Promise<IProvider>;

/**
 * Provider metadata for registration
 */
export interface ProviderMetadata {
  /** Unique identifier for the provider */
  id: string;
  /** Display name */
  name: string;
  /** Description of the provider */
  description: string;
  /** AuthType enum value */
  authType: AuthType;
  /** Environment variables required */
  requiredEnvVars: string[];
  /** Optional environment variables */
  optionalEnvVars?: string[];
  /** Factory function to create provider instances */
  factory: ProviderFactory;
  /** Whether this provider is enabled by default */
  enabledByDefault: boolean;
  /** Configuration instructions */
  configInstructions: string;
}

/**
 * Singleton provider registry
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<AuthType, ProviderMetadata>();
  private initialized = false;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider
   */
  register(metadata: ProviderMetadata): void {
    this.providers.set(metadata.authType, metadata);
  }

  /**
   * Unregister a provider (useful for testing)
   */
  unregister(authType: AuthType): void {
    this.providers.delete(authType);
  }

  /**
   * Get all registered providers
   */
  getProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers based on configuration
   */
  getEnabledProviders(): ProviderMetadata[] {
    return this.getProviders().filter((provider) => {
      // Check if provider is explicitly disabled
      const isDisabled =
        process.env[`DISABLE_${provider.id.toUpperCase()}_PROVIDER`] === 'true';
      if (isDisabled) return false;

      // Check if it's enabled by default or has required configuration
      if (provider.enabledByDefault) return true;

      // Check if required environment variables are set
      return provider.requiredEnvVars.every((envVar) => process.env[envVar]);
    });
  }

  /**
   * Get provider metadata by auth type
   */
  getProvider(authType: AuthType): ProviderMetadata | undefined {
    return this.providers.get(authType);
  }

  /**
   * Create a provider instance
   */
  async createProvider(
    authType: AuthType,
    config: ContentGeneratorConfig,
    gcConfig: Config,
    sessionId?: string,
  ): Promise<IProvider> {
    const metadata = this.providers.get(authType);
    if (!metadata) {
      throw new Error(`Unknown provider auth type: ${authType}`);
    }

    return metadata.factory(config, gcConfig, sessionId);
  }

  /**
   * Check configuration status for all providers
   */
  async checkAllConfigurations(): Promise<Map<string, ProviderStatus>> {
    const results = new Map<string, ProviderStatus>();

    for (const metadata of this.getProviders()) {
      const status = await this.checkProviderConfiguration(metadata);
      results.set(metadata.id, status);
    }

    return results;
  }

  /**
   * Check configuration for a specific provider
   */
  private async checkProviderConfiguration(
    metadata: ProviderMetadata,
  ): Promise<ProviderStatus> {
    // Check required environment variables
    const missingVars = metadata.requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );

    if (missingVars.length > 0) {
      return {
        isConfigured: false,
        errorMessage: `Missing required environment variables: ${missingVars.join(', ')}`,
        configInstructions: metadata.configInstructions,
      };
    }

    return {
      isConfigured: true,
    };
  }

  /**
   * Initialize the registry with default providers
   * This is called automatically when needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Import providers dynamically to avoid circular dependencies
    const { registerGeminiProvider } = await import('./gemini.registry.js');
    const { registerOpenRouterProvider } = await import(
      './openrouter.registry.js'
    );
    const { registerCustomApiProvider } = await import(
      './customapi.registry.js'
    );

    // Register default providers
    registerGeminiProvider(this);
    registerOpenRouterProvider(this);
    registerCustomApiProvider(this);

    // Allow external provider registration via a hook
    await this.loadExternalProviders();

    this.initialized = true;
  }

  /**
   * Load external providers from a configuration file or directory
   */
  private async loadExternalProviders(): Promise<void> {
    // Check for external provider configuration
    const externalProvidersPath = process.env.SPORT_CLI_PROVIDERS_PATH;
    if (!externalProvidersPath) return;

    try {
      // This would load external provider modules
      // For now, we'll just log that we checked
      console.debug(
        `Checking for external providers at: ${externalProvidersPath}`,
      );
    } catch (error) {
      console.warn('Failed to load external providers:', error);
    }
  }

  /**
   * Get a summary of all available models across providers
   */
  async getAllAvailableModels(gcConfig: Config): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];

    for (const metadata of this.getEnabledProviders()) {
      try {
        const config: ContentGeneratorConfig = {
          model: '', // Will be set by provider
          authType: metadata.authType,
        };

        const provider = await this.createProvider(
          metadata.authType,
          config,
          gcConfig,
        );

        const models = await provider.getAvailableModels();
        allModels.push(...models);
      } catch (error) {
        console.debug(`Failed to get models from ${metadata.name}:`, error);
      }
    }

    return allModels;
  }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();
