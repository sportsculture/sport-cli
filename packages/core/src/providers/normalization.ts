/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { toolLogger } from '../utils/logger.js';
import { FunctionCall } from '@google/genai';

export enum ChunkType {
  TEXT = 'text',
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_DELTA = 'tool_call_delta',
  TOOL_CALL_END = 'tool_call_end',
  USAGE = 'usage',
  ERROR = 'error',
}

export interface NormalizedChunk {
  type: ChunkType;
  content?: string;
  toolCall?: Partial<ToolCallInfo>;
  toolCallId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  metadata: {
    provider: string;
    model: string;
    timestamp: number;
    raw?: any; // Original chunk for debugging
  };
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'partial' | 'complete';
}

export class ProviderNormalizer {
  private static instance: ProviderNormalizer | null = null;

  private constructor() {}

  static getInstance(): ProviderNormalizer {
    if (!ProviderNormalizer.instance) {
      ProviderNormalizer.instance = new ProviderNormalizer();
    }
    return ProviderNormalizer.instance;
  }

  /**
   * Detects the provider from a response chunk
   */
  detectProvider(chunk: any): string {
    // OpenAI/OpenRouter format
    if (chunk.choices && Array.isArray(chunk.choices)) {
      if (chunk.id && chunk.object === 'chat.completion.chunk') {
        return 'openai-streaming';
      }
      if (chunk.id && chunk.object === 'chat.completion') {
        return 'openai';
      }
    }

    // Anthropic format
    if (
      chunk.type &&
      (chunk.type === 'content_block_start' ||
        chunk.type === 'content_block_delta' ||
        chunk.type === 'message_delta')
    ) {
      return 'anthropic';
    }

    // Gemini format
    if (chunk.candidates && Array.isArray(chunk.candidates)) {
      return 'gemini';
    }

    // Custom API format (similar to OpenAI)
    if (chunk.message && chunk.message.role) {
      return 'custom-api';
    }

    toolLogger.warn('Unknown provider format', {
      chunkKeys: Object.keys(chunk),
      chunkType: typeof chunk,
    });
    return 'unknown';
  }

  /**
   * Normalizes a chunk from any provider into our standard format
   */
  normalizeChunk(chunk: any, provider?: string): NormalizedChunk[] {
    const detectedProvider = provider || this.detectProvider(chunk);
    const timestamp = Date.now();

    toolLogger.traceNormalization(chunk, { provider: detectedProvider });

    switch (detectedProvider) {
      case 'openai-streaming':
        return this.normalizeOpenAIStreamingChunk(chunk, timestamp);
      case 'openai':
        return this.normalizeOpenAIChunk(chunk, timestamp);
      case 'anthropic':
        return this.normalizeAnthropicChunk(chunk, timestamp);
      case 'gemini':
        return this.normalizeGeminiChunk(chunk, timestamp);
      case 'custom-api':
        return this.normalizeCustomApiChunk(chunk, timestamp);
      default:
        return [
          {
            type: ChunkType.ERROR,
            error: `Unknown provider format: ${detectedProvider}`,
            metadata: {
              provider: detectedProvider,
              model: 'unknown',
              timestamp,
              raw: chunk,
            },
          },
        ];
    }
  }

  private normalizeOpenAIStreamingChunk(
    chunk: any,
    timestamp: number,
  ): NormalizedChunk[] {
    const results: NormalizedChunk[] = [];
    const choice = chunk.choices?.[0];
    if (!choice) return results;

    const metadata = {
      provider: 'openai',
      model: chunk.model || 'unknown',
      timestamp,
    };

    // Handle text content
    if (choice.delta?.content) {
      results.push({
        type: ChunkType.TEXT,
        content: choice.delta.content,
        metadata,
      });
    }

    // Handle tool calls
    if (choice.delta?.tool_calls) {
      for (const toolCall of choice.delta.tool_calls) {
        const toolCallChunk: NormalizedChunk = {
          type: ChunkType.TOOL_CALL_DELTA,
          toolCallId: toolCall.id,
          metadata,
        };

        const toolCallInfo: Partial<ToolCallInfo> = {};

        if (toolCall.id) {
          toolCallInfo.id = toolCall.id;
        }

        if (toolCall.function?.name) {
          toolCallInfo.name = toolCall.function.name;
          toolCallChunk.type = ChunkType.TOOL_CALL_START;
        }

        if (toolCall.function?.arguments) {
          // Arguments come as string fragments that need to be accumulated
          toolCallInfo.arguments = toolCall.function.arguments;
          toolCallInfo.status = 'partial';
        }

        if (choice.finish_reason === 'tool_calls') {
          toolCallChunk.type = ChunkType.TOOL_CALL_END;
          toolCallInfo.status = 'complete';
        }

        toolCallChunk.toolCall = toolCallInfo;
        results.push(toolCallChunk);
      }
    }

    // Handle usage data
    if (chunk.usage) {
      results.push({
        type: ChunkType.USAGE,
        usage: {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        },
        metadata,
      });
    }

    return results;
  }

