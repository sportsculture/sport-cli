#!/bin/bash

# Script to help resolve merge conflicts between sport-cli and upstream gemini-cli

echo "Resolving merge conflicts..."

# Fix clearCommand.ts - accept upstream changes but keep our package name
cat > packages/cli/src/ui/commands/clearCommand.ts << 'EOF'
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { uiTelemetryService } from '@sport/core';
import { CommandKind, SlashCommand } from './types.js';

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'clear the screen and conversation history',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args) => {
    const geminiClient = context.services.config?.getGeminiClient();

    if (geminiClient) {
      context.ui.setDebugMessage('Clearing terminal and resetting chat.');
      // If resetChat fails, the exception will propagate and halt the command,
      // which is the correct behavior to signal a failure to the user.
      await geminiClient.resetChat();
    } else {
      context.ui.setDebugMessage('Clearing terminal.');
    }

    uiTelemetryService.resetLastPromptTokenCount();
    context.ui.clear();
  },
};
EOF

echo "✓ Resolved clearCommand.ts"

# For package.json files, we'll need to merge dependencies carefully
echo "Package.json files require manual resolution to preserve sport-cli dependencies"

# List all conflicted files
echo ""
echo "Conflicted files remaining:"
git diff --name-only --diff-filter=U | nl