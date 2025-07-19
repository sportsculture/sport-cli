# sport-cli: Quick Guide

## What is sport-cli?

A developer-friendly fork of Google's Gemini CLI that adds:

- 🎯 **Transparent command execution** - See what's actually running
- 📁 **Configurable paths** - Control where files go
- 📜 **Persistent history** - Search and replay commands
- 🖼️ **Sane image handling** - Real files, not base64 blobs
- 🔌 **Plugin architecture** - Add features without breaking upstream sync

## The Big Idea: Plugins Over Patches

Instead of modifying Google's code directly, we wrap everything in plugins:

```typescript
// ❌ BAD: Modifying core files
class ShellTool {
  execute(cmd) {
    console.log('Executing:', cmd); // Our change
    return super.execute(cmd);
  }
}

// ✅ GOOD: Plugin approach
export const transparentBashPlugin = {
  beforeShellExecute: (cmd) => console.log('Executing:', cmd),
};
```

## 3-Step Rebranding

1. **Update package.json**

   ```json
   {
     "name": "@sportsculture/sport-cli",
     "bin": { "sport": "./bin/sport.js" }
   }
   ```

2. **Run rebrand script**

   ```bash
   ./scripts/rebrand.sh
   ```

3. **Change directories**
   - `.gemini/` → `.sport/`
   - `~/.config/gemini-cli/` → `~/.config/sport-cli/`

## Implementation Priority

### Week 1: Foundation

- [ ] Set up plugin system
- [ ] Complete rebranding
- [ ] Create upstream sync workflow

### Week 2-3: Core Features

- [ ] Configurable paths
- [ ] Transparent bash execution
- [ ] Directory context tracking

### Week 4-5: Advanced

- [ ] Persistent history with search/replay
- [ ] Image file management
- [ ] Event bus for external tools

## Staying Synced with Upstream

```bash
# One command to sync
./scripts/sync-upstream.sh

# What it does:
# 1. Fetches latest from Google
# 2. Merges changes
# 3. Runs tests
# 4. Applies our plugins
```

## Key Commands

```bash
# Configure paths
sport config set paths.history ~/.my-sport-history

# Use transparent mode
sport shell --full-output --confirm

# Search history
sport history search "docker build"

# Replay command
sport history replay 42
```

## Version Strategy

`{google_version}-sport.{our_version}`

Example: `0.1.12-sport.1.0` = Google's 0.1.12 + our 1.0

## For Users

```bash
# Install
npm install -g @sportsculture/sport-cli

# Migrate from gemini-cli
sport migrate --from-gemini

# Use it
sport shell "analyze my code"
```

## Golden Rules

1. **Every feature is a plugin** - No exceptions
2. **Upstream tests must pass** - Always
3. **Document divergence** - Track what's different
4. **Feature flags everything** - Allow disabling our changes

## Quick Plugin Example

```typescript
// plugins/my-feature.ts
export default {
  name: 'my-feature',
  hooks: {
    beforeShellExecute: (cmd) => {
      // Your code here
      return cmd;
    },
  },
};
```

## TL;DR

**sport-cli** = gemini-cli + developer sanity

We add the features developers actually need while staying compatible with Google's upstream through smart architecture, not messy patches.
