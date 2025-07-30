/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand } from './types.js';
import { MessageType } from '../types.js';
import {
  AuthType,
  createContentGenerator,
  createContentGeneratorConfig,
  isProvider,

  getTopRecommendations,
  scoreModels,
  formatModelForDisplay} from '@sport/core';

// Helper function to get dynamic recommendations
async function getDynamicRecommendations(
  allModels: Array<{ model?: any; configured: boolean }>,
): Promise<Array<{ id: string; recommendedFor: string; provider: string }>> {
  // Extract OpenRouter models for scoring
  const openRouterModels = allModels
    .filter((m) => m.configured && m.model && m.model.provider === 'OpenRouter')
    .map((m) => m.model)
    .filter(Boolean);

  if (openRouterModels.length === 0) {
    // Fallback to static recommendations if no OpenRouter models
    return [
      {
        id: 'gemini-2.5-pro',
        recommendedFor: 'Free Advanced Model',
        provider: 'Gemini',
      },
      {
        id: 'gemini-2.5-flash',
        recommendedFor: 'Free Fast Model',
        provider: 'Gemini',
      },
      {
        id: 'deepseek/deepseek-chat',
        recommendedFor: 'Cost-effective Chat',
        provider: 'OpenRouter',
      },
    ];
  }

  // Score and sort ALL models (descending by score)
  const allScored = scoreModels(openRouterModels);

  // Create curated selection: 1 Dolphin + 1 best from each major provider
  const recommendations: Array<{
    id: string;
    recommendedFor: string;
    provider: string;
  }> = [];
  const selectedIds = new Set<string>(); // Track selected model IDs to prevent duplicates
  const selectedProviders = new Set<string>(); // Track providers for extra diversity

  // Helper to extract provider from model ID
  const getProvider = (model: any): string => {
    const parts = model.id.split('/');
    return parts.length > 1 ? parts[0].toLowerCase() : model.id.toLowerCase();
  };

  // 1. Best Dolphin model (always first priority)
  const bestDolphin = allScored.find((m) => m.id.includes('dolphin'));
  if (bestDolphin) {
    const formatted = formatModelForDisplay(bestDolphin);
    recommendations.push(formatted);
    selectedIds.add(bestDolphin.id);
    selectedProviders.add(getProvider(bestDolphin));
  }

  // 2. Best OpenAI model (GPT-4o, o1, or latest)
  const bestOpenAI = allScored.find(
    (m) =>
      !selectedIds.has(m.id) &&
      (m.id.includes('gpt-4o') ||
        m.id.includes('o1-') ||
        m.id.includes('gpt-4-turbo') ||
        m.id.includes('openai/')),
  );
  if (bestOpenAI) {
    const formatted = formatModelForDisplay(bestOpenAI);
    recommendations.push(formatted);
    selectedIds.add(bestOpenAI.id);
    selectedProviders.add(getProvider(bestOpenAI));
  }

  // 3. Best Anthropic model (Claude 3.5 or latest)
  const bestAnthropic = allScored.find(
    (m) =>
      !selectedIds.has(m.id) &&
      (m.id.includes('claude-3.5') ||
        m.id.includes('claude-3-opus') ||
        m.id.includes('claude-3-sonnet') ||
        m.id.includes('anthropic/')),
  );
  if (bestAnthropic) {
    const formatted = formatModelForDisplay(bestAnthropic);
    recommendations.push(formatted);
    selectedIds.add(bestAnthropic.id);
    selectedProviders.add(getProvider(bestAnthropic));
  }

  // 4. Best Google model (Gemini 2.5 or latest)
  const bestGoogle = allScored.find(
    (m) =>
      !selectedIds.has(m.id) &&
      (m.id.includes('gemini-2.5') ||
        m.id.includes('gemma-2') ||
        m.id.includes('google/')),
  );
  if (bestGoogle) {
    const formatted = formatModelForDisplay(bestGoogle);
    recommendations.push(formatted);
    selectedIds.add(bestGoogle.id);
    selectedProviders.add(getProvider(bestGoogle));
  }

  // 5. Best XAI model (Grok)
  const bestXAI = allScored.find(
    (m) =>
      !selectedIds.has(m.id) &&
      (m.id.includes('grok') || m.id.includes('xai/')),
  );
  if (bestXAI) {
    const formatted = formatModelForDisplay(bestXAI);
    recommendations.push(formatted);
    selectedIds.add(bestXAI.id);
    selectedProviders.add(getProvider(bestXAI));
  }

  // 6. Best free model (if not already included)
  const bestFree = allScored.find(
    (m) =>
      !selectedIds.has(m.id) &&
      !selectedProviders.has(getProvider(m)) &&
      (m.id.includes(':free') ||
        m.id.includes('free') ||
        (m.pricing?.prompt && parseFloat(m.pricing.prompt) === 0)),
  );
  if (bestFree) {
    const formatted = formatModelForDisplay(bestFree);
    recommendations.push(formatted);
    selectedIds.add(bestFree.id);
    selectedProviders.add(getProvider(bestFree));
  }

  // Fill remaining slots with other top models (if any slots remain)
  const maxRecommendations = 8; // Allow slightly more for good selection
  const remainingSlots = maxRecommendations - recommendations.length;
  if (remainingSlots > 0) {
    const fillerModels = allScored
      .filter(
        (m) => !selectedIds.has(m.id) && !selectedProviders.has(getProvider(m)),
      )
      .slice(0, remainingSlots)
      .map((m) => {
        const formatted = formatModelForDisplay(m);
        selectedIds.add(m.id);
        selectedProviders.add(getProvider(m));
        return formatted;
      });

    recommendations.push(...fillerModels);
  }

  // Add Gemini models if available (avoid duplicates)
  const geminiModels = allModels
    .filter((m) => m.configured && m.model && m.model.provider === 'Gemini')
    .map((m) => m.model)
    .filter((m) => !selectedIds.has(m.id)) // Prevent duplicates
    .slice(0, 2); // Add top 2 Gemini models

  for (const geminiModel of geminiModels) {
    recommendations.push({
      id: geminiModel.id,
      recommendedFor: geminiModel.id.includes('pro')
        ? 'Free Advanced Model'
        : 'Free Fast Model',
      provider: 'Gemini',
    });
    selectedIds.add(geminiModel.id); // Track as selected
  }

  return recommendations;
}

