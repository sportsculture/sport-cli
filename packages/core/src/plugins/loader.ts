/**
 * @license
 * Copyright 2025 SportsCulture (modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Config } from '../config/config.js';
import {
  SportCliPlugin,
  PluginLoadOptions,
  PluginError,
  PluginDependency,
  PluginMetrics,
  PluginPermission,
} from './types.js';

/**
 * Plugin loader with dependency resolution and validation
 */
export class PluginLoader {
  private loadedPlugins = new Map<string, SportCliPlugin>();
  private loadMetrics = new Map<string, PluginMetrics>();
  private config: Config;

  // Default plugin search paths
  private defaultPaths = [
    path.join(process.cwd(), '.sport', 'plugins'),
    path.join(process.env.HOME || '', '.sport', 'plugins'),
    path.join(__dirname, '..', '..', 'plugins'), // Built-in plugins
  ];

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Load all plugins from configured paths
   */
  async loadAll(
    options: PluginLoadOptions = {},
  ): Promise<Map<string, SportCliPlugin>> {
    const paths = options.paths || this.defaultPaths;
    const loadPromises: Promise<void>[] = [];

    // Use async generator for streaming load updates
    for await (const pluginPath of this.discoverPlugins(paths)) {
      loadPromises.push(this.loadPlugin(pluginPath, options));
    }

    await Promise.all(loadPromises);

    // Resolve dependencies after all plugins are loaded
    await this.resolveDependencies(options.strict || false);

    // Sort by priority if configured
    return this.sortByPriority();
  }

  /**
   * Discover plugin directories
   */
  async *discoverPlugins(searchPaths: string[]): AsyncGenerator<string> {
    for (const searchPath of searchPaths) {
      try {
        const stat = await fs.stat(searchPath);
        if (!stat.isDirectory()) continue;

        const entries = await fs.readdir(searchPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pluginPath = path.join(searchPath, entry.name);
            const hasIndex =
              (await this.fileExists(path.join(pluginPath, 'index.js'))) ||
              (await this.fileExists(path.join(pluginPath, 'index.ts')));

            if (hasIndex) {
              yield pluginPath;
            }
          }
        }
      } catch (error) {
        // Ignore missing directories
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`Error scanning plugin path ${searchPath}:`, error);
        }
      }
    }
  }

  /**
   * Load a single plugin
   */
  private async loadPlugin(
    pluginPath: string,
    options: PluginLoadOptions,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Dynamic import
      const moduleUrl = pathToFileURL(path.join(pluginPath, 'index.js')).href;

      const module = await import(moduleUrl);
      const plugin: SportCliPlugin = module.default || module;

      // Validate plugin structure
      this.validatePlugin(plugin);

      // Check permissions if strict mode
      if (options.strict) {
        this.checkPermissions(plugin);
      }

      // Initialize plugin
      if (plugin.onLoad) {
        await plugin.onLoad();
      }

      // Store plugin and metrics
      this.loadedPlugins.set(plugin.name, plugin);
      this.loadMetrics.set(plugin.name, {
        name: plugin.name,
        loadTime: Date.now() - startTime,
        executionTimes: new Map(),
        errorCount: 0,
      });

      console.log(`Loaded plugin: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
      if (options.strict) {
        throw new PluginError(
          `Failed to load plugin: ${(error as Error).message}`,
          pluginPath,
        );
      }
    }
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: any): asserts plugin is SportCliPlugin {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a name property');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a version property');
    }

    if (!plugin.hooks || typeof plugin.hooks !== 'object') {
      throw new Error('Plugin must have a hooks object');
    }
  }

  /**
   * Check plugin permissions
   */
  private checkPermissions(plugin: SportCliPlugin): void {
    // TODO: Implement permission checking based on config
    // For now, allow all permissions until we add plugin config to Config class
    const allowedPermissions = Object.values(PluginPermission);
    const requiredPermissions = plugin.permissions || [];

    for (const permission of requiredPermissions) {
      if (!allowedPermissions.includes(permission)) {
        throw new PluginError(
          `Plugin requires permission: ${permission}`,
          plugin.name,
        );
      }
    }
  }

  /**
   * Resolve plugin dependencies
   */
  private async resolveDependencies(strict: boolean): Promise<void> {
    for (const [name, plugin] of this.loadedPlugins) {
      if (!plugin.dependencies) continue;

      for (const dep of plugin.dependencies) {
        const loaded = this.loadedPlugins.get(dep.name);

        if (!loaded && !dep.optional) {
          const message = `Plugin ${name} requires ${dep.name}`;
          if (strict) {
            throw new PluginError(message, name);
          } else {
            console.warn(message);
          }
        }

        if (loaded && !this.satisfiesVersion(loaded.version, dep.version)) {
          const message = `Plugin ${name} requires ${dep.name}@${dep.version} but ${loaded.version} is loaded`;
          if (strict) {
            throw new PluginError(message, name);
          } else {
            console.warn(message);
          }
        }
      }
    }
  }

  /**
   * Simple version checking (can be enhanced with semver)
   */
  private satisfiesVersion(actual: string, required: string): boolean {
    // Simple implementation - enhance with semver for production
    if (required === '*' || required === 'latest') return true;

    if (required.startsWith('^')) {
      // Major version must match
      const requiredMajor = required.slice(1).split('.')[0];
      const actualMajor = actual.split('.')[0];
      return requiredMajor === actualMajor;
    }

    return actual === required;
  }

  /**
   * Sort plugins by priority
   */
  private sortByPriority(): Map<string, SportCliPlugin> {
    // TODO: Add plugin priority configuration to Config class
    const priorities: Record<string, number> = {};
    const sorted = new Map<string, SportCliPlugin>();

    // Sort entries by priority (higher number = higher priority)
    const entries = Array.from(this.loadedPlugins.entries());
    entries.sort(([nameA], [nameB]) => {
      const priorityA = priorities[nameA] || 0;
      const priorityB = priorities[nameB] || 0;
      return priorityB - priorityA;
    });

    for (const [name, plugin] of entries) {
      sorted.set(name, plugin);
    }

    return sorted;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get loaded plugins
   */
  getPlugins(): Map<string, SportCliPlugin> {
    return new Map(this.loadedPlugins);
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): SportCliPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) return;

    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    this.loadedPlugins.delete(name);
    this.loadMetrics.delete(name);
  }

  /**
   * Get load metrics
   */
  getLoadMetrics(): Map<string, PluginMetrics> {
    return new Map(this.loadMetrics);
  }
}
