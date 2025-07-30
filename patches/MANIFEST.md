# sport-cli Patch Manifest

This directory contains patches that represent sport-cli's modifications to the upstream gemini-cli codebase.

## Patch Categories

### 001-provider-abstraction

Core multi-provider functionality that allows sport-cli to work with OpenRouter, custom APIs, and other AI providers.

### 002-branding

Branding changes including package names, binary names, and documentation updates.

### 003-configuration

Configuration system enhancements for provider selection and model management.

### 004-tools-and-features

Additional tools and features specific to sport-cli like enhanced model commands.

## Applying Patches

To apply all patches after syncing with upstream:

```bash
for patch in patches/*/*.patch; do
    git apply "$patch" || echo "Conflict in $patch"
done
```

## Creating New Patches

When adding new sport-cli specific features:

1. Make your changes
2. Run: `git diff upstream/main HEAD -- path/to/file > patches/category/filename.patch`
3. Update this manifest

## Patch Maintenance

- Review patches regularly to ensure they're minimal
- Consider contributing general improvements back to upstream
- Keep patches focused on single features/changes
