# Merge Resolution Plan: Fork Sync with Upstream

## Overview
Resolving 26 merge conflicts between our fork (with multi-provider support) and upstream Google gemini-cli.

## Conflict Categories and Resolution Strategy

### 1. Package Management Files (3 files)
- **package.json** - Merge both script additions, keep upstream version bump
- **package-lock.json** - Regenerate after resolving package.json
- **packages/cli/package.json** - Keep upstream version, merge dependencies
- **packages/core/package.json** - Keep upstream version, merge dependencies

**Strategy**: Accept upstream version numbers, merge all script additions from both sides

### 2. Documentation (4 files)
- **README.md** - Keep our multi-provider sections, add upstream's new features
- **docs/deployment.md** - Merge both changes
- **docs/sandbox.md** - Merge both changes
- **.gitignore** - Keep both our additions and upstream's

**Strategy**: Additive merge - keep content from both sides

### 3. Core Source Code (11 files)
#### Config/Auth (5 files)
- **packages/cli/src/config/config.ts** - Preserve our auth types, add upstream features
- **packages/core/src/config/config.ts** - Merge configuration options
- **packages/core/src/code_assist/oauth2.ts** - Keep our provider auth, add upstream OAuth
- **packages/core/src/code_assist/oauth2.test.ts** - Update tests for both
- **packages/core/src/core/contentGenerator.ts** - Critical: preserve our multi-provider factory

#### UI/Hooks (4 files)
- **packages/cli/src/ui/App.tsx** - Merge UI updates, keep our auth dialog changes
- **packages/cli/src/ui/App.test.tsx** - Update tests
- **packages/cli/src/ui/hooks/slashCommandProcessor.ts** - Merge new slash commands
- **packages/cli/src/ui/hooks/slashCommandProcessor.test.ts** - Update tests

#### Tools/Services (4 files)
- **packages/core/src/tools/read-file.ts** - Merge tool improvements
- **packages/core/src/tools/read-many-files.ts** - Merge tool improvements
- **packages/core/src/services/fileDiscoveryService.ts** - Merge service updates
- **packages/core/src/utils/paths.ts** - Keep both utility additions

### 4. Other Files (3 files)
- **packages/core/src/core/prompts.ts** - Merge prompt updates
- **packages/core/src/core/turn.ts** - Merge turn handling
- **packages/core/src/core/turn.test.ts** - Update tests
- **packages/core/src/core/client.test.ts** - Update tests
- **scripts/sandbox_command.js** - Merge script updates

## Resolution Order
1. Start with package files to establish versions
2. Resolve documentation files
3. Resolve core contentGenerator.ts (most critical)
4. Resolve remaining source files
5. Run tests and fix any issues

## Key Preservation Points
- Our AuthType enum additions (USE_OPENROUTER, USE_CUSTOM_API)
- Content generator factory pattern
- Multi-provider support in all auth flows
- Our rebranding changes where appropriate