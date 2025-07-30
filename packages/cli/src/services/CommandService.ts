/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '@sport/core';
import { SlashCommand } from '../ui/commands/types.js';
import { ICommandLoader } from './types.js';
import { memoryCommand } from '../ui/commands/memoryCommand.js';
import { helpCommand } from '../ui/commands/helpCommand.js';
import { clearCommand } from '../ui/commands/clearCommand.js';
import { corgiCommand } from '../ui/commands/corgiCommand.js';
import { docsCommand } from '../ui/commands/docsCommand.js';
import { mcpCommand } from '../ui/commands/mcpCommand.js';
import { authCommand } from '../ui/commands/authCommand.js';
import { themeCommand } from '../ui/commands/themeCommand.js';
import { editorCommand } from '../ui/commands/editorCommand.js';
import { chatCommand } from '../ui/commands/chatCommand.js';
import { statsCommand } from '../ui/commands/statsCommand.js';
import { privacyCommand } from '../ui/commands/privacyCommand.js';
import { aboutCommand } from '../ui/commands/aboutCommand.js';
import { extensionsCommand } from '../ui/commands/extensionsCommand.js';
import { toolsCommand } from '../ui/commands/toolsCommand.js';
import { compressCommand } from '../ui/commands/compressCommand.js';
import { ideCommand } from '../ui/commands/ideCommand.js';
import { bugCommand } from '../ui/commands/bugCommand.js';
import { quitCommand } from '../ui/commands/quitCommand.js';
import { modelsCommand } from '../ui/commands/modelsCommand.js';
import { modelCommand } from '../ui/commands/modelCommand.js';
import { restoreCommand } from '../ui/commands/restoreCommand.js';
import { whoamiCommand } from '../ui/commands/whoamiCommand.js';

const loadBuiltInCommands = async (
  config: Config | null,
): Promise<SlashCommand[]> => {
  const allCommands = [
    aboutCommand,
    authCommand,
    bugCommand,
    chatCommand,
    clearCommand,
    compressCommand,
    corgiCommand,
    docsCommand,
    editorCommand,
    extensionsCommand,
    helpCommand,
    ideCommand(config),
    mcpCommand,
    memoryCommand,
    modelCommand,
    modelsCommand,
    privacyCommand,
    quitCommand,
    restoreCommand(config),
    statsCommand,
    themeCommand,
    toolsCommand,
    whoamiCommand,
  ];

  return allCommands.filter(
    (command): command is SlashCommand => command !== null,
  );
};

/**
 * Orchestrates the discovery and loading of all slash commands for the CLI.
 *
 * This service operates on a provider-based loader pattern. It is initialized
 * with an array of `ICommandLoader` instances, each responsible for fetching
 * commands from a specific source (e.g., built-in code, local files).
 *
 * The CommandService is responsible for invoking these loaders, aggregating their
 * results, and resolving any name conflicts. This architecture allows the command
 * system to be extended with new sources without modifying the service itself.
 */
export class CommandService {
  /**
   * Private constructor to enforce the use of the async factory.
   * @param commands A readonly array of the fully loaded and de-duplicated commands.
   */
  private constructor(private readonly commands: readonly SlashCommand[]) {}

  /**
   * Asynchronously creates and initializes a new CommandService instance.
   *
   * This factory method orchestrates the entire command loading process. It
   * runs all provided loaders in parallel, aggregates their results, handles
   * name conflicts for extension commands by renaming them, and then returns a
   * fully constructed `CommandService` instance.
   *
   * Conflict resolution:
   * - Extension commands that conflict with existing commands are renamed to
   *   `extensionName.commandName`
   * - Non-extension commands (built-in, user, project) override earlier commands
   *   with the same name based on loader order
   *
   * @param loaders An array of objects that conform to the `ICommandLoader`
   *   interface. Built-in commands should come first, followed by FileCommandLoader.
   * @param signal An AbortSignal to cancel the loading process.
   * @returns A promise that resolves to a new, fully initialized `CommandService` instance.
   */
  static async create(
    loaders: ICommandLoader[],
    signal: AbortSignal,
  ): Promise<CommandService> {
    const results = await Promise.allSettled(
      loaders.map((loader) => loader.loadCommands(signal)),
    );

    const allCommands: SlashCommand[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allCommands.push(...result.value);
      } else {
        console.debug('A command loader failed:', result.reason);
      }
    }

    const commandMap = new Map<string, SlashCommand>();
    for (const cmd of allCommands) {
      let finalName = cmd.name;

      // Extension commands get renamed if they conflict with existing commands
      if (cmd.extensionName && commandMap.has(cmd.name)) {
        let renamedName = `${cmd.extensionName}.${cmd.name}`;
        let suffix = 1;

        // Keep trying until we find a name that doesn't conflict
        while (commandMap.has(renamedName)) {
          renamedName = `${cmd.extensionName}.${cmd.name}${suffix}`;
          suffix++;
        }

        finalName = renamedName;
      }

      commandMap.set(finalName, {
        ...cmd,
        name: finalName,
      });
    }

    const finalCommands = Object.freeze(Array.from(commandMap.values()));
    return new CommandService(finalCommands);
  }

  /**
   * Retrieves the currently loaded and de-duplicated list of slash commands.
   *
   * This method is a safe accessor for the service's state. It returns a
   * readonly array, preventing consumers from modifying the service's internal state.
   *
   * @returns A readonly, unified array of available `SlashCommand` objects.
   */
  getCommands(): readonly SlashCommand[] {
    return this.commands;
  }
}
