# sport-cli Plugin Architecture

## Overview

The plugin system is the cornerstone of sport-cli's maintainability. This document provides comprehensive guidance on building, managing, and securing plugins.

## Plugin Structure

```typescript
interface SportCliPlugin {
  // Metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: PluginDependency[];

  // Lifecycle
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;

  // Hooks with error boundaries
  hooks: {
    beforeShellExecute?: (cmd: string, context: HookContext) => Promise<string>;
    afterShellExecute?: (
      result: ShellResult,
      context: HookContext,
    ) => Promise<ShellResult>;
    onConfigLoad?: (config: Config, context: HookContext) => Promise<Config>;
    onHistoryWrite?: (
      entry: HistoryEntry,
      context: HookContext,
    ) => Promise<HistoryEntry>;
    onError?: (error: Error, context: ErrorContext) => Promise<void>;
  };

  // Security
  permissions?: PluginPermission[];
  sandbox?: boolean;
}
```

## Error Handling

### Plugin Error Boundaries

Every hook execution is wrapped in an error boundary:

```typescript
class PluginExecutor {
  async executeHook(plugin: SportCliPlugin, hookName: string, ...args: any[]) {
    const timeout = this.config.pluginTimeout || 5000;

    try {
      return await Promise.race([
        plugin.hooks[hookName](...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Plugin timeout')), timeout),
        ),
      ]);
    } catch (error) {
      // Log error
      this.logger.warn(
        `Plugin ${plugin.name} failed in ${hookName}: ${error.message}`,
      );

      // Call plugin's error handler if available
      if (plugin.hooks.onError) {
        await plugin.hooks.onError(error, { hookName, args });
      }

      // Check if error is fatal
      if (error instanceof SportCliFatalError) {
        throw error; // Propagate fatal errors
      }

      // Return original input for non-fatal errors
      return args[0];
    }
  }
}
```

### Error Types

```typescript
// Non-fatal: Plugin fails but CLI continues
class PluginError extends Error {
  constructor(
    message: string,
    public plugin: string,
    public hook: string,
  ) {
    super(message);
  }
}

// Fatal: Stop execution
class SportCliFatalError extends Error {
  constructor(
    message: string,
    public plugin: string,
  ) {
    super(message);
  }
}
```

## Plugin Loading & Priority

### Load Order

Plugins are loaded in this sequence:

1. **System plugins** (built-in)
2. **User plugins** (~/.sport/plugins/)
3. **Project plugins** (./.sport/plugins/)
4. **Explicit plugins** (--plugin flag)

### Execution Priority

```json
// .sport/config.json
{
  "plugins": {
    "load": [
      "transparent-bash", // Priority 1
      "security-scanner", // Priority 2
      "history-logger" // Priority 3
    ],
    "priority": {
      "security-scanner": 100, // Override default order
      "transparent-bash": 90
    }
  }
}
```

### Hook Execution Flow

```typescript
// Multiple plugins can modify the same data
let result = originalValue;
for (const plugin of sortedPlugins) {
  result = await executeHook(plugin, 'beforeShellExecute', result, context);
}
```

## Plugin Dependencies

### Declaring Dependencies

```typescript
export default {
  name: 'advanced-history',
  dependencies: [
    { name: 'persistent-history', version: '^1.0.0' },
    { name: 'event-bus', version: '^2.0.0', optional: true },
  ],
  // ...
};
```

### Dependency Resolution

```typescript
class PluginManager {
  async resolveDependencies(plugin: SportCliPlugin) {
    for (const dep of plugin.dependencies || []) {
      const loaded = this.plugins.get(dep.name);

      if (!loaded && !dep.optional) {
        throw new Error(`Missing required dependency: ${dep.name}`);
      }

      if (loaded && !semver.satisfies(loaded.version, dep.version)) {
        throw new Error(`Incompatible version for ${dep.name}`);
      }
    }
  }
}
```

## Security & Sandboxing

### Permission Model

```typescript
enum PluginPermission {
  FILESYSTEM_READ = 'fs:read',
  FILESYSTEM_WRITE = 'fs:write',
  NETWORK = 'network',
  SHELL_EXECUTE = 'shell:execute',
  CONFIG_MODIFY = 'config:modify',
  HISTORY_ACCESS = 'history:access',
}

// Plugin declares required permissions
export default {
  name: 'file-manager',
  permissions: [
    PluginPermission.FILESYSTEM_READ,
    PluginPermission.FILESYSTEM_WRITE,
  ],
  // ...
};
```

### Sandbox Execution

```typescript
// For untrusted plugins
class PluginSandbox {
  async execute(plugin: SportCliPlugin, hook: string, args: any[]) {
    const worker = new Worker('./plugin-worker.js');

    return new Promise((resolve, reject) => {
      worker.postMessage({ plugin: plugin.name, hook, args });
      worker.on('message', resolve);
      worker.on('error', reject);

      // Timeout protection
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Plugin execution timeout'));
      }, 5000);
    });
  }
}
```

