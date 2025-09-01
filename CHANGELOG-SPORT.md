# sport-cli Changelog

All notable changes to sport-cli (enhanced fork of gemini-cli) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) with sport-cli extensions.

## Versioning Strategy

sport-cli uses a versioning strategy that keeps pace with upstream gemini-cli:

- Format: `{gemini-version}-sport.{sport-release}`
- Example: `0.1.18-sport.1` = Based on gemini-cli v0.1.18, sport-cli release 1

## [0.1.18-sport.1] - 2025-01-11

### 🎯 Major Features Added to sport-cli

#### Multi-Provider AI Support

- **OpenRouter Integration**: Access to 100+ AI models through OpenRouter API
- **Anthropic Direct Support**: Native integration with Claude models
- **Custom API Endpoints**: Support for any OpenAI-compatible API
- **Provider Factory Pattern**: Clean abstraction for adding new providers

#### Enhanced Model Management

- **`/models` Command**: Interactive model selection with categorized listings
- **Model Recommendations**: Curated model suggestions by use case
- **Dynamic Model Switching**: Change models mid-conversation with `/model`
- **Model Scoring System**: Smart model selection based on capabilities

#### Developer Experience

- **Welcome Message**: Enhanced startup with date, git status, and folder metadata
- **Plugin Architecture**: Extensible plugin system for custom functionality
- **Improved Error Handling**: Better timeout management for streaming responses
- **HTML Entity Decoding**: Proper handling of encoded characters in responses

#### Branding & Configuration

- **sport-cli Branding**: Full rebrand with backward compatibility
- **Dual Config Support**: Reads both `.sport/` and `.gemini/` directories
- **SPORT.md Support**: Instructional context files with GEMINI.md fallback
- **Enhanced Settings**: Additional configuration options for providers

### 🔄 Upstream Sync (gemini-cli v0.1.18)

Successfully merged all features from gemini-cli v0.1.18, including:

#### From Latest Sync (2025-01-11)

- `/settings` command and UI panel
- Navigation improvements and key binding centralization
- ESC key input enhancements
- Memory loading improvements
- MCP Roots support
- Folder trust dialog
- Performance improvements with async file search

#### Previous Upstream Features Maintained

- IDE mode and VSCode companion
- MCP (Model Context Protocol) support
- Checkpointing for file edits
- Web search and fetch tools
- Advanced memory management
- Sandbox execution environment

### 🐛 Bug Fixes

- Fixed TypeScript compilation errors after upstream merge
- Resolved duplicate tool execution issues with certain models
- Fixed npm global install conflicts
- Corrected streaming timeout issues with OpenRouter
- Fixed import path issues for sport-cli packages

### 🔧 Technical Improvements

- **Provider Abstraction**: Clean separation of provider logic
- **Type Safety**: Full TypeScript with strict typing
- **Test Coverage**: Comprehensive test suite for providers
- **Build System**: Optimized build process with proper workspace handling
- **Sync Infrastructure**: Automated scripts for upstream synchronization

### 📚 Documentation

- Comprehensive CLAUDE.md with project instructions
- FORK_MANAGEMENT.md for upstream sync procedures
- INJECTION_POINTS.md documenting modification points
- Provider-specific documentation for each integration
- Migration guide from gemini-cli to sport-cli

### 🔐 Security

- Secure API key management through environment variables
- Provider-specific authentication handling
- OAuth2 support for applicable providers
- File permission restrictions for sensitive data

## [Previous Versions]

### Fork History

- **2025-01-07**: Initial fork from gemini-cli
- **2025-01-08**: Multi-provider architecture implementation
- **2025-01-09**: OpenRouter and Anthropic integrations
- **2025-01-10**: Plugin system and model management
- **2025-01-11**: Full upstream sync with v0.1.18

## Migration Guide

### From gemini-cli to sport-cli

1. **Installation**:

   ```bash
   npm install -g @sport/sport-cli
   ```

2. **Configuration Migration**:
   - sport-cli reads both `.gemini/` and `.sport/` directories
   - Existing gemini-cli configurations work without changes
   - New sport-cli features configured in `.sport/settings.json`

3. **API Keys**:

   ```bash
   # Add to .env or environment
   export OPENROUTER_API_KEY="your-key"
   export ANTHROPIC_API_KEY="your-key"
   ```

4. **Command Compatibility**:
   - All gemini-cli commands work identically
   - New commands: `/models`, `/model`
   - Both `gemini` and `sport` CLI commands available

## Contributing

sport-cli welcomes contributions! See CONTRIBUTING.md for guidelines.

### Priority Areas

- Additional AI provider integrations
- Enhanced plugin system capabilities
- Performance optimizations
- Documentation improvements

## License

Apache-2.0 (inherited from gemini-cli)

## Acknowledgments

- Google Gemini team for the excellent gemini-cli foundation
- OpenRouter for multi-model API access
- Anthropic for Claude API
- All contributors to both gemini-cli and sport-cli
