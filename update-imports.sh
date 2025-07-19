#!/bin/bash

# Update all TypeScript/JavaScript imports from @google/gemini-cli-core to @sport/core
echo "Updating imports from @google/gemini-cli-core to @sport/core..."

find packages/cli/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i "s|from '@google/gemini-cli-core'|from '@sport/core'|g" {} \;

echo "Import updates complete!"