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

interface CustomApiMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

interface CustomApiRequest {
  model: string;
  messages: CustomApiMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  functions?: Array<{
    name: string;
    description?: string;
    parameters?: any;
  }>;
}

interface CustomApiChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    function_call?: {
      name: string;
      arguments: string;
    };
  };
  finish_reason: string;
}

interface CustomApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CustomApiChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface CustomApiStreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string | null;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finish_reason?: string | null;
}

interface CustomApiStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CustomApiStreamChoice[];
}

export class CustomApiContentGenerator implements ContentGenerator {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private customHeaders: Record<string, string>;

  constructor(config: ContentGeneratorConfig) {
    if (!config.apiKey) {
      throw new Error('Custom API key is required');
    }
    if (!config.customEndpoint) {
      throw new Error('Custom API endpoint is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.customEndpoint.replace(/\/$/, ''); // Remove trailing slash
    this.customHeaders = config.customHeaders || {};
  }

  private convertToCustomApiMessages(contents: any): CustomApiMessage[] {
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
    const messages: CustomApiMessage[] = [];

    for (const content of contentArray) {
      const role = content.role === 'model' ? 'assistant' : content.role;
      
      if (!content.parts || content.parts.length === 0) {
        continue;
      }

      const textParts: string[] = [];
      let functionCall: any = null;
      let functionResponse: any = null;

      for (const part of content.parts) {
        if ('text' in part && part.text) {
          textParts.push(part.text);
        } else if ('functionCall' in part && part.functionCall) {
          functionCall = {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          };
        } else if ('functionResponse' in part && part.functionResponse) {
          functionResponse = part.functionResponse;
        } else if ('inlineData' in part) {
          // For now, we'll skip inline data as most custom APIs don't support it
          textParts.push('[Image data omitted]');
        }
      }

      if (functionResponse) {
        messages.push({
          role: 'function',
          name: functionResponse.name,
          content: JSON.stringify(functionResponse.response),
        });
      } else if (functionCall) {
        messages.push({
          role: role as 'assistant',
          content: textParts.join('\n') || '',
          function_call: functionCall,
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

  private convertToCustomApiFunctions(tools?: any[]): Array<any> | undefined {
    if (!tools) return undefined;

    return tools.map(tool => {
      if ('functionDeclarations' in tool) {
        return tool.functionDeclarations.map((func: FunctionDeclaration) => ({
          name: func.name,
          description: func.description,
          parameters: func.parameters,
        }));
      }
      return [];
    }).flat();
  }

  private convertCustomApiResponse(response: CustomApiResponse): GenerateContentResponse {
    const choice = response.choices[0];
    const parts: Part[] = [];

    if (choice.message.content) {
      parts.push({ text: choice.message.content });
    }

    if (choice.message.function_call) {
      parts.push({
        functionCall: {
          name: choice.message.function_call.name,
          args: JSON.parse(choice.message.function_call.arguments),
        },
      });
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
        return undefined; // Custom API doesn't support inline data
      }
    });

    Object.defineProperty(result, 'executableCode', {
      get() {
        return undefined; // Custom API doesn't support executable code
      }
    });

    Object.defineProperty(result, 'codeExecutionResult', {
      get() {
        return undefined; // Custom API doesn't support code execution
      }
    });

    return result;
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const customApiRequest: CustomApiRequest = {
      model: this.model,
      messages: this.convertToCustomApiMessages(request.contents),
      temperature: request.config?.temperature,
      top_p: request.config?.topP,
      max_tokens: request.config?.maxOutputTokens,
      functions: this.convertToCustomApiFunctions((request as any).tools),
    };

    const response = await retryWithBackoff(async () => {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.customHeaders,
        },
        body: JSON.stringify(customApiRequest),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Custom API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<CustomApiResponse>;
    });

    return this.convertCustomApiResponse(response);
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.generateContentStreamInternal(request);
  }

  private async *generateContentStreamInternal(
    request: GenerateContentParameters,
  ): AsyncGenerator<GenerateContentResponse> {
    const customApiRequest: CustomApiRequest = {
      model: this.model,
      messages: this.convertToCustomApiMessages(request.contents),
      temperature: request.config?.temperature,
      top_p: request.config?.topP,
      max_tokens: request.config?.maxOutputTokens,
      stream: true,
      functions: this.convertToCustomApiFunctions((request as any).tools),
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...this.customHeaders,
      },
      body: JSON.stringify(customApiRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';
    let accumulatedFunctionCall: any = null;

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
            const chunk: CustomApiStreamResponse = JSON.parse(data);
            const choice = chunk.choices[0];
            
            if (choice.delta.content) {
              accumulatedContent += choice.delta.content;
            }

            if (choice.delta.function_call) {
              if (!accumulatedFunctionCall) {
                accumulatedFunctionCall = { name: '', arguments: '' };
              }
              if (choice.delta.function_call.name) {
                accumulatedFunctionCall.name = choice.delta.function_call.name;
              }
              if (choice.delta.function_call.arguments) {
                accumulatedFunctionCall.arguments += choice.delta.function_call.arguments;
              }
            }

            const parts: Part[] = [];
            if (accumulatedContent) {
              parts.push({ text: accumulatedContent });
            }
            if (accumulatedFunctionCall && accumulatedFunctionCall.name) {
              parts.push({
                functionCall: {
                  name: accumulatedFunctionCall.name,
                  args: accumulatedFunctionCall.arguments ? JSON.parse(accumulatedFunctionCall.arguments) : {},
                },
              });
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

            yield streamResult;
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    }
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Try to call a token counting endpoint if available
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

    try {
      const response = await fetch(`${this.baseUrl}/v1/tokenize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.customHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          text: textContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          totalTokens: data.tokens || data.token_count || 0,
          cachedContentTokenCount: 0,
        };
      }
    } catch (e) {
      // Fallback to estimation
    }

    // Rough estimation: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(textContent.length / 4);

    return {
      totalTokens: estimatedTokens,
      cachedContentTokenCount: 0,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    try {
      let input = '';
      
      if (typeof request.contents === 'string') {
        input = request.contents;
      } else if (Array.isArray(request.contents)) {
        input = request.contents
          .filter((p: any) => p && 'text' in p)
          .map((p: any) => p.text)
          .join(' ');
      } else if (request.contents && typeof request.contents === 'object' && 'text' in request.contents) {
        input = (request.contents as any).text || '';
      }

      const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...this.customHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          input,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          embeddings: [
            {
              values: data.data[0].embedding,
            }
          ],
        };
      }
    } catch (e) {
      // Fall through to error
    }

    throw new Error('Embeddings are not supported by this custom API');
  }
}