export const modelsCommand: SlashCommand = {
  kind: CommandKind.BUILT_IN,
  name: 'models',
  description: 'list available AI models',
  action: async (context, args) => {
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

    // Show loading indicator
    context.ui.setPendingItem({
      type: MessageType.INFO,
      text: '🔍 Discovering available AI models...',
    });

    // Check if user wants to see all models
    const showAll = args.includes('all');

    // Check each auth type
    const authTypes = [
      AuthType.USE_GEMINI,
      AuthType.USE_OPENROUTER,
      AuthType.USE_CUSTOM_API,
    ];

    const allModels: Array<{
      model: any;
      provider: string;
      configured: boolean;
      configInstructions?: string;
    }> = [];
    let totalConfigured = 0;
    let totalProviders = 0;

    for (const checkAuthType of authTypes) {
      try {
        // Create a content generator config for this auth type
        const generatorConfig = createContentGeneratorConfig(
          config,
          checkAuthType,
        );

        const generator = await createContentGenerator(generatorConfig, config);

        if (isProvider(generator)) {
          totalProviders++;
          const status = await generator.checkConfiguration();
          const providerName = generator.getProviderName();

          if (status.isConfigured) {
            totalConfigured++;
            const models = await generator.getAvailableModels();
            models.forEach((model) => {
              allModels.push({
                model,
                provider: providerName,
                configured: true,
              });
            });
          } else {
            allModels.push({
              model: null,
              provider: providerName,
              configured: false,
              configInstructions: status.configInstructions,
            });
          }
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

    // Clear loading indicator
    context.ui.setPendingItem(null);

    // Create content for the models display
    let modelsContent = '';

    if (!showAll) {
      // Show curated recommendations
      modelsContent += '# 🎯 Recommended Models\n\n';
      modelsContent += '| Model | Best For | Context | Cost |\n';
      modelsContent +=
        '|---------------------------------------|-------------------|---------|------------------|\n';

      // Get dynamic recommendations based on available models and scoring
      const recommendations = await getDynamicRecommendations(allModels);

      for (const rec of recommendations) {
        const found = allModels.find(
          (m) => m.model && m.model.id === rec.id && m.configured,
        );

        if (found && found.model) {
          const model = found.model;
          const context = model.capabilities?.contextWindow
            ? `${(model.capabilities.contextWindow / 1000).toFixed(0)}k`
            : 'N/A';

          let pricing = 'N/A';
          if (model.pricing?.inputPer1k && model.pricing?.outputPer1k) {
            const inputCost = (
              parseFloat(model.pricing.inputPer1k) * 1000
            ).toFixed(2);
            const outputCost = (
              parseFloat(model.pricing.outputPer1k) * 1000
            ).toFixed(2);
            pricing = `$${inputCost} / $${outputCost}`;
          }

          // Truncate long model names to fit table while preserving bold formatting
          // Keep under 24 chars total to ensure ANSI codes don't get cut off by terminal
          const modelName =
            model.id.length > 24 ? model.id.substring(0, 20) + '...' : model.id;
          // Use ANSI escape codes for proper bold formatting in terminal
          const boldModelName = `\x1b[1m${modelName}\x1b[0m`;
          modelsContent += `| ${boldModelName} | ${rec.recommendedFor} | ${context} | ${pricing} |\n`;
        }
      }

      // Count total OpenRouter models
      const openRouterModels = allModels
        .filter(
          (m) => m.configured && m.model && m.model.provider === 'OpenRouter',
        )
        .map((m) => m.model);
      const totalOpenRouterModels = openRouterModels.length;

      modelsContent += `\n_💰 Cost is per 1M tokens (input/output). Free models show N/A._\n\n`;

      if (totalOpenRouterModels > recommendations.length) {
        modelsContent += `_...and ${totalOpenRouterModels - recommendations.filter((r) => r.provider === 'OpenRouter').length} more models_\n\n`;
      }

      modelsContent += `🔗 \x1b[1m[View all OpenRouter models](https://openrouter.ai/models)\x1b[0m\n\n`;
      modelsContent += `📊 \x1b[1mSummary\x1b[0m: ${totalConfigured} of ${totalProviders} providers configured\n\n`;
      modelsContent +=
        '_💡 \x1b[1mTip\x1b[0m: Type `/models all` to see all available models grouped by provider._\n\n';
    } else {
      // Show all models grouped by provider
      modelsContent += '# 📚 All Available Models\n\n';

      const providers = ['Gemini', 'OpenRouter', 'Custom API'];

      for (const providerName of providers) {
        const providerModels = allModels.filter(
          (m) => m.provider === providerName,
        );
        if (providerModels.length === 0) continue;

        const configured = providerModels[0].configured;
        const statusIcon = configured ? '✓' : '✗';

        modelsContent += `## ${providerName} (${statusIcon})\n\n`;

        if (!configured) {
          modelsContent += `_${providerModels[0].configInstructions || 'Not configured'}_\n\n`;
        } else {
          let models = providerModels
            .filter((m) => m.model)
            .map((m) => m.model);

          // For OpenRouter, use scoring to get top models
          if (providerName === 'OpenRouter') {
            // Score all models and take the top ones
            const scoredModels = scoreModels(models);
            models = scoredModels.slice(0, 15); // Top 15 by score
          } else {
            models = models.slice(0, 15); // Limit to first 15 models for other providers
          }

          modelsContent += '| Model | Context | Pricing |\n';
          modelsContent +=
            '|--------------------------------------|---------|------------------|\n';

          for (const model of models) {
            const context = model.capabilities?.contextWindow
              ? `${(model.capabilities.contextWindow / 1000).toFixed(0)}k`
              : 'N/A';

            let pricing = 'N/A';
            if (model.pricing?.inputPer1k && model.pricing?.outputPer1k) {
              const inputCost = (
                parseFloat(model.pricing.inputPer1k) * 1000
              ).toFixed(2);
              const outputCost = (
                parseFloat(model.pricing.outputPer1k) * 1000
              ).toFixed(2);
              pricing = `$${inputCost} / $${outputCost}`;
            }

            const isDefault = model.isDefault ? ' ⭐' : '';
            modelsContent += `| ${model.id}${isDefault} | ${context} | ${pricing} |\n`;
          }

          if (providerModels.filter((m) => m.model).length > 15) {
            modelsContent += `\n_...and ${providerModels.filter((m) => m.model).length - 15} more models_\n`;
          }

          // Add OpenRouter link for full model list
          if (providerName === 'OpenRouter') {
            modelsContent += `\n🔗 \x1b[1m[View all OpenRouter models](https://openrouter.ai/models)\x1b[0m\n`;
          }

          modelsContent += '\n';
        }
      }

      modelsContent += `📊 \x1b[1mTotal\x1b[0m: ${allModels.filter((m) => m.model).length} models available\n\n`;
    }

    // Add usage instructions
    modelsContent += '---\n\n';
    modelsContent += '\x1b[1m💬 How to use a model:\x1b[0m\n';
    modelsContent += '- In chat: `--model <model-id> Your question here`\n';
    modelsContent +=
      '- Example: `--model claude-3-opus Explain quantum computing`\n';

    // Display the models using GEMINI message type for markdown table rendering
    context.ui.addItem(
      {
        type: MessageType.GEMINI,
        text: modelsContent,
      },
      Date.now(),
    );
  },
};
