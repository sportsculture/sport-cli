/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommand } from './types.js';
import { MessageType } from '../types.js';
import {
  AuthType,
  createContentGenerator,
  createContentGeneratorConfig,
  isProvider,
} from '@google/gemini-cli-core';

export const modelsCommand: SlashCommand = {
  name: 'models',
  description: 'list available AI models',
  action: async (context) => {
    const config = context.services.config;
    if (!config) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Configuration not available',
        },
        Date.now(),
      );
      return;
    }

    // Create content for the models display
    let modelsContent = '# Available AI Models\n\n';

    // Check each auth type
    const authTypes = [
      AuthType.USE_GEMINI,
      AuthType.USE_OPENROUTER,
      AuthType.USE_CUSTOM_API,
    ];

    for (const checkAuthType of authTypes) {
      try {
        // Create a content generator config for this auth type
        const generatorConfig = createContentGeneratorConfig(
          config,
          checkAuthType,
        );

        const generator = await createContentGenerator(generatorConfig, config);

        if (isProvider(generator)) {
          const status = await generator.checkConfiguration();
          const providerName = generator.getProviderName();
          const statusIcon = status.isConfigured ? '✓' : '✗';

          modelsContent += `## ${providerName} (${statusIcon})\n\n`;

          if (status.isConfigured) {
            const models = await generator.getAvailableModels();
            for (const model of models) {
              const defaultLabel = model.isDefault ? ' **(default)**' : '';
              const description = model.description
                ? ` - ${model.description}`
                : '';
              modelsContent += `- **${model.id}**${defaultLabel}${description}\n`;

              if (model.capabilities?.contextWindow) {
                modelsContent += `  - Context: ${model.capabilities.contextWindow.toLocaleString()} tokens\n`;
              }

              if (
                model.capabilities?.strengths &&
                model.capabilities.strengths.length > 0
              ) {
                modelsContent += `  - Strengths: ${model.capabilities.strengths.join(', ')}\n`;
              }
            }
          } else {
            modelsContent += `${
              status.configInstructions || 'Not configured'
            }\n`;
          }

          modelsContent += '\n';
        }
      } catch (error) {
        // Skip providers that can't be instantiated
        if (config.getDebugMode()) {
          context.ui.setDebugMessage(
            `Failed to check ${checkAuthType}: ${error}`,
          );
        }
      }
    }

    // Add info about switching models
    modelsContent += '---\n';
    modelsContent += '_To use a specific model, type `--model <model-id>` before your prompt._\n';
    modelsContent += '_Example: `--model claude-3-opus What is recursion?`_\n';

    // Display the models using the Gemini message type for formatted output
    context.ui.addItem(
      {
        type: MessageType.GEMINI,
        text: modelsContent,
      },
      Date.now(),
    );
  },
};