/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { PluginLoader } from './loader.js';
import { PluginExecutor } from './executor.js';
import {
  SportCliPlugin,
  PluginLoadOptions,
  ShellResult,
  HistoryEntry,
  PluginMetrics,
} from './types.js';

/**
 * Central plugin management system
 */
export class PluginManager {
  private loader: PluginLoader;
  private executor: PluginExecutor;
  private config: Config;
  private plugins: Map<string, SportCliPlugin> = new Map();
  private initialized = false;

  constructor(config: Config) {
    this.config = config;
    this.loader = new PluginLoader(config);
    this.executor = new PluginExecutor(config);
  }

  /**
   * Initialize the plugin system
   */
  async initialize(options: PluginLoadOptions = {}): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing plugin system...');

    // Load all plugins
    this.plugins = await this.loader.loadAll(options);

    console.log(`Loaded ${this.plugins.size} plugins`);
    this.initialized = true;
  }

  /**
   * Execute beforeShellExecute hooks
   */
  async beforeShellExecute(command: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.executor.executeHookChain(
      Array.from(this.plugins.values()),
      'beforeShellExecute',
      command,
    );
  }

  /**
   * Execute afterShellExecute hooks
   */
  async afterShellExecute(result: ShellResult): Promise<ShellResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.executor.executeHookChain(
      Array.from(this.plugins.values()),
      'afterShellExecute',
      result,
    );
  }

  /**
   * Execute onConfigLoad hooks
   */
  async onConfigLoad(config: Config): Promise<Config> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.executor.executeHookChain(
      Array.from(this.plugins.values()),
      'onConfigLoad',
      config,
    );
  }

  /**
   * Execute onHistoryWrite hooks
   */
  async onHistoryWrite(entry: HistoryEntry): Promise<HistoryEntry> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Add plugin names to history entry
    entry.plugins = Array.from(this.plugins.keys());

    return this.executor.executeHookChain(
      Array.from(this.plugins.values()),
      'onHistoryWrite',
      entry,
    );
  }

  /**
   * Get list of loaded plugins
   */
  listPlugins(): Array<{
    name: string;
    version: string;
    description?: string;
    hooks: string[];
  }> {
    return Array.from(this.plugins.values()).map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      hooks: Object.keys(plugin.hooks).filter(
        (k) => plugin.hooks[k as keyof typeof plugin.hooks],
      ),
    }));
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): SportCliPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Reload a specific plugin
   */
  async reloadPlugin(name: string): Promise<void> {
    await this.loader.unloadPlugin(name);
    // Re-initialize to reload all plugins and resolve dependencies
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    plugins: Array<{ name: string; metrics: PluginMetrics }>;
    slowPlugins: PluginMetrics[];
  } {
    const allMetrics = this.executor.getAllMetrics();
    const slowPlugins = this.executor.getSlowPlugins();

    return {
      plugins: Array.from(allMetrics.entries()).map(([name, metrics]) => ({
        name,
        metrics,
      })),
      slowPlugins,
    };
  }

  /**
   * Enable/disable a plugin temporarily
   */
  async togglePlugin(name: string, enabled: boolean): Promise<void> {
    if (enabled) {
      // Re-add if it was removed
      const plugin = this.loader.getPlugin(name);
      if (plugin) {
        this.plugins.set(name, plugin);
      }
    } else {
      // Temporarily remove from active plugins
      this.plugins.delete(name);
    }
  }

  /**
   * Check if plugin system is ready
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