## Performance Considerations

### Metrics Collection

```typescript
interface PluginMetrics {
  executionTime: Map<string, number[]>;
  errorCount: number;
  lastError?: Error;
}

// Automatic performance tracking
const metrics = new Map<string, PluginMetrics>();
```

### Performance Budgets

```json
{
  "performance": {
    "maxPlugins": 20,
    "hookTimeout": 5000,
    "totalTimeout": 30000,
    "warnThreshold": 100 // ms per hook
  }
}
```

## Plugin Development Guide

### Basic Plugin Template

```typescript
// plugins/my-feature/index.ts
import { SportCliPlugin, HookContext } from '@sportsculture/sport-cli';

export default class MyFeaturePlugin implements SportCliPlugin {
  name = 'my-feature';
  version = '1.0.0';
  description = 'Adds amazing functionality';

  async onLoad() {
    // Initialize resources
    console.log(`${this.name} loaded`);
  }

  hooks = {
    async beforeShellExecute(cmd: string, context: HookContext) {
      // Your logic here
      if (this.shouldModifyCommand(cmd)) {
        return this.enhanceCommand(cmd);
      }
      return cmd;
    },
  };

  private shouldModifyCommand(cmd: string): boolean {
    // Implementation
    return cmd.includes('npm');
  }

  private enhanceCommand(cmd: string): string {
    // Implementation
    return `echo "Running: ${cmd}" && ${cmd}`;
  }
}
```

### Testing Plugins

```typescript
// plugins/my-feature/test.ts
import { PluginTestHarness } from '@sportsculture/sport-cli/testing';
import MyFeaturePlugin from './index';

describe('MyFeaturePlugin', () => {
  let harness: PluginTestHarness;

  beforeEach(() => {
    harness = new PluginTestHarness();
    harness.loadPlugin(new MyFeaturePlugin());
  });

  it('should enhance npm commands', async () => {
    const result = await harness.executeHook(
      'beforeShellExecute',
      'npm install',
    );

    expect(result).toContain('echo "Running: npm install"');
  });
});
```

## Plugin Registry

### Official Plugins

Maintained by sport-cli team:

- `transparent-bash` - Full command transparency
- `persistent-history` - Enhanced history management
- `configurable-paths` - Path customization
- `event-bus` - Real-time event streaming

### Community Plugins

Third-party plugins undergo review:

```bash
# Install from registry
sport plugin install @community/docker-helper

# Install from GitHub
sport plugin install github:user/sport-plugin-name
```

### Plugin Discovery

```bash
# List available plugins
sport plugin search history

# Get plugin info
sport plugin info transparent-bash

# List installed
sport plugin list
```

## Debugging Plugins

### Debug Mode

```bash
# Enable plugin debug logging
sport --debug-plugins shell "npm test"

# Profile plugin performance
sport --profile-plugins history search
```

### Plugin Inspector

```bash
# Inspect plugin behavior
sport plugin inspect transparent-bash

# Output:
# Plugin: transparent-bash v2.1.0
# Hooks: beforeShellExecute, afterShellExecute
# Permissions: shell:execute, config:read
# Dependencies: event-bus (optional)
# Performance: avg 12ms per execution
```

## Best Practices

### DO

- ✅ Handle errors gracefully
- ✅ Respect timeout limits
- ✅ Declare all dependencies
- ✅ Use TypeScript for type safety
- ✅ Write comprehensive tests
- ✅ Document configuration options
- ✅ Follow semantic versioning

### DON'T

- ❌ Modify global state
- ❌ Block the event loop
- ❌ Assume plugin load order
- ❌ Access filesystem without permission
- ❌ Store sensitive data in memory
- ❌ Make synchronous network calls

## Migration from Core Modifications

If you have existing core modifications:

```typescript
// Before: Modified shell.ts directly
class ShellTool {
  execute(cmd) {
    console.log('Executing:', cmd); // Your modification
    return super.execute(cmd);
  }
}

// After: Clean plugin
export default {
  name: 'shell-logger',
  hooks: {
    beforeShellExecute: (cmd) => {
      console.log('Executing:', cmd);
      return cmd;
    },
  },
};
```

## Troubleshooting

### Common Issues

**Plugin not loading:**

```bash
sport plugin diagnose my-plugin
# Checks: file exists, valid syntax, permissions, dependencies
```

**Hook not firing:**

```bash
sport --trace-hooks shell "ls"
# Shows: which plugins are called, in what order
```

**Performance degradation:**

```bash
sport plugin profile --threshold 50ms
# Lists slow plugins exceeding threshold
```

## Future Roadmap

- **v2.0**: Plugin marketplace with ratings
- **v2.1**: WebAssembly plugin support
- **v2.2**: Remote plugin execution
- **v3.0**: Plugin composition & pipelines
