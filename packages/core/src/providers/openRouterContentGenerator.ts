/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../core/contentGenerator.js';
import {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
  FunctionCall,
  FunctionDeclaration,
} from '@google/genai';
import { retryWithBackoff } from '../utils/retry.js';
import { IProvider, ModelInfo, ProviderStatus } from './types.js';
import { OPENROUTER_MODELS } from '../config/models.js';
import { ModelCacheService } from './modelCache.js';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; text?: string; tool_call_id?: string }>;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

interface OpenRouterFunction {
  name: string;
  description?: string;
  parameters?: any;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Array<{
    type: 'function';
    function: OpenRouterFunction;
  }>;
  usage?: boolean;
}

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterStreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
  finish_reason?: string | null;
}

interface OpenRouterStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenRouterStreamChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterContentGenerator implements IProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: ContentGeneratorConfig) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private convertToOpenRouterMessages(contents: any): OpenRouterMessage[] {
    // Handle various content formats
    let contentArray: Content[] = [];
    
    if (typeof contents === 'string') {
      contentArray = [{ role: 'user', parts: [{ text: contents }] }];
    } else if (Array.isArray(contents)) {
      if (contents.length > 0 && typeof contents[0] === 'string') {
        // Array of strings
        contentArray = [{ role: 'user', parts: contents.map(text => ({ text })) }];
      } else if (contents.length > 0 && 'text' in contents[0]) {
        // Array of parts
        contentArray = [{ role: 'user', parts: contents }];
      } else {
        // Array of Content objects
        contentArray = contents;
      }
    } else if (contents && 'role' in contents) {
      // Single Content object
      contentArray = [contents];
    } else if (contents && 'text' in contents) {
      // Single Part object
      contentArray = [{ role: 'user', parts: [contents] }];
    }
    const messages: OpenRouterMessage[] = [];

