#!/bin/bash

# Fix common merge issues from sport-cli / gemini-cli sync

echo "Fixing merge TypeScript errors..."

# Fix modelsCommand.ts
sed -i '195a\  kind: CommandKind.BUILT_IN,' packages/cli/src/ui/commands/modelsCommand.ts 2>/dev/null || echo "modelsCommand already fixed"

# Fix whoamiCommand.ts  
sed -i '10a\  kind: CommandKind.BUILT_IN,' packages/cli/src/ui/commands/whoamiCommand.ts 2>/dev/null || echo "whoamiCommand already fixed"

# Fix missing imports in package references
find packages -name "*.ts" -type f -exec grep -l "@google/gemini-cli-core" {} \; | while read file; do
  echo "Fixing imports in $file"
  sed -i 's/@google\/gemini-cli-core/@sport\/core/g' "$file"
done

# Install missing dependencies
echo "Installing missing dependencies..."
npm install @iarna/toml

echo "Done! Run 'npm run build' to check remaining errors."