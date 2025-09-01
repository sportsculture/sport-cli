# sport-cli Quick Setup Guide

## 🚀 Getting Started

### 1. Set Up API Keys

You need at least one API key to use sport-cli. Choose from:

#### Option A: Google Gemini (Recommended - Free tier available)

1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Set the environment variable:
   ```bash
   export GOOGLE_GENAI_API_KEY="your-key-here"
   ```

#### Option B: OpenRouter (100+ models)

1. Visit https://openrouter.ai/keys
2. Create an account and generate an API key
3. Set the environment variable:
   ```bash
   export OPENROUTER_API_KEY="your-key-here"
   ```

#### Option C: Anthropic Claude

1. Visit https://console.anthropic.com/settings/keys
2. Create an API key
3. Set the environment variable:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

### 2. Configure sport-cli

#### Using .env file (Recommended)

```bash
# Copy the example file
cp .env.example .env

# Edit and add your API keys
nano .env
```

#### Or use export in your shell profile

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export GOOGLE_GENAI_API_KEY="your-key-here"
# Add other keys as needed
```

### 3. Verify Setup

```bash
# Check available models
sport --models

# Start interactive session
sport

# Or with a specific model
sport -m gemini-2.0-flash-exp
```

## 📋 Available Commands

Once configured, you can use:

- `sport --models` - List all available AI models
- `sport --models --all` - Show all models grouped by provider
- `/models` - Show models during a session
- `/model <name>` - Switch to a different model
- `/help` - Show all available commands

## 🔧 Troubleshooting

### No models showing?

- Ensure at least one API key is set
- Check environment variables: `env | grep API_KEY`
- Try sourcing your shell profile: `source ~/.bashrc`

### Using with existing gemini-cli config?

sport-cli reads both `.gemini/` and `.sport/` configuration directories, so your existing setup should work.

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.
