/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Config } from '../config/config.js';

export interface LogContext {
  correlationId: string;
  timestamp: number;
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: any;
}

export class ToolExecutionLogger {
  private static instance: ToolExecutionLogger | null = null;
  private correlationId: string = '';
  private startTime: number = 0;
  private config: Config | null = null;

  private constructor() {}

  static getInstance(): ToolExecutionLogger {
    if (!ToolExecutionLogger.instance) {
      ToolExecutionLogger.instance = new ToolExecutionLogger();
    }
    return ToolExecutionLogger.instance;
  }

  initialize(config: Config): void {
    this.config = config;
  }

  startNewCorrelation(): string {
    this.correlationId = randomUUID();
    this.startTime = performance.now();
    return this.correlationId;
  }

  getCurrentCorrelationId(): string {
    return this.correlationId;
  }

  private shouldLog(): boolean {
    return this.config?.getDebugTools() || false;
  }

  private formatLogEntry(entry: LogEntry): string {
    const elapsed = performance.now() - this.startTime;
    const timestamp = new Date().toISOString();

    const formatted = {
      timestamp,
      correlationId: entry.context.correlationId,
      elapsed: `${elapsed.toFixed(2)}ms`,
      level: entry.level,
      message: entry.message,
      ...entry.data,
    };

    return JSON.stringify(formatted);
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog()) return;

    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      context: {
        correlationId: this.correlationId,
        timestamp: Date.now(),
      },
      data,
    };

    console.debug(`[TOOL-DEBUG] ${this.formatLogEntry(entry)}`);
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog()) return;

    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      context: {
        correlationId: this.correlationId,
        timestamp: Date.now(),
      },
      data,
    };

    console.info(`[TOOL-INFO] ${this.formatLogEntry(entry)}`);
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog()) return;

    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      context: {
        correlationId: this.correlationId,
        timestamp: Date.now(),
      },
      data,
    };

    console.warn(`[TOOL-WARN] ${this.formatLogEntry(entry)}`);
  }

  error(message: string, error?: any, data?: any): void {
    if (!this.shouldLog()) return;

    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      context: {
        correlationId: this.correlationId,
        timestamp: Date.now(),
      },
      data: {
        ...data,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
      },
    };

    console.error(`[TOOL-ERROR] ${this.formatLogEntry(entry)}`);
  }

  // Trace point helpers
  traceProviderDetection(provider: string, format: any): void {
    this.debug('Provider detected', { provider, format });
  }

  traceChunkReception(chunk: any, index: number): void {
    this.debug('Chunk received', {
      chunkIndex: index,
      chunkType: typeof chunk,
      hasContent: !!chunk.content,
      hasToolCalls: !!(
        chunk.toolCalls ||
        chunk.tool_calls ||
        chunk.function_call
      ),
    });
  }

  traceToolCallDetection(toolCall: any): void {
    this.info('Tool call detected', {
      toolName: toolCall.name || toolCall.function?.name,
      toolId: toolCall.id,
      hasArguments: !!toolCall.arguments,
    });
  }

  traceNormalization(before: any, after: any): void {
    this.debug('Normalization performed', {
      beforeType: typeof before,
      afterType: typeof after,
      normalized: true,
    });
  }

  traceToolExecution(
    toolName: string,
    startTime: number,
    endTime?: number,
  ): void {
    if (endTime) {
      const duration = endTime - startTime;
      this.info('Tool execution completed', {
        toolName,
        duration: `${duration.toFixed(2)}ms`,
      });
    } else {
      this.info('Tool execution started', { toolName });
    }
  }

  // Performance timing helper
  startTimer(operation: string): () => void {
    const start = performance.now();
    this.debug(`Starting operation: ${operation}`);

    return () => {
      const duration = performance.now() - start;
      this.debug(`Completed operation: ${operation}`, {
        duration: `${duration.toFixed(2)}ms`,
      });
    };
  }
}

// Export singleton instance
export const toolLogger = ToolExecutionLogger.getInstance();
