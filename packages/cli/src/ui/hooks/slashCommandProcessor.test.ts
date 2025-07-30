/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const { mockProcessExit } = vi.hoisted(() => ({
  mockProcessExit: vi.fn((_code?: number): never => undefined as never),
}));

vi.mock('node:process', () => ({
  default: {
    exit: mockProcessExit,
  },
}));

const mockBuiltinLoadCommands = vi.fn();
vi.mock('../../services/BuiltinCommandLoader.js', () => ({
  BuiltinCommandLoader: vi.fn().mockImplementation(() => ({
    loadCommands: mockBuiltinLoadCommands,
  })),
}));

const mockFileLoadCommands = vi.fn();
vi.mock('../../services/FileCommandLoader.js', () => ({
  FileCommandLoader: vi.fn().mockImplementation(() => ({
    loadCommands: mockFileLoadCommands,
  })),
}));

const mockGetCliVersionFn = vi.fn(() => Promise.resolve('0.1.0'));
vi.mock('../../utils/version.js', () => ({
  getCliVersion: (...args: []) => mockGetCliVersionFn(...args),
}));

const mockMcpLoadCommands = vi.fn();
vi.mock('../../services/McpPromptLoader.js', () => ({
  McpPromptLoader: vi.fn().mockImplementation(() => ({
    loadCommands: mockMcpLoadCommands,
  })),
}));

vi.mock('../contexts/SessionContext.js', () => ({
  useSessionStats: vi.fn(() => ({ stats: {} })),
}));

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  type Mock,
} from 'vitest';
import open from 'open';
import { useSlashCommandProcessor } from './slashCommandProcessor.js';
import { SlashCommandProcessorResult , MessageType } from '../types.js';
import { Config, GeminiClient, ToolConfirmationOutcome } from '@sport/core';
import { useSessionStats } from '../contexts/SessionContext.js';
import * as ShowMemoryCommandModule from './useShowMemoryCommand.js';
import { CommandService } from '../../services/CommandService.js';
import {
  CommandContext,
  CommandKind,
  ConfirmShellCommandsActionReturn,
  SlashCommand,
} from '../commands/types.js';
import { LoadedSettings } from '../../config/settings.js';
import { BuiltinCommandLoader } from '../../services/BuiltinCommandLoader.js';
import { FileCommandLoader } from '../../services/FileCommandLoader.js';
import { McpPromptLoader } from '../../services/McpPromptLoader.js';

vi.mock('./useShowMemoryCommand.js', () => ({
  SHOW_MEMORY_COMMAND_NAME: '/memory show',
  createShowMemoryAction: vi.fn(() => vi.fn()),
}));

vi.mock('open', () => ({
  default: vi.fn(),
}));

vi.mock('@sport/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sport/core')>();
  return {
    ...actual,
  };
});

// Helper function to create test commands
function createTestCommand(
  override: Partial<SlashCommand>,
  kind: CommandKind = CommandKind.BUILT_IN,
): SlashCommand {
  return {
    name: 'test',
    description: 'test command',
    kind,
    ...override,
  };
}

