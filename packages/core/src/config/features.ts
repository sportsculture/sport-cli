/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Feature Flags System for sport-cli
 *
 * This allows us to:
 * 1. Gradually roll out new features
 * 2. Disable features that might conflict with upstream
 * 3. A/B test functionality
 * 4. Provide different feature sets for different environments
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { BRANDING } from './branding.js';

/**
 * Feature flag definitions
 */
export interface FeatureFlags {
  /** Enable multi-provider support */
  multiProvider: boolean;

  /** Enable custom commands (/model, /models) */
  customCommands: boolean;

  /** Enable advanced memory/context features */
  advancedMemory: boolean;

  /** Enable provider plugin system */
  providerPlugins: boolean;

  /** Enable backward compatibility features */
  backwardCompat: boolean;

  /** Enable experimental features */
  experimental: boolean;

  /** Enable debug logging */
  debugLogging: boolean;

  /** Enable telemetry */
  telemetry: boolean;

  /** Enable auto-update checks */
  autoUpdate: boolean;

  /** Enable upstream sync notifications */
  upstreamNotifications: boolean;
}

/**
 * Default feature flags
 */
const DEFAULT_FLAGS: FeatureFlags = {
  multiProvider: true,
  customCommands: true,
  advancedMemory: false,
  providerPlugins: true,
  backwardCompat: true,
  experimental: false,
  debugLogging: process.env.DEBUG === 'true',
  telemetry: true,
  autoUpdate: false,
  upstreamNotifications: true,
};

/**
 * Feature flag sources in priority order
 */
enum FlagSource {
  ENVIRONMENT = 'environment',
  USER_CONFIG = 'user_config',
  PROJECT_CONFIG = 'project_config',
  DEFAULT = 'default',
}

/**
 * Feature flags manager
 */
class FeatureFlagsManager {
  private flags: FeatureFlags;
  private sources: Map<keyof FeatureFlags, FlagSource> = new Map();

  constructor() {
    this.flags = this.loadFlags();
  }

  /**
   * Load flags from all sources
   */
  private loadFlags(): FeatureFlags {
    // Start with defaults
    let flags = { ...DEFAULT_FLAGS };

    // Load from project config
    const projectFlags = this.loadProjectFlags();
    flags = { ...flags, ...projectFlags };
    this.updateSources(projectFlags, FlagSource.PROJECT_CONFIG);

    // Load from user config
    const userFlags = this.loadUserFlags();
    flags = { ...flags, ...userFlags };
    this.updateSources(userFlags, FlagSource.USER_CONFIG);

    // Override with environment variables
    const envFlags = this.loadEnvironmentFlags();
    flags = { ...flags, ...envFlags };
    this.updateSources(envFlags, FlagSource.ENVIRONMENT);

    return flags;
  }

  /**
   * Load flags from environment variables
   */
  private loadEnvironmentFlags(): Partial<FeatureFlags> {
    const flags: Partial<FeatureFlags> = {};

    // Map of environment variable names to flag names
    const envMap: Record<string, keyof FeatureFlags> = {
      SPORT_FF_MULTI_PROVIDER: 'multiProvider',
      SPORT_FF_CUSTOM_COMMANDS: 'customCommands',
      SPORT_FF_ADVANCED_MEMORY: 'advancedMemory',
      SPORT_FF_PROVIDER_PLUGINS: 'providerPlugins',
      SPORT_FF_BACKWARD_COMPAT: 'backwardCompat',
      SPORT_FF_EXPERIMENTAL: 'experimental',
      SPORT_FF_DEBUG_LOGGING: 'debugLogging',
      SPORT_FF_TELEMETRY: 'telemetry',
      SPORT_FF_AUTO_UPDATE: 'autoUpdate',
      SPORT_FF_UPSTREAM_NOTIFICATIONS: 'upstreamNotifications',
    };

    for (const [envVar, flagName] of Object.entries(envMap)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        flags[flagName] = value === 'true';
      }
    }

    return flags;
  }

  /**
   * Load flags from user config file
   */
  private loadUserFlags(): Partial<FeatureFlags> {
    const configPath = join(homedir(), BRANDING.configDir, 'features.json');
    return this.loadFlagsFromFile(configPath);
  }

  /**
   * Load flags from project config file
   */
  private loadProjectFlags(): Partial<FeatureFlags> {
    const configPath = join(process.cwd(), BRANDING.configDir, 'features.json');
    return this.loadFlagsFromFile(configPath);
  }

  /**
   * Load flags from a JSON file
   */
  private loadFlagsFromFile(path: string): Partial<FeatureFlags> {
    if (!existsSync(path)) {
      return {};
    }

    try {
      const content = readFileSync(path, 'utf-8');
      const config = JSON.parse(content);
      return config.features || {};
    } catch (error) {
      console.warn(`Failed to load feature flags from ${path}:`, error);
      return {};
    }
  }

  /**
   * Update source tracking
   */
  private updateSources(
    flags: Partial<FeatureFlags>,
    source: FlagSource,
  ): void {
    for (const key of Object.keys(flags) as Array<keyof FeatureFlags>) {
      this.sources.set(key, source);
    }
  }

  /**
   * Get current feature flags
   */
  getFlags(): Readonly<FeatureFlags> {
    return Object.freeze({ ...this.flags });
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  /**
   * Get the source of a feature flag
   */
  getSource(feature: keyof FeatureFlags): FlagSource {
    return this.sources.get(feature) || FlagSource.DEFAULT;
  }

  /**
   * Override a feature flag (for testing)
   */
  override(feature: keyof FeatureFlags, value: boolean): void {
    this.flags[feature] = value;
    this.sources.set(feature, FlagSource.ENVIRONMENT);
  }

  /**
   * Reset all overrides
   */
  reset(): void {
    this.flags = this.loadFlags();
  }

  /**
   * Get feature flags summary for debugging
   */
  getSummary(): string {
    const lines: string[] = ['Feature Flags Summary:'];

    for (const [key, value] of Object.entries(this.flags)) {
      const source =
        this.sources.get(key as keyof FeatureFlags) || FlagSource.DEFAULT;
      const status = value ? '✓' : '✗';
      lines.push(`  ${status} ${key}: ${value} (${source})`);
    }

    return lines.join('\n');
  }
}

// Singleton instance
let instance: FeatureFlagsManager;

/**
 * Get feature flags manager instance
 */
export function getFeatureFlags(): FeatureFlagsManager {
  if (!instance) {
    instance = new FeatureFlagsManager();
  }
  return instance;
}

/**
 * Quick helper to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags().isEnabled(feature);
}

/**
 * Feature flag React hook (for CLI components)
 */
export function useFeature(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Decorator to conditionally enable features
 */
export function requiresFeature(feature: keyof FeatureFlags) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      if (!isFeatureEnabled(feature)) {
        throw new Error(`Feature "${feature}" is not enabled`);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Sample features.json configuration file
 */
export const SAMPLE_FEATURES_CONFIG = `{
  "features": {
    "multiProvider": true,
    "customCommands": true,
    "advancedMemory": false,
    "providerPlugins": true,
    "backwardCompat": true,
    "experimental": false,
    "debugLogging": false,
    "telemetry": true,
    "autoUpdate": false,
    "upstreamNotifications": true
  }
}`;
