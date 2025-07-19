/**
 * @license
 * Copyright 2025 SportsCulture (modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import {
  SportCliPlugin,
  HookContext,
  ErrorContext,
  PluginError,
  SportCliFatalError,
  PluginMetrics,
} from './types.js';

/**
 * Executes plugin hooks with error boundaries and metrics
 */
export class PluginExecutor {
  private metrics = new Map<string, PluginMetrics>();
  private config: Config;
  private timeout: number;

  constructor(config: Config, timeout = 5000) {
    this.config = config;
    this.timeout = timeout;
  }

  /**
   * Execute a hook on a single plugin with error boundary
   */
  async executeHook<T>(
    plugin: SportCliPlugin,
    hookName: keyof SportCliPlugin['hooks'],
    args: any[],
  ): Promise<T> {
    const startTime = Date.now();
    const context: HookContext = {
      pluginName: plugin.name,
      hookName,
      timestamp: startTime,
      config: this.config,
    };

    try {
      // Get the hook function
      const hook = plugin.hooks[hookName];
      if (!hook) {
        return args[0]; // Pass through if hook not implemented
      }

      // Execute hook based on its type
      let result: any;
      if (hookName === 'onError') {
        // Special handling for onError hook
        const errorContext: ErrorContext = {
          ...context,
          originalArgs: args.slice(1),
        };
        result = await Promise.resolve((hook as any)(args[0], errorContext));
      } else {
        // All other hooks take data as first param and context as second
        result = await Promise.resolve((hook as any)(args[0], context));
      }

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Plugin timeout after ${this.timeout}ms`)),
          this.timeout,
        ),
      );

      result = await Promise.race([result, timeoutPromise]);

      // Record metrics
      this.recordMetric(plugin.name, hookName, Date.now() - startTime);

      return result as T;
    } catch (error) {
      // Record error metrics
      this.recordError(plugin.name, error as Error);

      // Call plugin's error handler if available
      if (plugin.hooks.onError) {
        const errorContext: ErrorContext = {
          ...context,
          originalArgs: args,
        };

        try {
          await plugin.hooks.onError(error as Error, errorContext);
        } catch (handlerError) {
          console.error(
            `Error handler failed for plugin ${plugin.name}:`,
            handlerError,
          );
        }
      }

      // Log the error
      console.warn(
        `Plugin ${plugin.name} failed in ${hookName}: ${(error as Error).message}`,
      );

      // Check if error is fatal
      if (error instanceof SportCliFatalError) {
        throw error; // Propagate fatal errors
      }

      // Return original input for non-fatal errors
      return args[0];
    }
  }

  /**
   * Execute a hook across multiple plugins in priority order
   */
  async executeHookChain<T>(
    plugins: SportCliPlugin[],
    hookName: keyof SportCliPlugin['hooks'],
    initialValue: T,
    ...additionalArgs: any[]
  ): Promise<T> {
    let result = initialValue;

    for (const plugin of plugins) {
      try {
        result = await this.executeHook<T>(plugin, hookName, [
          result,
          ...additionalArgs,
        ]);
      } catch (error) {
        if (error instanceof SportCliFatalError) {
          throw error; // Stop chain on fatal errors
        }
        // Continue chain on non-fatal errors
      }
    }

    return result;
  }

  /**
   * Execute hooks in parallel (for independent operations)
   */
  async executeHookParallel(
    plugins: SportCliPlugin[],
    hookName: keyof SportCliPlugin['hooks'],
    args: any[],
  ): Promise<any[]> {
    const promises = plugins.map((plugin) =>
      this.executeHook(plugin, hookName, args),
    );

    // Use allSettled to continue even if some fail
    const results = await Promise.allSettled(promises);

    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);
  }

  /**
   * Get metrics for a plugin
   */
  getMetrics(pluginName: string): PluginMetrics | undefined {
    return this.metrics.get(pluginName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PluginMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Check if any plugin is performing poorly
   */
  getSlowPlugins(threshold = 100): PluginMetrics[] {
    const slowPlugins: PluginMetrics[] = [];

    for (const metrics of this.metrics.values()) {
      for (const [hook, times] of metrics.executionTimes) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        if (avgTime > threshold) {
          slowPlugins.push(metrics);
          break;
        }
      }
    }

    return slowPlugins;
  }

  private recordMetric(pluginName: string, hookName: string, duration: number) {
    let metrics = this.metrics.get(pluginName);

    if (!metrics) {
      metrics = {
        name: pluginName,
        loadTime: 0,
        executionTimes: new Map(),
        errorCount: 0,
      };
      this.metrics.set(pluginName, metrics);
    }

    const times = metrics.executionTimes.get(hookName) || [];
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    metrics.executionTimes.set(hookName, times);
  }

  private recordError(pluginName: string, error: Error) {
    let metrics = this.metrics.get(pluginName);

    if (!metrics) {
      metrics = {
        name: pluginName,
        loadTime: 0,
        executionTimes: new Map(),
        errorCount: 0,
      };
      this.metrics.set(pluginName, metrics);
    }

    metrics.errorCount++;
    metrics.lastError = error;
  }
}
