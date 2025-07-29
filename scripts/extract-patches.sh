#!/bin/bash
# Script to extract patches from current modifications compared to upstream

set -e

echo "==================================="
echo "sport-cli Patch Extraction Tool"
echo "==================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure we're in the git root
cd "$(git rev-parse --show-toplevel)"

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo -e "${RED}Error: upstream remote not found${NC}"
    echo "Please add it with: git remote add upstream https://github.com/google-gemini/gemini-cli.git"
    exit 1
fi

# Fetch latest upstream
echo "Fetching latest upstream..."
git fetch upstream

# Function to create a patch for a file
create_patch() {
    local file=$1
    local category=$2
    local patch_name=$(basename "$file" .ts).patch
    
    if git diff upstream/main HEAD -- "$file" > /dev/null 2>&1; then
        local diff_output=$(git diff upstream/main HEAD -- "$file")
        if [ -n "$diff_output" ]; then
            echo "$diff_output" > "patches/$category/$patch_name"
            echo -e "${GREEN}✓${NC} Created patch: patches/$category/$patch_name"
        fi
    fi
}

echo -e "\n${YELLOW}Extracting provider abstraction patches...${NC}"
# Provider abstraction files
create_patch "packages/core/src/core/contentGenerator.ts" "001-provider-abstraction"
create_patch "packages/core/src/core/geminiChat.ts" "001-provider-abstraction"
create_patch "packages/core/src/providers/geminiContentGenerator.ts" "001-provider-abstraction"
create_patch "packages/core/src/providers/openRouterContentGenerator.ts" "001-provider-abstraction"
create_patch "packages/core/src/providers/customApiContentGenerator.ts" "001-provider-abstraction"
create_patch "packages/core/src/providers/types.ts" "001-provider-abstraction"

echo -e "\n${YELLOW}Extracting branding patches...${NC}"
# Branding changes
create_patch "package.json" "002-branding"
create_patch "README.md" "002-branding"
create_patch "packages/cli/package.json" "002-branding"
create_patch "packages/core/package.json" "002-branding"

echo -e "\n${YELLOW}Extracting configuration patches...${NC}"
# Configuration changes
create_patch "packages/core/src/config/models.ts" "003-configuration"
create_patch "packages/core/src/config/config.ts" "003-configuration"

echo -e "\n${YELLOW}Extracting tools and features patches...${NC}"
# New features and commands
create_patch "packages/cli/src/handlers/chatHandler.tsx" "004-tools-and-features"
create_patch "packages/cli/src/utils/commands.ts" "004-tools-and-features"

# Create a manifest of all patches
echo -e "\n${YELLOW}Creating patch manifest...${NC}"
cat > patches/MANIFEST.md << 'EOF'
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
EOF

echo -e "${GREEN}✓${NC} Created patch manifest: patches/MANIFEST.md"

# Count patches created
PATCH_COUNT=$(find patches -name "*.patch" -type f | wc -l)
echo -e "\n${GREEN}Extraction complete!${NC} Created $PATCH_COUNT patches."

# Show patch statistics
echo -e "\n${YELLOW}Patch Statistics:${NC}"
for dir in patches/*/; do
    if [ -d "$dir" ] && [ "$dir" != "patches/*/" ]; then
        count=$(find "$dir" -name "*.patch" -type f | wc -l)
        dirname=$(basename "$dir")
        echo "  $dirname: $count patches"
    fi
done

echo -e "\n${YELLOW}Tip:${NC} Review patches in each category to ensure they capture your changes correctly."