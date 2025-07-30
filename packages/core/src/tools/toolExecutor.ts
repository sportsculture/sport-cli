/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

interface ToolCallRecord {
  callId: string;
  promise: Promise<any>;
  timestamp: number;
}

/**
 * Idempotent tool executor that prevents duplicate executions
 * particularly for providers like Grok-4 that may send duplicate tool calls
 */
export class IdempotentToolExecutor {
  // Use content-based key (toolName + args hash) instead of callId
  private inflight = new Map<string, ToolCallRecord>();
  private readonly CACHE_TTL_MS = 30000; // 30 second cache to handle duplicate calls within a conversation turn

  // Metrics for observability
  private metrics = {
    totalCalls: 0,
    duplicatesBlocked: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  /**
   * Creates a stable hash of the tool call arguments with proper canonicalization
   */
  private createArgsHash(args: any): string {
    // Canonicalize the arguments for consistent hashing
    const canonicalized = this.canonicalizeJson(args);
    const normalized = JSON.stringify(canonicalized);
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Recursively canonicalize JSON for consistent hashing
   */
  private canonicalizeJson(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    // Primitives
    if (typeof obj !== 'object') {
      // Normalize numbers (handle -0, NaN, Infinity)
      if (typeof obj === 'number') {
        if (Object.is(obj, -0)) return 0;
        if (Number.isNaN(obj)) return 'NaN';
        if (obj === Infinity) return 'Infinity';
        if (obj === -Infinity) return '-Infinity';
      }
      // Normalize empty strings to null for consistency
      if (obj === '') return null;
      return obj;
    }

    // Arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.canonicalizeJson(item));
    }

    // Objects - sort keys and recurse
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      const value = this.canonicalizeJson(obj[key]);
      // Skip undefined values
      if (value !== undefined) {
        sorted[key] = value;
      }
    }
    return sorted;
  }

  /**
   * Creates a content-based deduplication key
   */
  private createDedupeKey(toolName: string, args: any): string {
    const argsHash = this.createArgsHash(args);
    return `${toolName}:${argsHash}`;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [id, record] of this.inflight.entries()) {
      if (now - record.timestamp > this.CACHE_TTL_MS) {
        this.inflight.delete(id);
      }
    }
  }

  /**
   * Execute a tool call with content-based deduplication
   * Returns the same promise for identical tool+args within the cache window
   */
  async executeToolCall<T>(
    callId: string,
    toolName: string,
    args: any,
    executor: () => Promise<T>,
  ): Promise<T> {
    // Track total calls
    this.metrics.totalCalls++;

    // Clean up old entries periodically
    this.cleanupCache();

    // Use content-based key instead of callId
    const dedupeKey = this.createDedupeKey(toolName, args);
    const cached = this.inflight.get(dedupeKey);

    // If we have an identical tool+args in flight, return the same promise
    if (cached) {
      this.metrics.cacheHits++;
      this.metrics.duplicatesBlocked++;

      if (process.env.DEBUG_TOOLS === 'true') {
        console.error(
          `[DEDUP] Preventing duplicate execution of ${toolName} (original: ${cached.callId}, duplicate: ${callId})`,
        );
        console.error(
          `[METRICS] Duplicates blocked: ${this.metrics.duplicatesBlocked}, Cache hit rate: ${((this.metrics.cacheHits / this.metrics.totalCalls) * 100).toFixed(1)}%`,
        );
      }
      return cached.promise;
    }

    // Cache miss - new execution
    this.metrics.cacheMisses++;

    // Execute the tool
    if (process.env.DEBUG_TOOLS === 'true') {
      console.error(`[EXEC] Executing ${toolName} with callId: ${callId}`);
    }

    const promise = executor();
    this.inflight.set(dedupeKey, {
      callId,
      promise,
      timestamp: Date.now(),
    });

    // Clean up after completion
    promise.finally(() => {
      // Only delete if it's still our promise
      const current = this.inflight.get(dedupeKey);
      if (current && current.promise === promise) {
        this.inflight.delete(dedupeKey);
      }
    });

    return promise;
  }

  /**
   * Get statistics about duplicate calls (for debugging)
   */
  getStats(): {
    activeCount: number;
    cacheSize: number;
    totalCalls: number;
    duplicatesBlocked: number;
    cacheHitRate: number;
  } {
    this.cleanupCache();
    return {
      activeCount: this.inflight.size,
      cacheSize: this.inflight.size,
      totalCalls: this.metrics.totalCalls,
      duplicatesBlocked: this.metrics.duplicatesBlocked,
      cacheHitRate:
        this.metrics.totalCalls > 0
          ? (this.metrics.cacheHits / this.metrics.totalCalls) * 100
          : 0,
    };
  }
}

// Singleton instance
export const toolExecutor = new IdempotentToolExecutor();
