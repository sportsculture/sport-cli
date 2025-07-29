# sport-cli Injection Points Documentation

This document systematically catalogues all locations where sport-cli modifies the upstream google-gemini/gemini-cli codebase. This is critical for maintaining the fork and resolving merge conflicts during synchronization.

## Overview

sport-cli modifications are organized into these categories:
1. **Provider Abstraction** - Core multi-provider functionality
2. **Branding** - Package names, CLI commands, and display text
3. **Configuration** - Settings and model defaults
4. **Features** - New commands and capabilities
5. **Compatibility** - Backward compatibility layers

## Injection Points by File

### 1. packages/core/src/core/contentGenerator.ts

**Purpose**: Central factory for creating content generators

**Modifications**:
```typescript
// Line 7-14: Added imports for providers
import { OpenRouterContentGenerator } from '../providers/openRouterContentGenerator.js';
import { CustomApiContentGenerator } from '../providers/customApiContentGenerator.js';
import { GeminiContentGenerator } from '../providers/geminiContentGenerator.js';
import { IProvider } from '../providers/types.js';

// Line 41-50: Extended AuthType enum
export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  USE_OPENROUTER = 'openrouter',     // sport-cli addition
  USE_CUSTOM_API = 'custom-api',     // sport-cli addition
}

// Line 70-73: Added provider API key handling
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const customApiKey = process.env.CUSTOM_API_KEY;
const customApiEndpoint = process.env.CUSTOM_API_ENDPOINT;

// Line 104-119: Added provider configuration
if (authType === AuthType.USE_OPENROUTER && openRouterApiKey) {
  contentGeneratorConfig.apiKey = openRouterApiKey;
  return contentGeneratorConfig;
}

// Line 137-143: Added provider instantiation
if (config.authType === AuthType.USE_OPENROUTER) {
  return new OpenRouterContentGenerator(config);
}
```

**Conflict Resolution**: When merging, preserve all AuthType additions and provider instantiation logic.

### 2. packages/core/src/core/geminiChat.ts

**Purpose**: Main chat interface that needs to support multiple providers

**Modifications**:
```typescript
// Line 135-137: Added tools parameter to constructor
constructor(
  private readonly config: Config,
  private readonly contentGenerator: ContentGenerator,
  private readonly generationConfig: GenerateContentConfig = {},
  private history: Content[] = [],
  private readonly tools?: Tool[],  // sport-cli addition
)

// Line 294-295: Pass tools to content generator
return this.contentGenerator.generateContent({
  model: modelToUse,
  contents: requestContents,
  config: { ...this.generationConfig, ...params.config },
  tools: this.tools,  // sport-cli addition
} as any);

// Line 397-414: Debug logging for tools
if (process.env.DEBUG) {
  console.log('[DEBUG] GeminiChat.sendMessageStream: Passing tools...');
}
```

**Conflict Resolution**: Preserve tools parameter passing to ensure provider compatibility.

### 3. package.json (root)

**Purpose**: Package metadata and CLI binary name

**Modifications**:
```json
{
  "name": "@sport/sport-cli",  // was: "@google/gemini-cli"
  "bin": {
    "sport": "bundle/gemini.js"  // was: "gemini": "bundle/gemini.js"
  },
  "repository": {
    "url": "git+https://github.com/sportsculture/gemini-cli.git"
  }
}
```

**Conflict Resolution**: Can be handled via branding configuration system.

### 4. README.md

**Purpose**: Project documentation

**Modifications**:
- Title changed to "sport-cli - Multi-Provider AI CLI"
- Added OpenRouter setup section
- Added fork maintenance section
- Updated installation instructions

**Conflict Resolution**: Take upstream changes, then re-apply sport-cli sections at the end.

### 5. packages/cli/src/utils/commands.ts

**Purpose**: CLI command definitions

**Modifications**:
```typescript
// Added commands for provider management
{
  command: '/model',
  description: 'Switch AI model/provider',
  category: 'ai',
},
{
  command: '/models',
  description: 'List available models',
  category: 'ai',
}
```

**Conflict Resolution**: Always preserve sport-cli commands, merge with upstream additions.