    for (const content of contentArray) {
      const role = content.role === 'model' ? 'assistant' : content.role;
      
      if (!content.parts || content.parts.length === 0) {
        continue;
      }

      const textParts: string[] = [];
      const toolCalls: any[] = [];
      const toolResponses: any[] = [];

      for (const part of content.parts) {
        if ('text' in part && part.text) {
          textParts.push(part.text);
        } else if ('functionCall' in part && part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args),
            },
          });
        } else if ('functionResponse' in part && part.functionResponse) {
          toolResponses.push({
            type: 'text',
            text: JSON.stringify(part.functionResponse.response),
          });
        } else if ('inlineData' in part) {
          // For now, we'll skip inline data as OpenRouter doesn't support it directly
          textParts.push('[Image data omitted]');
        }
      }

      if (toolResponses.length > 0) {
        // Tool responses are sent as tool messages
        for (const response of toolResponses) {
          messages.push({
            role: 'tool',
            content: response.text,
            tool_call_id: `call_${Date.now()}`, // This should match the actual call ID
          });
        }
      } else if (toolCalls.length > 0) {
        messages.push({
          role: role as 'assistant',
          content: textParts.join('\n') || '',
          tool_calls: toolCalls,
        });
      } else if (textParts.length > 0) {
        messages.push({
          role: role as any,
          content: textParts.join('\n'),
        });
      }
    }

    return messages;
  }

  private convertToGoogleTools(tools?: any[]): Array<{ type: 'function'; function: OpenRouterFunction }> | undefined {
    if (!tools) return undefined;

    return tools.map(tool => {
      if ('functionDeclarations' in tool) {
        return tool.functionDeclarations.map((func: FunctionDeclaration) => ({
          type: 'function' as const,
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters,
          },
        }));
      }
      return [];
    }).flat();
  }

  private convertOpenRouterResponse(response: OpenRouterResponse): GenerateContentResponse {
    const choice = response.choices[0];
    const parts: Part[] = [];

    if (choice.message.content) {
      parts.push({ text: choice.message.content });
    }

    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        parts.push({
          functionCall: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
          },
        });
      }
    }

    const result = Object.create(GenerateContentResponse.prototype);
    result.candidates = [
      {
        content: {
          role: 'model',
          parts,
        },
        finishReason: choice.finish_reason as any,
        index: 0,
      },
    ];
    
    if (response.usage) {
      result.usageMetadata = {
        promptTokenCount: response.usage.prompt_tokens,
        candidatesTokenCount: response.usage.completion_tokens,
        totalTokenCount: response.usage.total_tokens,
      };
    }

    // Add getter methods
    Object.defineProperty(result, 'text', {
      get() {
        if (!this.candidates || this.candidates.length === 0) return undefined;
        const textParts = this.candidates[0].content.parts
          .filter((p: Part) => 'text' in p)
          .map((p: Part) => p.text);
        return textParts.length > 0 ? textParts.join('') : undefined;
      }
    });

    Object.defineProperty(result, 'functionCalls', {
      get() {
        if (!this.candidates || this.candidates.length === 0) return undefined;
        const calls = this.candidates[0].content.parts
          .filter((p: Part) => 'functionCall' in p && p.functionCall)
          .map((p: Part) => p.functionCall);
        return calls.length > 0 ? calls : undefined;
      }
    });

    Object.defineProperty(result, 'data', {
      get() {
        return undefined; // OpenRouter doesn't support inline data
      }
    });

    Object.defineProperty(result, 'executableCode', {
      get() {
        return undefined; // OpenRouter doesn't support executable code
      }
    });

    Object.defineProperty(result, 'codeExecutionResult', {
      get() {
        return undefined; // OpenRouter doesn't support code execution
      }
    });

    return result;
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const openRouterRequest: OpenRouterRequest = {
      model: this.model,
      messages: this.convertToOpenRouterMessages(request.contents),
      temperature: request.config?.temperature,
      top_p: request.config?.topP,
      max_tokens: request.config?.maxOutputTokens,
      tools: this.convertToGoogleTools((request as any).tools),
      usage: true,
    };

    const response = await retryWithBackoff(async () => {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/google/gemini-cli',
          'X-Title': 'gemini CLI',
        },
        body: JSON.stringify(openRouterRequest),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`OpenRouter API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<OpenRouterResponse>;
    });

    return this.convertOpenRouterResponse(response);
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.generateContentStreamInternal(request);
  }

  private async *generateContentStreamInternal(
    request: GenerateContentParameters,
  ): AsyncGenerator<GenerateContentResponse> {
    const openRouterRequest: OpenRouterRequest = {
      model: this.model,
      messages: this.convertToOpenRouterMessages(request.contents),
      temperature: request.config?.temperature,
      top_p: request.config?.topP,
      max_tokens: request.config?.maxOutputTokens,
      stream: true,
      tools: this.convertToGoogleTools((request as any).tools),
      usage: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/google/gemini-cli',
        'X-Title': 'gemini CLI',
      },
      body: JSON.stringify(openRouterRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';
    let accumulatedToolCalls: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const chunk: OpenRouterStreamResponse = JSON.parse(data);
            const choice = chunk.choices[0];
            
            // Only yield if there's new content in this chunk
            let hasNewContent = false;
            
            if (choice.delta.content) {
              accumulatedContent += choice.delta.content;
              hasNewContent = true;
            }

            if (choice.delta.tool_calls) {
              hasNewContent = true;
              for (const toolCall of choice.delta.tool_calls) {
                if (!accumulatedToolCalls[toolCall.index]) {
                  accumulatedToolCalls[toolCall.index] = {
                    id: toolCall.id || '',
                    type: 'function',
                    function: { name: '', arguments: '' },
                  };
                }
                if (toolCall.function?.name) {
                  accumulatedToolCalls[toolCall.index].function.name = toolCall.function.name;
                }
                if (toolCall.function?.arguments) {
                  accumulatedToolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                }
              }
            }

            // Only yield incremental content, not accumulated
            const parts: Part[] = [];
            if (choice.delta.content) {
              parts.push({ text: choice.delta.content });
            }
            if (accumulatedToolCalls.length > 0) {
              for (const toolCall of accumulatedToolCalls.filter(tc => tc)) {
                if (toolCall.function.name) {
                  parts.push({
                    functionCall: {
                      name: toolCall.function.name,
                      args: toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {},
                    },
                  });
                }
              }
            }

            const streamResult = Object.create(GenerateContentResponse.prototype);
            streamResult.candidates = [
              {
                content: {
                  role: 'model',
                  parts,
                },
                finishReason: choice.finish_reason as any,
                index: 0,
              },
            ];
            
            // Check if this chunk has usage data (final chunk)
            if (chunk.usage) {
              streamResult.usageMetadata = {
                promptTokenCount: chunk.usage.prompt_tokens,
                candidatesTokenCount: chunk.usage.completion_tokens,
                totalTokenCount: chunk.usage.total_tokens,
              };
            }
            
            // Add getter methods
            Object.defineProperty(streamResult, 'text', {
              get() {
                if (!this.candidates || this.candidates.length === 0) return undefined;
                const textParts = this.candidates[0].content.parts
                  .filter((p: Part) => 'text' in p)
                  .map((p: Part) => p.text);
                return textParts.length > 0 ? textParts.join('') : undefined;
              }
            });

            Object.defineProperty(streamResult, 'functionCalls', {
              get() {
                if (!this.candidates || this.candidates.length === 0) return undefined;
                const calls = this.candidates[0].content.parts
                  .filter((p: Part) => 'functionCall' in p && p.functionCall)
                  .map((p: Part) => p.functionCall);
                return calls.length > 0 ? calls : undefined;
              }
            });

            Object.defineProperty(streamResult, 'data', {
              get() {
                return undefined;
              }
            });

            Object.defineProperty(streamResult, 'executableCode', {
              get() {
                return undefined;
              }
            });

            Object.defineProperty(streamResult, 'codeExecutionResult', {
              get() {
                return undefined;
              }
            });

            // Yield if there's new content or if this is the final chunk with usage data
            if ((hasNewContent && parts.length > 0) || chunk.usage) {
              yield streamResult;
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    }
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // OpenRouter doesn't have a token counting endpoint, so we'll estimate
    let textContent = '';
    
    // Handle various content formats
    if (typeof request.contents === 'string') {
      textContent = request.contents;
    } else if (Array.isArray(request.contents)) {
      const processContent = (item: any): string => {
        if (typeof item === 'string') {
          return item;
        } else if (item && 'text' in item) {
          return item.text || '';
        } else if (item && 'parts' in item && Array.isArray(item.parts)) {
          return item.parts.map(processContent).join(' ');
        }
        return '';
      };
      
      textContent = request.contents.map(processContent).join(' ');
    } else if (request.contents && 'text' in request.contents) {
      textContent = request.contents.text || '';
    } else if (request.contents && 'parts' in request.contents && request.contents.parts) {
      textContent = request.contents.parts
        .filter((p: any) => p && 'text' in p)
        .map((p: any) => p.text)
        .join(' ');
    }

    // Rough estimation: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(textContent.length / 4);

    return {
      totalTokens: estimatedTokens,
      cachedContentTokenCount: 0,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    throw new Error('Embeddings are not supported by OpenRouter');
  }

  async fetchModels(): Promise<Array<{id: string; name: string; context_length?: number; pricing?: any}>> {
    try {
      const response = await retryWithBackoff(async () => {
        const resp = await fetch(`${this.baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/google-gemini/gemini-cli',
            'X-Title': 'Gemini CLI',
          },
        });

        if (!resp.ok) {
          throw new Error(`Failed to fetch models: ${resp.status} ${resp.statusText}`);
        }

        return resp;
      });

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      // Return a default set of models if the API call fails
      return [
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'mistralai/mixtral-8x7b', name: 'Mixtral 8x7B' },
      ];
    }
  }

  // IProvider implementation
  async getAvailableModels(): Promise<ModelInfo[]> {
    const cache = ModelCacheService.getInstance();
    const providerId = 'openrouter';
    
    // Check cache first
    const cachedModels = cache.getCachedModels(providerId);
    if (cachedModels) {
      return cachedModels;
    }
    
    const models = await this.fetchModels();
    
    const modelInfos = models.map(model => {
      // Check if this is a known model from our predefined list
      const knownModel = Object.entries(OPENROUTER_MODELS).find(([_, id]) => id === model.id);
      const isDefault = model.id === 'deepseek/deepseek-chat';
      
      const modelInfo: ModelInfo = {
        id: model.id,
        name: model.name || model.id,
        provider: 'OpenRouter',
        isDefault,
        description: this.getModelDescription(model.id),
        capabilities: {
          contextWindow: model.context_length,
          supportsFunctions: true,
          supportsStreaming: true,
          strengths: this.getModelStrengths(model.id),
        },
      };

      // Add pricing if available
      if (model.pricing) {
        modelInfo.pricing = {
          inputPer1k: model.pricing.prompt ? parseFloat(model.pricing.prompt) * 1000 : undefined,
          outputPer1k: model.pricing.completion ? parseFloat(model.pricing.completion) * 1000 : undefined,
        };
      }

      return modelInfo;
    });
    
    // Cache the models  
    cache.setCachedModels(providerId, modelInfos);
    
    return modelInfos;
  }

  async checkConfiguration(): Promise<ProviderStatus> {
    try {
      // Try to make a simple API call to verify the key
      const response = await fetch(`${this.baseUrl}/auth/key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        return {
          isConfigured: true,
        };
      } else {
        return {
          isConfigured: false,
          errorMessage: `Invalid API key: ${response.status}`,
          configInstructions: 'Set OPENROUTER_API_KEY environment variable with a valid OpenRouter API key',
        };
      }
    } catch (error) {
      return {
        isConfigured: false,
        errorMessage: `Connection error: ${error}`,
        configInstructions: 'Ensure you have internet connectivity and OPENROUTER_API_KEY is set',
      };
    }
  }

  getProviderName(): string {
    return 'OpenRouter';
  }

  private getModelDescription(modelId: string): string {
    const descriptions: Record<string, string> = {
      'deepseek/deepseek-chat': 'Cost-effective model with strong performance',
      'deepseek/deepseek-coder': 'Specialized for code generation and analysis',
      'anthropic/claude-3-opus': 'Most capable Claude model for complex tasks',
      'anthropic/claude-3-sonnet': 'Balanced Claude model for general use',
      'openai/gpt-4': 'Industry standard for complex reasoning',
      'openai/gpt-4-turbo': 'Faster GPT-4 with larger context window',
      'mistralai/mixtral-8x7b': 'Open-source mixture of experts model',
      'meta-llama/llama-3-70b': 'Large open-source model from Meta',
    };
    
    return descriptions[modelId] || 'AI model available through OpenRouter';
  }

  private getModelStrengths(modelId: string): string[] {
    const strengths: Record<string, string[]> = {
      'deepseek/deepseek-chat': ['Cost-effective', 'General purpose', 'Fast responses'],
      'deepseek/deepseek-coder': ['Code generation', 'Bug fixing', 'Code review'],
      'anthropic/claude-3-opus': ['Complex reasoning', 'Creative writing', 'Technical analysis'],
      'anthropic/claude-3-sonnet': ['Balanced performance', 'General tasks', 'Efficient'],
      'openai/gpt-4': ['Reasoning', 'Analysis', 'Problem solving'],
      'openai/gpt-4-turbo': ['Fast processing', 'Large context', 'Versatile'],
      'mistralai/mixtral-8x7b': ['Open source', 'Efficient', 'Multi-lingual'],
      'meta-llama/llama-3-70b': ['Open source', 'Large scale', 'Research'],
    };
    
    return strengths[modelId] || ['General purpose'];
  }
}