# OpenRouter and Custom API Support

This document describes the new OpenRouter and Custom API provider support added to the Gemini CLI.

## Overview

The Gemini CLI has been extended to support additional AI providers beyond Google's Gemini API:

- **OpenRouter**: Access to multiple AI models through OpenRouter's unified API
- **Custom API**: Support for self-hosted models and custom endpoints (like DeepSeek running on local GPUs)

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# For OpenRouter
OPENROUTER_API_KEY=your-openrouter-api-key

# For Custom API (e.g., self-hosted DeepSeek)
CUSTOM_API_KEY=your-custom-api-key
CUSTOM_API_ENDPOINT=http://10.0.0.69:8080

# Optional: Custom headers (JSON format)
CUSTOM_API_HEADERS={"X-Custom-Header": "value"}
```

### Usage

1. **Start the CLI**: `npx @google/sprtscltr-cli`
2. **Select authentication method**: Choose "OpenRouter" or "Custom API" from the auth dialog
3. **Set your model**: The CLI will use appropriate default models:
   - OpenRouter: `deepseek/deepseek-chat`
   - Custom API: `deepseek-v3`

## OpenRouter Models

Popular models available through OpenRouter:

- `anthropic/claude-3-sonnet`
- `anthropic/claude-3-opus`
- `openai/gpt-4`
- `openai/gpt-4-turbo`
- `deepseek/deepseek-chat`
- `deepseek/deepseek-coder`
- `mistralai/mixtral-8x7b`
- `meta-llama/llama-3-70b`

## Custom API Setup

### For DeepSeek on Home Server

If you have DeepSeek running on a local server (like the one at 10.0.0.69 with RTX 3090 + RTX A6000):

```bash
CUSTOM_API_KEY=your-api-key
CUSTOM_API_ENDPOINT=http://10.0.0.69:8080
```

### Expected API Format

The custom API should follow OpenAI-compatible format:

```
POST /v1/chat/completions
{
  "model": "deepseek-v3",
  "messages": [...],
  "temperature": 0.7,
  "stream": true
}
```

## Implementation Details

### New Authentication Types

- `AuthType.USE_OPENROUTER`
- `AuthType.USE_CUSTOM_API`

### Provider Classes

- `OpenRouterContentGenerator`: Handles OpenRouter API communication
- `CustomApiContentGenerator`: Handles custom endpoint communication

### Features Supported

✅ **Streaming responses**
✅ **Function calling** (OpenRouter and compatible custom APIs)
✅ **Token counting** (estimated for both providers)
✅ **Error handling and retries**
✅ **Custom headers for authentication**

❌ **Embeddings** (not supported by most providers)
❌ **File uploads** (not supported)

## Testing

The implementation has been integrated into the existing Gemini CLI architecture and follows the same patterns as the Google Gemini provider.

To test:

1. Set up your environment variables
2. Run the CLI: `npx @google/sprtscltr-cli`
3. Select your desired provider from the auth dialog
4. Start chatting!

## Server Requirements

For the custom API to work, your server should:

1. Support OpenAI-compatible `/v1/chat/completions` endpoint
2. Handle both streaming and non-streaming requests
3. Support function calling (optional but recommended)
4. Return responses in OpenAI format

Example server setup for DeepSeek or other models can use frameworks like:

- vLLM
- TGI (Text Generation Inference)
- Ollama
- Custom FastAPI implementation

## Error Handling

The implementation includes proper error handling for:

- Invalid API keys
- Network connectivity issues
- Model availability
- Rate limiting
- Malformed responses

All errors are gracefully handled and provide user-friendly messages.
