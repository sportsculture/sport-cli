# Fork Management Strategy: sport-cli

**Version:** 1.0  
**Date:** July 17, 2025  
**Fork Parent:** google-gemini/gemini-cli  
**New Name:** sport-cli (formerly gemini-cli-next)

## Executive Summary

`sport-cli` is an enhanced fork of Google's Gemini CLI that adds developer-friendly features while maintaining upstream compatibility through a plugin architecture. This document outlines our strategy for managing the fork, implementing enhancements, and handling rebranding.

## Quick Start Guide

```bash
# Set up upstream sync
git remote add upstream https://github.com/google-gemini/gemini-cli.git

# Sync with upstream
./scripts/sync-upstream.sh

# Build with new branding
npm run rebrand && npm run build
```

## Core Strategy: Plugin Architecture

**Key Principle:** Minimize upstream conflicts by implementing features as plugins rather than modifying core code.

```typescript
// All custom features implemented as plugins
interface SportCliPlugin {
  name: string;
  hooks: {
    beforeShellExecute?: (cmd: string) => string;
    afterShellExecute?: (result: any) => any;
    onConfigLoad?: (config: Config) => Config;
  };
}
```

## Rebranding to sport-cli

### 1. Package Updates
```json
// package.json
{
  "name": "@sportsculture/sport-cli",
  "description": "Developer-friendly AI workflow tool with enhanced transparency",
  "bin": {
    "sport": "./bin/sport.js"
  }
}
```

### 2. Code Changes Required
- Update all package names from `@google/gemini-cli` to `@sportsculture/sport-cli`
- Change binary from `gemini` to `sport`
- Update config directories from `.gemini/` to `.sport/`
- Maintain compatibility aliases during transition

### 3. Branding Script
```bash
# scripts/rebrand.sh
find . -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | \
  xargs sed -i 's/gemini-cli/sport-cli/g'
```

## Enhancement Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Plugin System**
   - Create plugin loader
   - Define hook points
   - Migrate providers to plugins

2. **Rebranding**
   - Update package names
   - Change CLI commands
   - Update documentation

### Phase 2: Core Features (Week 2-3)
1. **Configurable Paths**
   ```bash
   sport config --set paths.history ~/.sport/history
   sport config --set paths.artifacts ./sport-artifacts
   ```

2. **Transparent Bash**
   ```bash
   sport shell --full-output  # See everything
   sport shell --confirm      # Prompt before execute
   ```

### Phase 3: Advanced Features (Week 4-5)
1. **Persistent History**
   ```bash
   sport history              # Interactive viewer
   sport history --replay 42  # Replay command
   ```

2. **Event Bus**
   ```bash
   sport serve               # Start event server
   sport dashboard           # Open web UI
   ```

## Upstream Sync Workflow

### Automated Sync Script
```bash
#!/bin/bash
# scripts/sync-upstream.sh

# 1. Fetch upstream
git fetch upstream

# 2. Create sync branch
BRANCH="sync-$(date +%Y%m%d)"
git checkout -b $BRANCH upstream/main

# 3. Apply our plugins
git cherry-pick main..plugins

# 4. Test
npm test

# 5. Merge
git checkout main
git merge $BRANCH
```

### Conflict Resolution Strategy
1. **Core files**: Accept upstream, re-apply via plugins
2. **Config**: Merge both, prefer upstream structure
3. **Tests**: Keep both test suites
4. **Docs**: Maintain separate SPORT_CLI.md

## Directory Structure

```
sport-cli/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── plugins/        # Sport-CLI plugins
│   │   │   ├── providers/      # Custom providers
│   │   │   └── tools/          # Enhanced tools
│   ├── cli/
│   └── vscode-companion/
├── scripts/
│   ├── sync-upstream.sh
│   └── rebrand.sh
├── FORK_MANAGEMENT.md          # This file
├── SPORT_CLI_FEATURES.md       # Our features
└── UPSTREAM_SYNC_LOG.md        # Sync history
```

## Feature Flags

Control sport-cli enhancements without breaking compatibility:

```typescript
// .sport/config.json
{
  "features": {
    "transparentBash": true,
    "persistentHistory": true,
    "configurablePaths": true,
    "eventBus": false,  // Experimental
    "legacyMode": false // Use original behavior
  }
}
```

## Testing Strategy

```bash
# Run upstream tests (must pass)
npm run test:upstream

# Run sport-cli tests
npm run test:sport

# Integration tests
npm run test:integration
```

## Version Strategy

Format: `{upstream_version}-sport.{sport_version}`

Examples:
- `0.1.12-sport.1.0` - First sport-cli release based on upstream 0.1.12
- `0.2.0-sport.1.5` - Sport version 1.5 based on upstream 0.2.0

## Maintenance Checklist

### Weekly
- [ ] Check upstream for updates
- [ ] Run sync workflow if needed
- [ ] Update UPSTREAM_SYNC_LOG.md

### Per Release
- [ ] Test all plugins with new upstream
- [ ] Update compatibility matrix
- [ ] Tag with version strategy
- [ ] Update migration guide

## Migration Guide

For users migrating from gemini-cli:

```bash
# 1. Install sport-cli
npm install -g @sportsculture/sport-cli

# 2. Migrate config
sport migrate --from-gemini

# 3. Update scripts
sed -i 's/gemini /sport /g' your-scripts.sh
```

## Contributing

1. All features must be implemented as plugins
2. Core modifications require strong justification
3. Include tests for upstream compatibility
4. Document divergence points

## Emergency Procedures

If upstream makes breaking changes:

1. **Freeze**: Lock to last compatible version
2. **Assess**: Evaluate impact on sport-cli features
3. **Adapt**: Modify plugin architecture if needed
4. **Communicate**: Notify users of compatibility status

---

## Appendix: Plugin Example

```typescript
// plugins/transparent-bash.ts
export class TransparentBashPlugin implements SportCliPlugin {
  name = 'transparent-bash';
  
  hooks = {
    beforeShellExecute: (cmd: string) => {
      console.log(`🏃 Executing: ${cmd}`);
      // Add confirmation prompt
      return this.confirmExecution(cmd);
    },
    
    afterShellExecute: (result: any) => {
      // Show full output
      console.log('📋 Full output:', result.stdout);
      return result;
    }
  };
}
```