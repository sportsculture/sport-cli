/**
 * @license
 * Copyright 2025 SportsCulture (modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './types.js';
export * from './loader.js';
export * from './executor.js';
export * from './manager.js';

import { Config } from '../config/config.js';
import { PluginManager } from './manager.js';
import { PluginLoadOptions } from './types.js';

// Global plugin manager instance
let globalPluginManager: PluginManager | null = null;

/**
 * Initialize the global plugin manager
 */
export async function initializePlugins(
  config: Config,
  options?: PluginLoadOptions
): Promise<PluginManager> {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager(config);
    await globalPluginManager.initialize(options);
  }
  return globalPluginManager;
}

/**
 * Get the global plugin manager
 */
export function getPluginManager(): PluginManager | null {
  return globalPluginManager;
}

/**
 * Load all plugins with the given configuration
 */
export async function loadAll(
  config: Config,
  options?: PluginLoadOptions
): Promise<PluginManager> {
  return initializePlugins(config, options);
}