# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

sport-cli is an enhanced fork of Google's official Gemini CLI with multi-provider AI support. It's a command-line AI workflow tool built as a monorepo with:
- **Frontend**: React-based CLI using Ink for terminal UI
- **Backend**: TypeScript/Node.js handling multi-provider AI interactions  
- **VSCode Extension**: IDE companion for integration
- **Origin**: Forked from [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)

## Essential Development Commands

```bash
# Build & Development
npm install                 # Install dependencies
npm run build              # Build all packages
npm run build:all          # Build including sandbox
npm start                  # Run from source
npm run debug              # Start with debugging

# Testing & Quality - ALWAYS RUN BEFORE COMMITTING
npm run preflight          # Complete validation (build, test, lint, format)
npm run test               # Run unit tests
npm run test:e2e           # Run integration tests
npm run lint               # ESLint check
npm run format             # Prettier formatting

# Run a single test file
npm test -- path/to/test.test.ts
```

## Architecture & Code Organization

### Package Structure
- **`packages/cli`**: Terminal UI layer (React/Ink components, command processing)
- **`packages/core`**: Backend logic (provider integrations, tools, MCP support)
- **`packages/vscode-ide-companion`**: VSCode extension

### Key Design Patterns
- **Plain objects over classes** with TypeScript interfaces
- **Functional programming** patterns (map, filter, reduce)
- **React hooks** for state management and side effects
- **Co-located tests** (`.test.ts` files next to source)

### Provider Integration
The codebase supports multiple AI providers through a unified interface:
- Providers are implemented in `packages/core/src/providers/`
- Each provider implements the `Provider` interface
- Configuration is managed through settings.json and environment variables

### Tool System
Tools are the primary way the AI interacts with the system:
- Tool definitions in `packages/core/src/tools/`
- Each tool implements validation, execution, and formatting
- MCP (Model Context Protocol) servers can provide additional tools

## Configuration Hierarchy

1. **Environment Variables** (`.env`): API keys for providers
2. **Settings Files** (searched in order):
   - Project: `.sport/settings.json` (with fallback to `.gemini/settings.json` for compatibility)
   - User: `~/.sport/settings.json` (with fallback to `~/.gemini/settings.json`)
   - System: `/etc/sport-cli/settings.json`
3. **SPORT.md**: Instructional context files (hierarchical, with fallback to GEMINI.md)
4. **MCP Configuration**: `.mcp.json` for external tool servers

## Testing Guidelines

- Tests use **Vitest** with extensive mocking
- React components tested with `ink-testing-library`
- Mock patterns: Use `vi.mock()` for dependencies
- Integration tests in `/integration-tests`
- Always verify tests pass before implementing features

## Key Development Rules

1. **Never use underscores in flag names** - use hyphens instead
2. **Always run `npm run preflight`** before committing
3. **Keep React components pure** - no side effects in render
4. **Type everything** - avoid `any`, prefer `unknown`
5. **Test co-location** - keep `.test.ts` files next to source

## Common Development Tasks

### Adding a New Provider
1. Create provider in `packages/core/src/providers/`
2. Implement the `Provider` interface
3. Add to provider factory
4. Add configuration types
5. Update documentation

### Adding a New Tool
1. Create tool in `packages/core/src/tools/`
2. Implement validation, execution, and formatting
3. Add to tool registry
4. Write comprehensive tests
5. Update help documentation

### Working with the UI
- Components in `packages/cli/src/components/`
- Use Ink's React components for terminal rendering
- Theme system in `packages/cli/src/utils/theme.ts`
- Keep components focused and testable

## Debugging Tips

- Use `npm run debug` for debugging with breakpoints
- Check logs in development mode
- Use `--debug` flag for verbose output
- Integration tests are helpful for complex scenarios

## Git Workflow

- Main branch: `main`
- Feature branches for new work
- Use worktrees for parallel development:
  ```bash
  npm run worktree:new
  npm run worktree:sync
  ```
- Commit format: `feat:`, `fix:`, `docs:`, `chore:`, etc.

## Fork Maintenance Guidelines

### Upstream Synchronization

This project is a fork that needs to stay synchronized with Google's gemini-cli:

```bash
# One-time setup
git remote add upstream https://github.com/google-gemini/gemini-cli.git

# Regular sync process
git fetch upstream
git checkout main
git rebase upstream/main  # Preferred for clean history
# Resolve conflicts carefully
git push origin main --force-with-lease
```

### Code Isolation Strategy

To minimize merge conflicts:

1. **Provider System**: All multi-provider logic is isolated in `packages/core/src/providers/`
   - `provider.interface.ts` - Common interface all providers implement
   - `gemini.provider.ts` - Original Gemini logic refactored as a provider
   - `openrouter.provider.ts` - OpenRouter integration
   - `provider.factory.ts` - Provider selection logic

2. **Minimal Injection Points**: We modify original code in as few places as possible
   - Look for comments like `// sport-cli: provider injection`
   - Keep these modifications surgical and well-documented

3. **Configuration Over Code**: Use configuration files for branding
   - `src/config/branding.ts` - Centralized branding configuration
   - Avoid hardcoding "sport" or package names throughout the codebase

### Adding New Features

When adding sport-cli specific features:

1. **Isolate in dedicated directories** whenever possible
2. **Use feature flags** for experimental features
3. **Document injection points** where you must modify original code
4. **Write comprehensive tests** to catch regressions during merges

### Handling Conflicts

When conflicts arise during upstream sync:

1. **Provider code**: Always keep our version (it's our added value)
2. **Core gemini code**: Generally take upstream unless we have critical fixes
3. **Tests**: Merge both sets of tests
4. **Dependencies**: Carefully merge, ensuring our added dependencies remain

### Contributing Back Upstream

Consider contributing these improvements back to Google:

1. **Provider abstraction layer** (without specific providers)
2. **General architectural improvements**
3. **Bug fixes that affect original functionality**
4. **Test improvements**

Open an issue first to discuss before creating PRs.

## Important Files to Know

- `packages/cli/src/cliMain.tsx` - Main CLI entry point
- `packages/core/src/conversation/index.ts` - Core conversation logic
- `packages/core/src/providers/index.ts` - Provider management
- `packages/core/src/tools/index.ts` - Tool system
- `settings-schema.json` - Settings validation schema