### 6. packages/core/src/config/models.ts

**Purpose**: Model defaults and constants

**Modifications**:
```typescript
// Line 10-12: Added provider-specific defaults
export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';
export const DEFAULT_CUSTOM_API_MODEL = 'gpt-4';
```

**Conflict Resolution**: Keep all model constants from both versions.

### 7. packages/cli/src/handlers/chatHandler.tsx

**Purpose**: Handle chat commands including model switching

**Modifications**:
- Added `/model` command handling
- Added `/models` command handling
- Enhanced model switching logic

**Conflict Resolution**: Complex file - carefully preserve command handling logic.

## New Files (No Conflict Risk)

These files are entirely new in sport-cli:

### Provider System
- `packages/core/src/providers/types.ts`
- `packages/core/src/providers/registry.ts`
- `packages/core/src/providers/factory.ts`
- `packages/core/src/providers/geminiContentGenerator.ts`
- `packages/core/src/providers/openRouterContentGenerator.ts`
- `packages/core/src/providers/customApiContentGenerator.ts`
- `packages/core/src/providers/modelCache.ts`
- `packages/core/src/providers/modelCapabilities.ts`
- `packages/core/src/providers/normalization.ts`
- `packages/core/src/providers/*.registry.ts`

### Configuration
- `packages/core/src/config/branding.ts`

### Compatibility
- `packages/cli/src/bin/gemini-wrapper.ts`

### Documentation
- `CLAUDE.md`
- `SYNC_WORKFLOW.md`
- `SYNC_GUIDE.md`
- `INJECTION_POINTS.md`
- `CHANGELOG.md`

### Scripts
- `scripts/check-divergence.sh`
- `scripts/sync-upstream-simple.sh`
- `scripts/manual-sync-helper.sh`
- `scripts/resolve-conflicts-helper.sh`
- `scripts/extract-patches.sh`
- `scripts/update-branding.js`

## Minimal Injection Strategy

To minimize future conflicts:

1. **Use Composition Over Modification**: Instead of modifying existing functions, wrap them
2. **Configuration Over Code**: Use environment variables and config files
3. **Plugin Architecture**: Use the provider registry for extensibility
4. **Clear Markers**: Always mark modifications with comments

Example marker:
```typescript
// sport-cli: provider injection - START
if (config.authType === AuthType.USE_OPENROUTER) {
  return new OpenRouterContentGenerator(config);
}
// sport-cli: provider injection - END
```

## Automated Injection Detection

To find all injection points programmatically:

```bash
# Find all files with sport-cli specific changes
grep -r "sport-cli\|OpenRouter\|CustomApi\|@sport" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git \
  packages/

# Find all AuthType references
grep -r "AuthType\." packages/core/src/ | grep -v "node_modules"

# Find provider imports
grep -r "from.*providers/" packages/
```

## Conflict Resolution Priority

When resolving conflicts during upstream sync:

1. **High Priority (Always Keep)**:
   - Provider system files
   - AuthType extensions
   - Tool/command additions

2. **Medium Priority (Merge Carefully)**:
   - contentGenerator.ts modifications
   - geminiChat.ts tool support
   - Configuration extensions

3. **Low Priority (Can Regenerate)**:
   - Branding changes
   - Documentation updates
   - Package.json modifications

## Maintenance Guidelines

1. **Before Adding New Injections**:
   - Consider if it can be done via configuration
   - Check if it can use the provider registry
   - Add clear injection markers

2. **When Syncing**:
   - Run `./scripts/extract-patches.sh` to update patches
   - Review this document for conflict resolution
   - Update this document with new injections

3. **Regular Audits**:
   - Monthly review of injection points
   - Consolidate similar modifications
   - Consider upstream contributions

## Future Improvements

1. **Reduce Injection Surface**:
   - Move more logic to provider plugins
   - Use dependency injection patterns
   - Create abstraction layers

2. **Automation**:
   - Build tool to auto-detect injections
   - Create injection point tests
   - Automate marker addition

3. **Upstream Contributions**:
   - Provider interface abstraction
   - Plugin system architecture
   - Configuration improvements