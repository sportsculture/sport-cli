# Feature Flags Guide

sport-cli uses a feature flag system to manage functionality, allowing gradual rollout of new features and easy disabling of features that might conflict with upstream changes.

## Overview

Feature flags can be controlled through:
1. Environment variables (highest priority)
2. User configuration file (`~/.sport/features.json`)
3. Project configuration file (`.sport/features.json`)
4. Default values

## Available Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `multiProvider` | `true` | Enable multi-provider AI support (OpenRouter, Custom APIs) |
| `customCommands` | `true` | Enable sport-cli specific commands (`/model`, `/models`) |
| `advancedMemory` | `false` | Enable experimental memory/context features |
| `providerPlugins` | `true` | Enable the provider plugin system |
| `backwardCompat` | `true` | Enable backward compatibility with gemini-cli |
| `experimental` | `false` | Enable experimental features |
| `debugLogging` | `false` | Enable debug logging output |
| `telemetry` | `true` | Enable usage telemetry |
| `autoUpdate` | `false` | Enable automatic update checks |
| `upstreamNotifications` | `true` | Show notifications about upstream updates |

## Configuration Methods

### Environment Variables

Set environment variables with the `SPORT_FF_` prefix:

```bash
# Enable experimental features
export SPORT_FF_EXPERIMENTAL=true

# Disable multi-provider support
export SPORT_FF_MULTI_PROVIDER=false

# Enable debug logging
export SPORT_FF_DEBUG_LOGGING=true
```

### Configuration File

Create a `features.json` file in your sport-cli config directory:

**User-level config** (`~/.sport/features.json`):
```json
{
  "features": {
    "experimental": true,
    "debugLogging": true,
    "autoUpdate": false
  }
}
```

**Project-level config** (`.sport/features.json`):
```json
{
  "features": {
    "advancedMemory": true,
    "telemetry": false
  }
}
```

### Priority Order

Feature flags are loaded in this priority order (highest to lowest):
1. Environment variables
2. User configuration (`~/.sport/features.json`)
3. Project configuration (`.sport/features.json`)
4. Default values

## Usage in Code

### Check if a Feature is Enabled

```typescript
import { isFeatureEnabled } from '@sport/sport-cli-core/config/features.js';

if (isFeatureEnabled('multiProvider')) {
  // Multi-provider code
}
```

### React Hook (for CLI Components)

```typescript
import { useFeature } from '@sport/sport-cli-core/config/features.js';

function ModelSelector() {
  const multiProviderEnabled = useFeature('multiProvider');
  
  if (!multiProviderEnabled) {
    return <Text>Using default Gemini provider</Text>;
  }
  
  return <ProviderSelector />;
}
```

### Method Decorator

```typescript
import { requiresFeature } from '@sport/sport-cli-core/config/features.js';

class ModelCommands {
  @requiresFeature('customCommands')
  async switchModel(model: string) {
    // This method only runs if customCommands is enabled
  }
}
```

### Get Feature Flag Summary

```bash
# In the CLI
sport --feature-flags

# Output:
Feature Flags Summary:
  ✓ multiProvider: true (default)
  ✓ customCommands: true (environment)
  ✗ advancedMemory: false (user_config)
  ✓ providerPlugins: true (default)
  ...
```

## Common Scenarios

### Testing New Features

Enable experimental features for testing:

```bash
export SPORT_FF_EXPERIMENTAL=true
export SPORT_FF_DEBUG_LOGGING=true
sport
```

### Disable sport-cli Features

To test upstream compatibility:

```bash
export SPORT_FF_MULTI_PROVIDER=false
export SPORT_FF_CUSTOM_COMMANDS=false
export SPORT_FF_BACKWARD_COMPAT=false
sport
```

### Production Deployment

Create a production features.json:

```json
{
  "features": {
    "experimental": false,
    "debugLogging": false,
    "telemetry": true,
    "autoUpdate": true
  }
}
```

## Development Guidelines

### Adding New Feature Flags

1. Add the flag to `FeatureFlags` interface in `features.ts`
2. Add default value to `DEFAULT_FLAGS`
3. Add environment variable mapping
4. Document the flag in this guide
5. Use the flag in your code

Example:
```typescript
// In features.ts
export interface FeatureFlags {
  // ... existing flags
  myNewFeature: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  // ... existing defaults
  myNewFeature: false,
};

// In environment variable mapping
const envMap: Record<string, keyof FeatureFlags> = {
  // ... existing mappings
  SPORT_FF_MY_NEW_FEATURE: 'myNewFeature',
};
```

### Best Practices

1. **Granular Flags**: Create specific flags for individual features
2. **Safe Defaults**: New features should default to `false`
3. **Clear Naming**: Use descriptive names for flags
4. **Document Usage**: Always document what the flag controls
5. **Clean Up**: Remove flags for features that are stable

## Troubleshooting

### Features Not Working

1. Check if the feature is enabled:
   ```bash
   sport --feature-flags
   ```

2. Verify environment variables:
   ```bash
   env | grep SPORT_FF_
   ```

3. Check configuration files:
   ```bash
   cat ~/.sport/features.json
   cat .sport/features.json
   ```

### Debug Feature Flag Loading

```bash
export SPORT_FF_DEBUG_LOGGING=true
sport --debug
```

This will show detailed information about feature flag loading and sources.

## Integration with Upstream Sync

During upstream synchronization, you can disable sport-cli specific features to test compatibility:

```bash
# Before sync
export SPORT_FF_MULTI_PROVIDER=false
export SPORT_FF_CUSTOM_COMMANDS=false

# Run tests
npm test

# Re-enable after sync
export SPORT_FF_MULTI_PROVIDER=true
export SPORT_FF_CUSTOM_COMMANDS=true
```

This helps identify which features might need adjustment after upstream changes.