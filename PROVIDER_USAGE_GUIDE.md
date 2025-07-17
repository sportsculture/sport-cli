# 🚀 Using OpenRouter and Custom API Providers with Gemini CLI

## Quick Start

### 1. Set Up Environment Variables

First, make sure your `.env` file has the necessary API keys:

```bash
# For OpenRouter (get key from https://openrouter.ai/)
OPENROUTER_API_KEY=your-actual-openrouter-key

# For Custom/Local API (e.g., your GPU server)
CUSTOM_API_KEY=your-api-key
CUSTOM_API_ENDPOINT=http://10.0.0.69:5000
```

### 2. Run the CLI

```bash
# Using npm
npm start

# Or using the bundled version
node bundle/gemini.js
```

### 3. Choose Your Provider

When the CLI starts, you'll see the authentication dialog with these options:

1. Login with Google
2. Gemini API Key (AI Studio)
3. Vertex AI
4. **OpenRouter** ← NEW!
5. **Custom API** ← NEW!

## Provider-Specific Usage

### 🌐 Using OpenRouter

OpenRouter gives you access to many models through one API:

1. Select "OpenRouter" from the auth dialog
2. The CLI will use your `OPENROUTER_API_KEY`
3. Default model: `deepseek/deepseek-chat`
4. Available models include:
   - `deepseek/deepseek-chat`
   - `anthropic/claude-3-opus`
   - `openai/gpt-4-turbo`
   - `meta-llama/llama-3-70b`
   - And many more!

**Example commands:**
```bash
# After selecting OpenRouter
> help
> search "function that handles auth"
> show src/index.js
> explain this code
```

### 🖥️ Using Custom API (Your GPU Server)

Perfect for your local DeepSeek instance:

1. Select "Custom API" from the auth dialog
2. Uses your local server at `10.0.0.69:5000`
3. Available models on your server:
   - `deepseek-r1:7b` (fast, good for quick tasks)
   - `deepseek-r1:70b` (powerful, for complex reasoning)
   - `dolphin-llama3:8b`
   - `Dolphin3.0-R1-Mistral-24B`

**Example session:**
```bash
# The CLI will use your local GPU server
> remember I'm using my local GPU server with DeepSeek R1
> help me refactor this function
> analyze the performance of this code
> suggest optimizations
```

## Advanced Configuration

### Changing Models

You can modify the default models in your `.env`:

```bash
# For different OpenRouter models
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3-opus

# For different local models
CUSTOM_DEFAULT_MODEL=deepseek-r1:70b
```

### Custom Headers

For additional authentication or routing:

```bash
CUSTOM_API_HEADERS={"X-Custom-Header": "value", "Authorization": "Bearer special-token"}
```

### Using Multiple Endpoints

You can create different configs for different purposes:

```bash
# For OCRFlux (image + text)
CUSTOM_API_ENDPOINT_OCR=http://10.0.0.69:8000

# For Ollama (pure LLM)
CUSTOM_API_ENDPOINT_LLM=http://10.0.0.69:5000
```

## Practical Examples

### 1. Code Review with Local GPU

```bash
# Start CLI and choose Custom API
npm start

# In the CLI:
> I'm using DeepSeek R1 70B on my local server
> review the security of auth.ts
> find potential vulnerabilities
> suggest improvements
```

### 2. Multi-Model Comparison

```bash
# Session 1 - OpenRouter with Claude
npm start  # Choose OpenRouter
> analyze the architecture of this project

# Session 2 - Local GPU with DeepSeek
npm start  # Choose Custom API  
> analyze the architecture of this project

# Compare responses!
```

### 3. Specialized Tasks

```bash
# For code generation (OpenRouter - GPT-4)
> generate a TypeScript class for user authentication

# For deep analysis (Local GPU - DeepSeek 70B)
> explain the entire data flow in this application

# For quick tasks (Local GPU - DeepSeek 7B)
> format this JSON file
```

## Troubleshooting

### OpenRouter Issues

1. **Invalid API Key**: Make sure your key starts with `sk-or-`
2. **Rate Limits**: OpenRouter has per-model rate limits
3. **Model Not Found**: Check available models at https://openrouter.ai/models

### Custom API Issues

1. **Connection Refused**: Check if your server is running
   ```bash
   curl http://10.0.0.69:5000/api/tags
   ```

2. **Model Not Found**: List available models
   ```bash
   curl http://10.0.0.69:5000/api/tags | jq
   ```

3. **Slow Responses**: The 70B model needs more GPU memory
   - Use 7B model for faster responses
   - Check GPU usage: `ssh mac@10.0.0.69 nvidia-smi`

## Performance Tips

### For Speed
- Use `deepseek-r1:7b` on your local server
- Use `deepseek/deepseek-chat` on OpenRouter

### For Quality
- Use `deepseek-r1:70b` on your local server
- Use `anthropic/claude-3-opus` on OpenRouter

### For Cost Efficiency
- Local GPU server = FREE (just electricity!)
- OpenRouter = Pay per token (check prices)

## Next Steps

1. **Try both providers** to see which works best for different tasks
2. **Experiment with models** - each has strengths
3. **Set up aliases** for quick switching:
   ```bash
   alias gemini-local='CUSTOM_API_ENDPOINT=http://10.0.0.69:5000 npm start'
   alias gemini-router='npm start'  # Uses OpenRouter
   ```

Happy coding with your new AI providers! 🎉