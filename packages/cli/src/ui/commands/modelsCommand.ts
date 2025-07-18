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

    const allModels: Array<{model: any; provider: string; configured: boolean; configInstructions?: string}> = [];
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
            models.forEach(model => {
              allModels.push({ model, provider: providerName, configured: true });
            });
          } else {
            allModels.push({ 
              model: null, 
              provider: providerName, 
              configured: false,
              configInstructions: status.configInstructions 
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
      modelsContent += '| Model | Best For | Context | Cost (per 1M tokens) |\n';
      modelsContent += '|-------|----------|---------|---------------------|\n';
      
      // Define curated recommendations
      const recommendations = [
        { id: 'openai/gpt-4o', recommendedFor: 'Advanced Reasoning', provider: 'OpenRouter' },
        { id: 'anthropic/claude-3-haiku', recommendedFor: 'Fast & Cheap Chat', provider: 'OpenRouter' },
        { id: 'gemini-2.5-flash', recommendedFor: 'Balanced Performance', provider: 'Gemini' },
        { id: 'deepseek/deepseek-coder', recommendedFor: 'Code Generation', provider: 'OpenRouter' },
        { id: 'mistralai/mistral-large', recommendedFor: 'Creative Writing', provider: 'OpenRouter' },
        { id: 'deepseek/deepseek-chat', recommendedFor: 'Cost-effective Chat', provider: 'OpenRouter' },
      ];
      
      for (const rec of recommendations) {
        const found = allModels.find(m => 
          m.model && m.model.id === rec.id && m.configured
        );
        
        if (found && found.model) {
          const model = found.model;
          const context = model.capabilities?.contextWindow ? 
            `${(model.capabilities.contextWindow / 1000).toFixed(0)}k` : 'N/A';
          
          let pricing = 'N/A';
          if (model.pricing?.inputPer1k && model.pricing?.outputPer1k) {
            const inputCost = (model.pricing.inputPer1k * 1000).toFixed(2);
            const outputCost = (model.pricing.outputPer1k * 1000).toFixed(2);
            pricing = `$${inputCost} / $${outputCost}`;
          }
          
          modelsContent += `| **${model.id}** | ${rec.recommendedFor} | ${context} | ${pricing} |\n`;
        }
      }
      
      modelsContent += `\n📊 **Summary**: ${totalConfigured} of ${totalProviders} providers configured\n\n`;
      modelsContent += '_💡 Tip: Type `/models all` to see all available models grouped by provider._\n\n';
    } else {
      // Show all models grouped by provider
      modelsContent += '# 📚 All Available Models\n\n';
      
      const providers = ['Gemini', 'OpenRouter', 'Custom API'];
      
      for (const providerName of providers) {
        const providerModels = allModels.filter(m => m.provider === providerName);
        if (providerModels.length === 0) continue;
        
        const configured = providerModels[0].configured;
        const statusIcon = configured ? '✓' : '✗';
        
        modelsContent += `## ${providerName} (${statusIcon})\n\n`;
        
        if (!configured) {
          modelsContent += `_${providerModels[0].configInstructions || 'Not configured'}_\n\n`;
        } else {
          const models = providerModels
            .filter(m => m.model)
            .slice(0, 15); // Limit to first 15 models per provider
          
          modelsContent += '| Model | Context | Pricing |\n';
          modelsContent += '|-------|---------|--------|\n';
          
          for (const { model } of models) {
            const context = model.capabilities?.contextWindow ? 
              `${(model.capabilities.contextWindow / 1000).toFixed(0)}k` : 'N/A';
            
            let pricing = 'N/A';
            if (model.pricing?.inputPer1k && model.pricing?.outputPer1k) {
              const inputCost = (model.pricing.inputPer1k * 1000).toFixed(2);
              const outputCost = (model.pricing.outputPer1k * 1000).toFixed(2);
              pricing = `$${inputCost} / $${outputCost}`;
            }
            
            const isDefault = model.isDefault ? ' ⭐' : '';
            modelsContent += `| ${model.id}${isDefault} | ${context} | ${pricing} |\n`;
          }
          
          if (providerModels.filter(m => m.model).length > 15) {
            modelsContent += `\n_...and ${providerModels.filter(m => m.model).length - 15} more models_\n`;
          }
          
          modelsContent += '\n';
        }
      }
      
      modelsContent += `📊 **Total**: ${allModels.filter(m => m.model).length} models available\n\n`;
    }
    
    // Add usage instructions
    modelsContent += '---\n\n';
    modelsContent += '**💬 How to use a model:**\n';
    modelsContent += '- In chat: `--model <model-id> Your question here`\n';
    modelsContent += '- Example: `--model claude-3-opus Explain quantum computing`\n';

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