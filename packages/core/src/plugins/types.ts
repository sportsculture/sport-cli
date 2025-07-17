/**
 * @license
 * Copyright 2025 SportsCulture (modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { ToolResult } from '../tools/tools.js';

/**
 * Core plugin interface
 */
export interface SportCliPlugin {
  // Metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
  
  // Dependencies
  dependencies?: PluginDependency[];
  
  // Lifecycle hooks
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  
  // Execution hooks
  hooks: PluginHooks;
  
  // Security
  permissions?: PluginPermission[];
  sandbox?: boolean;
}

/**
 * Plugin dependency specification
 */
export interface PluginDependency {
  name: string;
  version: string;
  optional?: boolean;
}

/**
 * Available plugin hooks
 */
export interface PluginHooks {
  beforeShellExecute?: (cmd: string, context: HookContext) => Promise<string> | string;
  afterShellExecute?: (result: ShellResult, context: HookContext) => Promise<ShellResult> | ShellResult;
  onConfigLoad?: (config: Config, context: HookContext) => Promise<Config> | Config;
  onHistoryWrite?: (entry: HistoryEntry, context: HookContext) => Promise<HistoryEntry> | HistoryEntry;
  onError?: (error: Error, context: ErrorContext) => Promise<void> | void;
}

/**
 * Context passed to hooks
 */
export interface HookContext {
  pluginName: string;
  hookName: string;
  timestamp: number;
  config: Config;
}

/**
 * Error context for error handlers
 */
export interface ErrorContext extends HookContext {
  originalArgs: any[];
}

/**
 * Shell execution result
 */
export interface ShellResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  directory?: string;
}

/**
 * History entry
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  command: string;
  result: ShellResult;
  plugins: string[];
}

/**
 * Plugin permissions
 */
export enum PluginPermission {
  FILESYSTEM_READ = 'fs:read',
  FILESYSTEM_WRITE = 'fs:write',
  NETWORK = 'network',
  SHELL_EXECUTE = 'shell:execute',
  CONFIG_MODIFY = 'config:modify',
  HISTORY_ACCESS = 'history:access'
}

/**
 * Plugin loading options
 */
export interface PluginLoadOptions {
  paths?: string[];
  enableSandbox?: boolean;
  timeout?: number;
  strict?: boolean;
}

/**
 * Plugin metrics
 */
export interface PluginMetrics {
  name: string;
  loadTime: number;
  executionTimes: Map<string, number[]>;
  errorCount: number;
  lastError?: Error;
}

/**
 * Custom error types
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public plugin: string,
    public hook?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class SportCliFatalError extends Error {
  constructor(
    message: string,
    public plugin: string
  ) {
    super(message);
    this.name = 'SportCliFatalError';
  }
}