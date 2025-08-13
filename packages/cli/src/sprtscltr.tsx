/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from 'ink';
import { AppWrapper } from './ui/App.js';
import { loadCliConfig, parseArguments } from './config/config.js';
import { readStdin } from './utils/readStdin.js';
import { basename } from 'node:path';
import v8 from 'node:v8';
import os from 'node:os';
import dns from 'node:dns';
import { spawn } from 'node:child_process';
import { start_sandbox } from './utils/sandbox.js';
import {
  DnsResolutionOrder,
  LoadedSettings,
  loadSettings,
  SettingScope,
} from './config/settings.js';
import { themeManager } from './ui/themes/theme-manager.js';
import { getStartupWarnings } from './utils/startupWarnings.js';
import { getUserStartupWarnings } from './utils/userStartupWarnings.js';
import { runNonInteractive } from './nonInteractiveCli.js';
import { loadExtensions } from './config/extension.js';
import { cleanupCheckpoints, registerCleanup } from './utils/cleanup.js';
import { getCliVersion } from './utils/version.js';
import {
  Config,
  sessionId,
  logUserPrompt,
  AuthType,
  getOauthClient,
  shouldAttemptBrowserLaunch,
  inferAuthTypeFromModel,
  DEFAULT_GEMINI_MODEL,
} from '@sport/core';
import { validateAuthMethod } from './config/auth.js';
import { setMaxSizedBoxDebugging } from './ui/components/shared/MaxSizedBox.js';
import { validateNonInteractiveAuth } from './validateNonInterActiveAuth.js';
import { checkForUpdates } from './ui/utils/updateCheck.js';
import { handleAutoUpdate } from './utils/handleAutoUpdate.js';
import { appEvents, AppEvent } from './utils/events.js';
import { SettingsContext } from './ui/contexts/SettingsContext.js';

export function validateDnsResolutionOrder(
  order: string | undefined,
): DnsResolutionOrder {
  const defaultValue: DnsResolutionOrder = 'ipv4first';
  if (order === undefined) {
    return defaultValue;
  }
  if (order === 'ipv4first' || order === 'verbatim') {
    return order;
  }
  // We don't want to throw here, just warn and use the default.
  console.warn(
    `Invalid value for dnsResolutionOrder in settings: "${order}". Using default "${defaultValue}".`,
  );
  return defaultValue;
}

function getNodeMemoryArgs(config: Config): string[] {
  const totalMemoryMB = os.totalmem() / (1024 * 1024);
  const heapStats = v8.getHeapStatistics();
  const currentMaxOldSpaceSizeMb = Math.floor(
    heapStats.heap_size_limit / 1024 / 1024,
  );

  // Set target to 50% of total memory
  const targetMaxOldSpaceSizeInMB = Math.floor(totalMemoryMB * 0.5);
  if (config.getDebugMode()) {
    console.debug(
      `Current heap size ${currentMaxOldSpaceSizeMb.toFixed(2)} MB`,
    );
  }

  if (process.env.GEMINI_CLI_NO_RELAUNCH) {
    return [];
  }

  if (targetMaxOldSpaceSizeInMB > currentMaxOldSpaceSizeMb) {
    if (config.getDebugMode()) {
      console.debug(
        `Need to relaunch with more memory: ${targetMaxOldSpaceSizeInMB.toFixed(2)} MB`,
      );
    }
    return [`--max-old-space-size=${targetMaxOldSpaceSizeInMB}`];
  }

  return [];
}

async function relaunchWithAdditionalArgs(additionalArgs: string[]) {
  const nodeArgs = [...additionalArgs, ...process.argv.slice(1)];
  const newEnv = { ...process.env, GEMINI_CLI_NO_RELAUNCH: 'true' };

  const child = spawn(process.execPath, nodeArgs, {
    stdio: 'inherit',
    env: newEnv,
  });

  await new Promise((resolve) => child.on('close', resolve));
  process.exit(0);
}
import { runAcpPeer } from './acp/acpPeer.js';