describe('useSlashCommandProcessor', () => {
  const mockAddItem = vi.fn();
  const mockClearItems = vi.fn();
  const mockLoadHistory = vi.fn();
  const mockSetShowHelp = vi.fn();
  const mockOpenAuthDialog = vi.fn();
  const mockSetQuittingMessages = vi.fn();

  const mockConfig = {
    getProjectRoot: vi.fn(() => '/mock/cwd'),
    getSessionId: vi.fn(() => 'test-session'),
    getGeminiClient: vi.fn(() => ({
      setHistory: vi.fn().mockResolvedValue(undefined),
    })),
    getExtensions: vi.fn(() => []),
  } as unknown as Config;

  const mockSettings = {} as LoadedSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(BuiltinCommandLoader) as Mock).mockClear();
    mockBuiltinLoadCommands.mockResolvedValue([]);
    mockFileLoadCommands.mockResolvedValue([]);
    mockMcpLoadCommands.mockResolvedValue([]);
  });

  const setupProcessorHook = (
    builtinCommands: SlashCommand[] = [],
    fileCommands: SlashCommand[] = [],
    mcpCommands: SlashCommand[] = [],
    setIsProcessing = vi.fn(),
  ) => {
    mockBuiltinLoadCommands.mockResolvedValue(Object.freeze(builtinCommands));
    mockFileLoadCommands.mockResolvedValue(Object.freeze(fileCommands));
    mockMcpLoadCommands.mockResolvedValue(Object.freeze(mcpCommands));

    const { result } = renderHook(() =>
      useSlashCommandProcessor(
        mockConfig,
        mockSettings,
        mockAddItem,
        mockClearItems,
        mockLoadHistory,
        vi.fn(), // refreshStatic
        mockSetShowHelp,
        vi.fn(), // onDebugMessage
        vi.fn(), // openThemeDialog
        mockOpenAuthDialog,
        vi.fn(), // openEditorDialog
        vi.fn(), // toggleCorgiMode
        mockSetQuittingMessages,
        vi.fn(), // openPrivacyNotice
        vi.fn(), // toggleVimEnabled
        setIsProcessing,
      ),
    );

    return result;
  };

  describe('Initialization and Command Loading', () => {
    it('should initialize CommandService with all required loaders', () => {
      setupProcessorHook();
      expect(BuiltinCommandLoader).toHaveBeenCalledWith(mockConfig);
      expect(FileCommandLoader).toHaveBeenCalledWith(mockConfig);
      expect(McpPromptLoader).toHaveBeenCalledWith(mockConfig);
    });

    it('should call loadCommands and populate state after mounting', async () => {
      const testCommand = createTestCommand({ name: 'test' });
      const result = setupProcessorHook([testCommand]);

      await waitFor(() => {
        expect(result.current.slashCommands).toHaveLength(1);
      });

      expect(result.current.slashCommands[0]?.name).toBe('test');
      expect(mockBuiltinLoadCommands).toHaveBeenCalledTimes(1);
      expect(mockFileLoadCommands).toHaveBeenCalledTimes(1);
      expect(mockMcpLoadCommands).toHaveBeenCalledTimes(1);
    });

    it('should provide an immutable array of commands to consumers', async () => {
      const testCommand = createTestCommand({ name: 'test' });
      const result = setupProcessorHook([testCommand]);

      await waitFor(() => {
        expect(result.current.slashCommands).toHaveLength(1);
      });

      const commands = result.current.slashCommands;

      expect(() => {
        // @ts-expect-error - We are intentionally testing a violation of the readonly type.
        commands.push(createTestCommand({ name: 'rogue' }));
      }).toThrow(TypeError);
    });

    it('should override built-in commands with file-based commands of the same name', async () => {
      const builtinAction = vi.fn();
      const fileAction = vi.fn();

      const builtinCommand = createTestCommand({
        name: 'override',
        description: 'builtin',
        action: builtinAction,
      });
      const fileCommand = createTestCommand(
        { name: 'override', description: 'file', action: fileAction },
        CommandKind.FILE,
      );

      const result = setupProcessorHook([builtinCommand], [fileCommand]);

      await waitFor(() => {
        // The service should only return one command with the name 'override'
        expect(result.current.slashCommands).toHaveLength(1);
      });

      await act(async () => {
        await result.current.handleSlashCommand('/override');
      });

      // Only the file-based command's action should be called.
      expect(fileAction).toHaveBeenCalledTimes(1);
      expect(builtinAction).not.toHaveBeenCalled();
    });
  });

  describe('Command Execution Logic', () => {
    it('should display an error for an unknown command', async () => {
      const result = setupProcessorHook();
      await waitFor(() => expect(result.current.slashCommands).toBeDefined());

      await act(async () => {
        await result.current.handleSlashCommand('/nonexistent');
      });

      // Expect 2 calls: one for the user's input, one for the error message.
      expect(mockAddItem).toHaveBeenCalledTimes(2);
      expect(mockAddItem).toHaveBeenLastCalledWith(
        {
          type: MessageType.ERROR,
          text: 'Unknown command: /nonexistent',
        },
        expect.any(Number),
      );
    });

    it('should display help for a parent command invoked without a subcommand', async () => {
      const parentCommand: SlashCommand = {
        name: 'parent',
        description: 'a parent command',
        kind: CommandKind.BUILT_IN,
        subCommands: [
          {
            name: 'child1',
            description: 'First child.',
            kind: CommandKind.BUILT_IN,
          },
        ],
      };
      const result = setupProcessorHook([parentCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      await act(async () => {
        await result.current.handleSlashCommand('/parent');
      });

      expect(mockAddItem).toHaveBeenCalledTimes(2);
      expect(mockAddItem).toHaveBeenLastCalledWith(
        {
          type: MessageType.INFO,
          text: expect.stringContaining(
            "Command '/parent' requires a subcommand.",
          ),
        },
        expect.any(Number),
      );
    });

    it('should correctly find and execute a nested subcommand', async () => {
      const childAction = vi.fn();
      const parentCommand: SlashCommand = {
        name: 'parent',
        description: 'a parent command',
        kind: CommandKind.BUILT_IN,
        subCommands: [
          {
            name: 'child',
            description: 'a child command',
            kind: CommandKind.BUILT_IN,
            action: childAction,
          },
        ],
      };
      const result = setupProcessorHook([parentCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      await act(async () => {
        await result.current.handleSlashCommand('/parent child with args');
      });

      expect(childAction).toHaveBeenCalledTimes(1);

      expect(childAction).toHaveBeenCalledWith(
        expect.objectContaining({
          services: expect.objectContaining({
            config: mockConfig,
          }),
          ui: expect.objectContaining({
            addItem: mockAddItem,
          }),
        }),
        'with args',
      );
    });

    it('should set isProcessing to true during execution and false afterwards', async () => {
      const mockSetIsProcessing = vi.fn();
      const command = createTestCommand({
        name: 'long-running',
        action: () => new Promise((resolve) => setTimeout(resolve, 50)),
      });

      const result = setupProcessorHook([command], [], [], mockSetIsProcessing);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      const executionPromise = act(async () => {
        await result.current.handleSlashCommand('/long-running');
      });

      // It should be true immediately after starting
      expect(mockSetIsProcessing).toHaveBeenCalledWith(true);
      // It should not have been called with false yet
      expect(mockSetIsProcessing).not.toHaveBeenCalledWith(false);

      await executionPromise;

      // After the promise resolves, it should be called with false
      expect(mockSetIsProcessing).toHaveBeenCalledWith(false);
      expect(mockSetIsProcessing).toHaveBeenCalledTimes(2);
    });
  });

  describe('Action Result Handling', () => {
    it('should handle "dialog: help" action', async () => {
      const command = createTestCommand({
        name: 'helpcmd',
        action: vi.fn().mockResolvedValue({ type: 'dialog', dialog: 'help' }),
      });
      const result = setupProcessorHook([command]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      await act(async () => {
        await result.current.handleSlashCommand('/helpcmd');
      });

      expect(mockSetShowHelp).toHaveBeenCalledWith(true);
    });

    it('should handle "load_history" action', async () => {
      const command = createTestCommand({
        name: 'load',
        action: vi.fn().mockResolvedValue({
          type: 'load_history',
          history: [{ type: MessageType.USER, text: 'old prompt' }],
          clientHistory: [{ role: 'user', parts: [{ text: 'old prompt' }] }],
        }),
      });
      const result = setupProcessorHook([command]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      await act(async () => {
        await result.current.handleSlashCommand('/load');
      });

      expect(mockLoadHistory).toHaveBeenCalledWith(
        [{ type: MessageType.USER, text: 'old prompt' }],
        [{ role: 'user', parts: [{ text: 'old prompt' }] }],
      );
    });

    describe('"quit" action', () => {
      // Use fake timers for setTimeout (quit action calls setTimeout)
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      // The quit action test must call vi.runAllTimers() + hook.rerender()
      // before switching to FAKE timers to test setTimeout.
      it('should handle a "quit" action', async () => {
        const quitAction = vi
          .fn()
          .mockResolvedValue({ type: 'quit', messages: [] });
        const command = createTestCommand({
          name: 'exit',
          action: quitAction,
        });
        const result = setupProcessorHook([command]);

        await waitFor(() =>
          expect(result.current.slashCommands).toHaveLength(1),
        );

        await act(async () => {
          await result.current.handleSlashCommand('/exit');
        });

        expect(mockSetQuittingMessages).toHaveBeenCalledWith([]);

        // Fast-forward all timers
        act(() => {
          vi.runAllTimers();
        });

        expect(mockProcessExit).toHaveBeenCalledWith(0);
      });

      it('should exit with code 1 if quit action fails', async () => {
        const quitAction = vi.fn().mockRejectedValue(new Error('Quit failed'));
        const command = createTestCommand({
          name: 'exit',
          action: quitAction,
        });
        const result = setupProcessorHook([command]);

        await waitFor(() =>
          expect(result.current.slashCommands).toHaveLength(1),
        );

        await act(async () => {
          await result.current.handleSlashCommand('/exit');
        });

        act(() => {
          vi.runAllTimers();
        });

        expect(mockProcessExit).toHaveBeenCalledWith(1);
      });
    });

    it('should handle "submit_prompt" action returned from a file-based command', async () => {
      const fileCommand = createTestCommand(
        {
          name: 'filecmd',
          description: 'A command from a file',
          action: async () => ({
            type: 'submit_prompt',
            prompt: 'Generated prompt from file command',
          }),
        },
        CommandKind.FILE,
      );
      const result = setupProcessorHook([], [fileCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      const commandResult = await act(async () => await result.current.handleSlashCommand('/filecmd'));

      expect(commandResult).toEqual({
        type: 'submit_prompt',
        prompt: 'Generated prompt from file command',
      });
      expect(mockAddItem).toHaveBeenCalledWith(
        { type: MessageType.USER, text: '/filecmd' },
        expect.any(Number),
      );
    });

    it('should handle "submit_prompt" action returned from a mcp-based command', async () => {
      const mcpCommand = createTestCommand(
        {
          name: 'mcpcmd',
          description: 'A command from mcp',
          action: async () => ({
            type: 'submit_prompt',
            prompt: 'Generated prompt from mcp command',
          }),
        },
        CommandKind.MCP_PROMPT,
      );
      const result = setupProcessorHook([], [], [mcpCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      const commandResult = await act(async () => await result.current.handleSlashCommand('/mcpcmd'));

      expect(commandResult).toEqual({
        type: 'submit_prompt',
        prompt: 'Generated prompt from mcp command',
      });
      expect(mockAddItem).toHaveBeenCalledWith(
        { type: MessageType.USER, text: '/mcpcmd' },
        expect.any(Number),
      );
    });
  });

  describe('Shell Command Confirmation Flow', () => {
    // Use a generic vi.fn() for the action. We will change its behavior in each test.
    const mockCommandAction = vi.fn();

    const shellCommand = createTestCommand({
      name: 'shellcmd',
      action: mockCommandAction,
    });

    beforeEach(() => {
      mockCommandAction.mockReset();
    });

    it('should handle "confirm_shell_commands" action and return confirmation request', async () => {
      mockCommandAction.mockResolvedValue({
        type: 'confirm_shell_commands',
        commands: ['ls -la', 'pwd'],
        callback: vi.fn(),
      } as ConfirmShellCommandsActionReturn);

      const result = setupProcessorHook([shellCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      const commandResult = await act(async () => await result.current.handleSlashCommand('/shellcmd'));

      expect(result.current.shellConfirmationRequest).toEqual({
        commands: ['ls -la', 'pwd'],
        callback: expect.any(Function),
      });

      expect(commandResult).toEqual({
        type: 'shell_confirmation_pending',
      });
    });

    it('should process approved shell commands via confirmation callback', async () => {
      const shellCallback = vi.fn();
      mockCommandAction.mockResolvedValue({
        type: 'confirm_shell_commands',
        commands: ['echo "approved"'],
        callback: shellCallback,
      } as ConfirmShellCommandsActionReturn);

      const result = setupProcessorHook([shellCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      await act(async () => {
        await result.current.handleSlashCommand('/shellcmd');
      });

      // Simulate user approval
      await act(async () => {
        await result.current.shellConfirmationRequest?.callback(
          ToolConfirmationOutcome.Approved,
        );
      });

      expect(shellCallback).toHaveBeenCalledWith(
        ToolConfirmationOutcome.Approved,
      );
      expect(result.current.shellConfirmationRequest).toBeNull();
    });

    it('should handle rejected shell commands', async () => {
      const shellCallback = vi.fn();
      mockCommandAction.mockResolvedValue({
        type: 'confirm_shell_commands',
        commands: ['rm -rf /'],
        callback: shellCallback,
      } as ConfirmShellCommandsActionReturn);

      const result = setupProcessorHook([shellCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      await act(async () => {
        await result.current.handleSlashCommand('/shellcmd');
      });

      // Simulate user rejection
      await act(async () => {
        await result.current.shellConfirmationRequest?.callback(
          ToolConfirmationOutcome.Rejected,
        );
      });

      expect(shellCallback).toHaveBeenCalledWith(
        ToolConfirmationOutcome.Rejected,
      );
      expect(result.current.shellConfirmationRequest).toBeNull();
    });

    it('should clear confirmation request when starting a new command', async () => {
      mockCommandAction.mockResolvedValue({
        type: 'confirm_shell_commands',
        commands: ['echo "first"'],
        callback: vi.fn(),
      } as ConfirmShellCommandsActionReturn);

      const result = setupProcessorHook([shellCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      // First command sets up confirmation
      await act(async () => {
        await result.current.handleSlashCommand('/shellcmd');
      });

      expect(result.current.shellConfirmationRequest).not.toBeNull();

      // Second command should clear the previous confirmation
      mockCommandAction.mockResolvedValue({
        type: 'message',
        messageType: 'info',
        content: 'New command',
      });

      await act(async () => {
        await result.current.handleSlashCommand('/shellcmd');
      });

      expect(result.current.shellConfirmationRequest).toBeNull();
    });
  });

  describe('Command Precedence', () => {
    it('should override mcp-based commands with file-based commands of the same name', async () => {
      const mcpAction = vi.fn();
      const fileAction = vi.fn();

      const mcpCommand = createTestCommand(
        {
          name: 'override',
          description: 'mcp',
          action: mcpAction,
        },
        CommandKind.MCP_PROMPT,
      );
      const fileCommand = createTestCommand(
        { name: 'override', description: 'file', action: fileAction },
        CommandKind.FILE,
      );

      const result = setupProcessorHook([], [fileCommand], [mcpCommand]);

      await waitFor(() => {
        // The service should only return one command with the name 'override'
        expect(result.current.slashCommands).toHaveLength(1);
      });

      await act(async () => {
        await result.current.handleSlashCommand('/override');
      });

      // Only the file-based command's action should be called.
      expect(fileAction).toHaveBeenCalledTimes(1);
      expect(mcpAction).not.toHaveBeenCalled();
    });

    it('should prioritize a command with a primary name over a command with a matching alias', async () => {
      const quitAction = vi.fn();
      const exitAction = vi.fn();

      const quitCommand = createTestCommand({
        name: 'quit',
        altNames: ['exit'],
        action: quitAction,
      });

      const exitCommand = createTestCommand({
        name: 'exit',
        action: exitAction,
      });

      const result = setupProcessorHook([quitCommand, exitCommand]);

      await waitFor(() => {
        expect(result.current.slashCommands).toHaveLength(2);
      });

      await act(async () => {
        await result.current.handleSlashCommand('/exit');
      });

      // The 'exit' command should be called, not the 'quit' command
      expect(exitAction).toHaveBeenCalledTimes(1);
      expect(quitAction).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should abort command loading when the hook unmounts', () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      const { unmount } = renderHook(() =>
        useSlashCommandProcessor(
          mockConfig,
          mockSettings,
          mockAddItem,
          mockClearItems,
          mockLoadHistory,
          vi.fn(), // refreshStatic
          mockSetShowHelp,
          vi.fn(), // onDebugMessage
          vi.fn(), // openThemeDialog
          mockOpenAuthDialog,
          vi.fn(), // openEditorDialog,
          vi.fn(), // toggleCorgiMode
          mockSetQuittingMessages,
          vi.fn(), // openPrivacyNotice
          vi.fn(), // toggleVimEnabled
          vi.fn(), // setIsProcessing
        ),
      );

      unmount();

      expect(abortSpy).toHaveBeenCalled();
      abortSpy.mockRestore();
    });
  });
});