  private normalizeOpenAIChunk(
    chunk: any,
    timestamp: number,
  ): NormalizedChunk[] {
    const results: NormalizedChunk[] = [];
    const choice = chunk.choices?.[0];
    if (!choice) return results;

    const metadata = {
      provider: 'openai',
      model: chunk.model || 'unknown',
      timestamp,
    };

    // Handle text content
    if (choice.message?.content) {
      results.push({
        type: ChunkType.TEXT,
        content: choice.message.content,
        metadata,
      });
    }

    // Handle tool calls (non-streaming)
    if (choice.message?.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        results.push({
          type: ChunkType.TOOL_CALL_START,
          toolCallId: toolCall.id,
          toolCall: {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            status: 'complete',
          },
          metadata,
        });
      }
    }

    return results;
  }

  private normalizeAnthropicChunk(
    chunk: any,
    timestamp: number,
  ): NormalizedChunk[] {
    const results: NormalizedChunk[] = [];
    const metadata = {
      provider: 'anthropic',
      model: chunk.model || 'unknown',
      timestamp,
    };

    // Handle content blocks
    if (
      chunk.type === 'content_block_start' &&
      chunk.content_block?.type === 'tool_use'
    ) {
      results.push({
        type: ChunkType.TOOL_CALL_START,
        toolCallId: chunk.content_block.id,
        toolCall: {
          id: chunk.content_block.id,
          name: chunk.content_block.name,
          arguments: {},
          status: 'pending',
        },
        metadata,
      });
    }

    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta?.type === 'text_delta'
    ) {
      results.push({
        type: ChunkType.TEXT,
        content: chunk.delta.text,
        metadata,
      });
    }

    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta?.type === 'input_json_delta'
    ) {
      results.push({
        type: ChunkType.TOOL_CALL_DELTA,
        toolCallId: chunk.index,
        toolCall: {
          arguments: chunk.delta.partial_json,
          status: 'partial',
        },
        metadata,
      });
    }

    if (chunk.type === 'content_block_stop') {
      results.push({
        type: ChunkType.TOOL_CALL_END,
        toolCallId: chunk.index,
        metadata,
      });
    }

    return results;
  }

  private normalizeGeminiChunk(
    chunk: any,
    timestamp: number,
  ): NormalizedChunk[] {
    const results: NormalizedChunk[] = [];
    const candidate = chunk.candidates?.[0];
    if (!candidate) return results;

    const metadata = {
      provider: 'gemini',
      model: chunk.model || 'unknown',
      timestamp,
    };

    // Handle content parts
    if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          results.push({
            type: ChunkType.TEXT,
            content: part.text,
            metadata,
          });
        }

        if (part.functionCall) {
          results.push({
            type: ChunkType.TOOL_CALL_START,
            toolCallId: part.functionCall.id || `gemini-${Date.now()}`,
            toolCall: {
              id: part.functionCall.id || `gemini-${Date.now()}`,
              name: part.functionCall.name,
              arguments: part.functionCall.args || {},
              status: 'complete',
            },
            metadata,
          });
        }
      }
    }

    // Handle function calls at response level
    if (chunk.functionCalls) {
      for (const fnCall of chunk.functionCalls) {
        results.push({
          type: ChunkType.TOOL_CALL_START,
          toolCallId: fnCall.id || `gemini-${Date.now()}`,
          toolCall: {
            id: fnCall.id || `gemini-${Date.now()}`,
            name: fnCall.name,
            arguments: fnCall.args || {},
            status: 'complete',
          },
          metadata,
        });
      }
    }

    return results;
  }

  private normalizeCustomApiChunk(
    chunk: any,
    timestamp: number,
  ): NormalizedChunk[] {
    // Custom API providers often mimic OpenAI format
    return this.normalizeOpenAIChunk(chunk, timestamp);
  }

  /**
   * Attempts to parse partial JSON for tool arguments
   */
  parsePartialJson(str: string): any {
    try {
      return JSON.parse(str);
    } catch {
      // Try to complete partial JSON by adding closing braces
      const openBraces = (str.match(/{/g) || []).length;
      const closeBraces = (str.match(/}/g) || []).length;
      const openBrackets = (str.match(/\[/g) || []).length;
      const closeBrackets = (str.match(/]/g) || []).length;

      let completed = str;
      completed += ']'.repeat(openBrackets - closeBrackets);
      completed += '}'.repeat(openBraces - closeBraces);

      try {
        return JSON.parse(completed);
      } catch {
        // If still failing, return the partial string
        return str;
      }
    }
  }
}

// Export singleton instance
export const providerNormalizer = ProviderNormalizer.getInstance();