export function setupUnhandledRejectionHandler() {
  let unhandledRejectionOccurred = false;
  process.on('unhandledRejection', (reason, _promise) => {
    const errorMessage = `=========================================
This is an unexpected error. Please file a bug report using the /bug tool.
CRITICAL: Unhandled Promise Rejection!
=========================================
Reason: ${reason}${
      reason instanceof Error && reason.stack
        ? `
Stack trace:
${reason.stack}`
        : ''
    }`;
    appEvents.emit(AppEvent.LogError, errorMessage);
    if (!unhandledRejectionOccurred) {
      unhandledRejectionOccurred = true;
      appEvents.emit(AppEvent.OpenDebugConsole);
    }
  });
}

export async function main() {
  setupUnhandledRejectionHandler();
  const workspaceRoot = process.cwd();
  const settings = loadSettings(workspaceRoot);

  await cleanupCheckpoints();
  if (settings.errors.length > 0) {
    for (const error of settings.errors) {
      let errorMessage = `Error in ${error.path}: ${error.message}`;
      if (!process.env.NO_COLOR) {
        errorMessage = `\x1b[31m${errorMessage}\x1b[0m`;
      }
      console.error(errorMessage);
      console.error(`Please fix ${error.path} and try again.`);
    }
    process.exit(1);
  }

  const argv = await parseArguments();
  const extensions = loadExtensions(workspaceRoot);
  const config = await loadCliConfig(
    settings.merged,
    extensions,
    sessionId,
    argv,
  );

  dns.setDefaultResultOrder(
    validateDnsResolutionOrder(settings.merged.dnsResolutionOrder),
  );

  if (argv.promptInteractive && !process.stdin.isTTY) {
    console.error(
      'Error: The --prompt-interactive flag is not supported when piping input from stdin.',
    );
    process.exit(1);
  }

  if (config.getListExtensions()) {
    console.log('Installed extensions:');
    for (const extension of extensions) {
      console.log(`- ${extension.config.name}`);
    }
    process.exit(0);
  }

  if (config.getListModels()) {
    // Import necessary modules at the top of the function to avoid hoisting issues
    const { createContentGenerator, createContentGeneratorConfig } =
      await import('@sport/core');
    const { isProvider } = await import('@sport/core');

    console.log('🔍 Discovering available AI models...\n');

    // Check if user wants to see all models
    const showAll = process.argv.includes('--all');

    // Create content generators for each possible auth type
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
    const configuredProviders: string[] = [];
    const unconfiguredProviders: string[] = [];

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
            configuredProviders.push(providerName);
            const models = await generator.getAvailableModels();
            models.forEach((model) => {
              allModels.push({
                model,
                provider: providerName,
                configured: true,
              });
            });
          } else {
            unconfiguredProviders.push(providerName);
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
          console.error(`Failed to check ${checkAuthType}:`, error);
        }
      }
    }

    if (!showAll) {
      // Try to fetch rankings from the scraped data
      let rankingsData: any = null;
      try {
        const response = await fetch('https://gist.githubusercontent.com/sportsculture/a8f3bac998db4178457d3bd9f0a0d705/raw/openrouter-rankings.json');
        if (response.ok) {
          rankingsData = await response.json();
        }
      } catch (err) {
        // Fall back to default recommendations if rankings fetch fails
        if (config.getDebugMode()) {
          console.debug('Failed to fetch rankings:', err);
        }
      }

      // Get configured models
      const configuredModels = allModels.filter(m => m.configured && m.model);
      
      // If we have rankings data, use that to prioritize models
      let programmingModels;
      if (rankingsData?.currentSnapshot?.rankings) {
        const rankedModelIds = rankingsData.currentSnapshot.rankings.map((r: any) => r.modelId.toLowerCase());
        
        // Sort configured models based on rankings
        programmingModels = configuredModels
          .filter(m => {
            const id = m.model.id.toLowerCase();
            // Check if model is in top rankings or is a programming model
            return rankedModelIds.some((rankedId: string) => id.includes(rankedId.split('/').pop())) ||
                   id.includes('code') || 
                   id.includes('coder') || 
                   id.includes('gpt-4') ||
                   id.includes('claude') ||
                   id.includes('deepseek') ||
                   id.includes('sonnet') ||
                   id.includes('opus');
          })
          .map(m => {
            const modelId = m.model.id.toLowerCase();
            const rankingIndex = rankedModelIds.findIndex((rankedId: string) => 
              modelId.includes(rankedId.split('/').pop())
            );
            
            // Calculate score: higher for models in rankings, lower rank = higher score
            const rankingScore = rankingIndex >= 0 ? (10 - rankingIndex) * 100 : 0;
            
            return {
              ...m.model,
              programmingScore: rankingScore +
                (m.model.capabilities?.contextWindow || 0) / 10000
            };
          })
          .sort((a, b) => b.programmingScore - a.programmingScore);
      } else {
        // Fallback to original scoring logic
        programmingModels = configuredModels
          .filter(m => {
            const id = m.model.id.toLowerCase();
            // Prioritize models known for programming
            return id.includes('code') || 
                   id.includes('coder') || 
                   id.includes('gpt-4') ||
                   id.includes('claude') ||
                   id.includes('deepseek') ||
                   id.includes('sonnet') ||
                   id.includes('opus');
          })
          .map(m => ({
            ...m.model,
            programmingScore: 
              (m.model.id.includes('gpt-4o') ? 100 : 0) +
              (m.model.id.includes('claude-3.5-sonnet') ? 95 : 0) +
              (m.model.id.includes('deepseek-coder') ? 90 : 0) +
              (m.model.id.includes('claude-3-opus') ? 85 : 0) +
              (m.model.id.includes('gpt-4-turbo') ? 80 : 0) +
              (m.model.capabilities?.contextWindow || 0) / 10000
          }))
          .sort((a, b) => b.programmingScore - a.programmingScore);
      }
      
      // Get cheapest models from top 20 programming models
      const top20Programming = programmingModels.slice(0, 20);
      const cheapestProgramming = [...top20Programming]
        .filter(m => m.pricing?.inputPer1k)
        .sort((a, b) => {
          const aCost = parseFloat(a.pricing.inputPer1k) + parseFloat(a.pricing.outputPer1k);
          const bCost = parseFloat(b.pricing.inputPer1k) + parseFloat(b.pricing.outputPer1k);
          return aCost - bCost;
        })
        .slice(0, 3);

      // Combine recommendations
      const recommendations = [];
      
      // Add top models based on rankings or defaults
      if (rankingsData?.currentSnapshot?.rankings && programmingModels.length > 0) {
        // Use actual rankings data to label recommendations
        const rankings = rankingsData.currentSnapshot.rankings;
        for (let i = 0; i < Math.min(3, programmingModels.length); i++) {
          const model = programmingModels[i];
          const ranking = rankings.find((r: any) => 
            model.id.toLowerCase().includes(r.modelId.split('/').pop().toLowerCase())
          );
          
          let label;
          if (ranking) {
            label = `#${ranking.rank} ${ranking.modelName}`;
          } else {
            label = i === 0 ? '🏆 Best for Programming' :
                   i === 1 ? '🥈 Programming Runner-up' :
                   '🥉 Programming 3rd Place';
          }
          
          recommendations.push({ model, recommendedFor: label });
        }
      } else if (programmingModels.length > 0) {
        // Fallback to default labels
        recommendations.push(
          { model: programmingModels[0], recommendedFor: '🏆 Best for Programming' },
          { model: programmingModels[1], recommendedFor: '🥈 Programming Runner-up' },
          { model: programmingModels[2], recommendedFor: '🥉 Programming 3rd Place' }
        );
      }
      
      // Add cheapest 3 from top 20
      cheapestProgramming.forEach((model, i) => {
        recommendations.push({
          model,
          recommendedFor: i === 0 ? '💰 Most Affordable (Top 20)' : 
                         i === 1 ? '💵 Budget Option (Top 20)' :
                         '💸 Value Choice (Top 20)'
        });
      });
      
      // Add any Gemini free models if available
      const geminiModels = configuredModels.filter(m => m.provider === 'Gemini' && m.model);
      if (geminiModels.length > 0) {
        recommendations.push({
          model: geminiModels[0].model,
          recommendedFor: '🆓 Free Tier Available'
        });
      }
      
      // Show recommendations
      console.log('Recommended Models:\n');
      console.log(
        '  Model ID                          Recommended For         Context   Cost (per 1M tokens, In/Out)',
      );
      console.log(
        '  --------------------------------- ----------------------- --------- --------------------------',
      );

      for (const rec of recommendations.slice(0, 7)) { // Show max 7 recommendations
        if (!rec.model) continue;
        
        const model = rec.model;
        const context = model.capabilities?.contextWindow
          ? `${(model.capabilities.contextWindow / 1000).toFixed(0)}k`
          : 'N/A';

        let pricing = 'N/A';
        if (model.pricing?.inputPer1k && model.pricing?.outputPer1k) {
          const inputCost = (model.pricing.inputPer1k * 1000).toFixed(2);
          const outputCost = (model.pricing.outputPer1k * 1000).toFixed(2);
          pricing = `$${inputCost} / $${outputCost}`;
        } else if (rec.recommendedFor.includes('Free')) {
          pricing = 'Free';
        }

        console.log(
          `  ${(model.id || '').padEnd(33)} ${rec.recommendedFor.padEnd(23)} ${context.padEnd(9)} ${pricing}`,
        );
      }

      // Show provider status
      console.log('\n📊 Provider Status:');
      if (configuredProviders.length > 0) {
        console.log(`  ✅ Configured: ${configuredProviders.join(', ')}`);
      }
      if (unconfiguredProviders.length > 0) {
        console.log(`  ❌ Not configured: ${unconfiguredProviders.join(', ')}`);
      }
      
      // Show how recommendations work
      console.log('\n💡 How recommendations work:');
      if (rankingsData?.currentSnapshot) {
        console.log('  • Rankings based on OpenRouter real-time usage data');
        console.log(`  • Updated: ${new Date(rankingsData.lastUpdated).toLocaleDateString()}`);
      } else {
        console.log('  • Models are scored based on capabilities, cost, and performance');
      }
      console.log('  • Top models from each provider are selected');
      console.log('  • Recommendations update based on available models');
      
      // Show top 10 rankings if available
      if (rankingsData?.currentSnapshot?.rankings) {
        console.log('\n🏆 Top 10 OpenRouter Programming Rankings (Weekly):');
        console.log(
          '  Rank  Model                           Model ID                              Tokens    Growth    Cost ($/MTok)',
        );
        console.log(
          '  ----  ------------------------------  ------------------------------------  --------  --------  -------------',
        );
        
        rankingsData.currentSnapshot.rankings.slice(0, 10).forEach((ranking: any) => {
          const rank = String(ranking.rank).padEnd(4);
          const modelName = ranking.modelName.substring(0, 30).padEnd(30);
          const modelId = (ranking.modelId || `${ranking.provider}/unknown`).substring(0, 36).padEnd(36);
          const tokens = ranking.usage?.totalTokens 
            ? `${(ranking.usage.totalTokens / 1e9).toFixed(0)}B`.padEnd(8)
            : 'N/A'.padEnd(8);
          const growth = ranking.usage?.percentageChange !== undefined
            ? `${ranking.usage.percentageChange > 0 ? '+' : ''}${ranking.usage.percentageChange}%`.padEnd(8)
            : 'stable'.padEnd(8);
          const cost = ranking.cost?.input === 0 
            ? 'Free'
            : ranking.cost 
              ? `$${ranking.cost.input}/$${ranking.cost.output}`
              : 'Check site';
          
          console.log(`  ${rank}  ${modelName}  ${modelId}  ${tokens}  ${growth}  ${cost}`);
        });
        
        console.log('\n  💡 Cost format: Input/Output per million tokens');
        console.log('  📈 Growth: Week-over-week percentage change in usage');
        console.log('\n  🚀 To use a model: sport --model <model-id>');
        console.log('     Example: sport --model anthropic/claude-3.5-sonnet-20241022');
        console.log('     Or use /model command during your session');
        console.log('\n  📖 Browse all models at: https://openrouter.ai/models');
        console.log('     Find exact model IDs, pricing, and capabilities');
      }
      
      console.log(
        '\nTo see all available models grouped by provider, run: sport --models --all\n',
      );
    } else {
      // Show all models grouped by provider
      const providers = ['Gemini', 'OpenRouter', 'Custom API'];

      for (const providerName of providers) {
        const providerModels = allModels.filter(
          (m) => m.provider === providerName,
        );
        if (providerModels.length === 0) continue;

        const configured = providerModels[0].configured;
        const statusIcon = configured ? '✓' : '✗';

        console.log(`--- ${providerName} (${statusIcon}) ---`);

        if (!configured) {
          console.log(
            `  ${providerModels[0].configInstructions || 'Not configured'}`,
          );
        } else {
          const models = providerModels.filter((m) => m.model).slice(0, 20); // Limit to first 20 models per provider

          console.log(
            '  Model ID                          Context   Cost (per 1M tokens, In/Out)',
          );
          console.log(
            '  --------------------------------- --------- --------------------------',
          );

          for (const { model } of models) {
            const context = model.capabilities?.contextWindow
              ? `${(model.capabilities.contextWindow / 1000).toFixed(0)}k`
              : 'N/A';

            let pricing = 'N/A';
            if (model.pricing?.inputPer1k && model.pricing?.outputPer1k) {
              const inputCost = (model.pricing.inputPer1k * 1000).toFixed(2);
              const outputCost = (model.pricing.outputPer1k * 1000).toFixed(2);
              pricing = `$${inputCost} / $${outputCost}`;
            }

            console.log(
              `  ${model.id.padEnd(33)} ${context.padEnd(9)} ${pricing}`,
            );
          }

          if (providerModels.filter((m) => m.model).length > 20) {
            console.log(
              `  ...and ${providerModels.filter((m) => m.model).length - 20} more models`,
            );
          }
        }

        console.log();
      }

      console.log(
        `📊 Total: ${allModels.filter((m) => m.model).length} models available across ${totalConfigured} configured providers\n`,
      );
    }

    process.exit(0);
  }

  // Set a default auth type if one isn't set.
  if (!settings.merged.selectedAuthType) {
    if (process.env.CLOUD_SHELL === 'true') {
      settings.setValue(
        SettingScope.User,
        'selectedAuthType',
        AuthType.CLOUD_SHELL,
      );
    } else if (argv.model && argv.model !== DEFAULT_GEMINI_MODEL) {
      // Try to infer auth type from the model ID
      const inferredAuthType = inferAuthTypeFromModel(argv.model);
      if (inferredAuthType) {
        settings.setValue(
          SettingScope.User,
          'selectedAuthType',
          inferredAuthType,
        );
        if (config.getDebugMode()) {
          console.debug(
            `Inferred auth type ${inferredAuthType} from model ${argv.model}`,
          );
        }
      }
    }
  }

  setMaxSizedBoxDebugging(config.getDebugMode());

  await config.initialize();

  // Load custom themes from settings
  themeManager.loadCustomThemes(settings.merged.customThemes);

  if (settings.merged.theme) {
    if (!themeManager.setActiveTheme(settings.merged.theme)) {
      // If the theme is not found during initial load, log a warning and continue.
      // The useThemeCommand hook in App.tsx will handle opening the dialog.
      console.warn(`Warning: Theme "${settings.merged.theme}" not found.`);
    }
  }

  // hop into sandbox if we are outside and sandboxing is enabled
  if (!process.env.SANDBOX) {
    const memoryArgs = settings.merged.autoConfigureMaxOldSpaceSize
      ? getNodeMemoryArgs(config)
      : [];
    const sandboxConfig = config.getSandbox();
    if (sandboxConfig) {
      if (
        settings.merged.selectedAuthType &&
        !settings.merged.useExternalAuth
      ) {
        // Validate authentication here because the sandbox will interfere with the Oauth2 web redirect.
        try {
          const err = validateAuthMethod(settings.merged.selectedAuthType);
          if (err) {
            throw new Error(err);
          }
          await config.refreshAuth(settings.merged.selectedAuthType);
        } catch (err) {
          console.error('Error authenticating:', err);
          process.exit(1);
        }
      }
      await start_sandbox(sandboxConfig, memoryArgs);
      process.exit(0);
    } else {
      // Not in a sandbox and not entering one, so relaunch with additional
      // arguments to control memory usage if needed.
      if (memoryArgs.length > 0) {
        await relaunchWithAdditionalArgs(memoryArgs);
        process.exit(0);
      }
    }
  }

  if (
    settings.merged.selectedAuthType === AuthType.LOGIN_WITH_GOOGLE &&
    config.isBrowserLaunchSuppressed()
  ) {
    // Do oauth before app renders to make copying the link possible.
    await getOauthClient(settings.merged.selectedAuthType, config);
  }

  if (config.getExperimentalAcp()) {
    return runAcpPeer(config, settings);
  }

  let input = config.getQuestion();
  const startupWarnings = [
    ...(await getStartupWarnings()),
    ...(await getUserStartupWarnings(workspaceRoot)),
  ];

  // Render UI, passing necessary config values. Check that there is no command line question.
  if (config.isInteractive()) {
    const version = await getCliVersion();
    setWindowTitle(basename(workspaceRoot), settings);
    const instance = render(
      <React.StrictMode>
        <SettingsContext.Provider value={settings}>
          <AppWrapper
            config={config}
            settings={settings}
            startupWarnings={startupWarnings}
            version={version}
          />
        </SettingsContext.Provider>
      </React.StrictMode>,
      { exitOnCtrlC: false },
    );

    checkForUpdates()
      .then((info) => {
        handleAutoUpdate(info, settings, config.getProjectRoot());
      })
      .catch((err) => {
        // Silently ignore update check errors.
        if (config.getDebugMode()) {
          console.error('Update check failed:', err);
        }
      });

    registerCleanup(() => instance.unmount());
    return;
  }
  // If not a TTY, read from stdin
  // This is for cases where the user pipes input directly into the command
  if (!process.stdin.isTTY && !input) {
    input += await readStdin();
  }
  if (!input) {
    console.error('No input provided via stdin.');
    process.exit(1);
  }

  const prompt_id = Math.random().toString(16).slice(2);
  logUserPrompt(config, {
    'event.name': 'user_prompt',
    'event.timestamp': new Date().toISOString(),
    prompt: input,
    prompt_id,
    auth_type: config.getContentGeneratorConfig()?.authType,
    prompt_length: input.length,
  });

  const nonInteractiveConfig = await validateNonInteractiveAuth(
    settings.merged.selectedAuthType,
    settings.merged.useExternalAuth,
    config,
  );

  await runNonInteractive(nonInteractiveConfig, input, prompt_id);
  process.exit(0);
}

function setWindowTitle(title: string, settings: LoadedSettings) {
  if (!settings.merged.hideWindowTitle) {
    const windowTitle = (process.env.CLI_TITLE || `Gemini - ${title}`).replace(
      // eslint-disable-next-line no-control-regex
      /[\x00-\x1F\x7F]/g,
      '',
    );
    process.stdout.write(`\x1b]2;${windowTitle}\x07`);

    process.on('exit', () => {
      process.stdout.write(`\x1b]2;\x07`);
    });
  }
}
