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

import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, beforeAll, Mock } from 'vitest';
import open from 'open';
import { useSlashCommandProcessor } from './slashCommandProcessor.js';
import { SlashCommandProcessorResult } from '../types.js';
import { Config, GeminiClient } from '@sport/core';
import { useSessionStats } from '../contexts/SessionContext.js';
import { LoadedSettings } from '../../config/settings.js';
import * as ShowMemoryCommandModule from './useShowMemoryCommand.js';
import { CommandService } from '../../services/CommandService.js';
import { SlashCommand } from '../commands/types.js';

vi.mock('../contexts/SessionContext.js', () => ({
  useSessionStats: vi.fn(() => ({ stats: {} })),
}));

import { act, renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { useSlashCommandProcessor } from './slashCommandProcessor.js';
import { CommandKind, SlashCommand } from '../commands/types.js';
import { Config } from '@sport/core';
import { LoadedSettings } from '../../config/settings.js';
import { MessageType } from '../types.js';
import { BuiltinCommandLoader } from '../../services/BuiltinCommandLoader.js';
import { FileCommandLoader } from '../../services/FileCommandLoader.js';

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

describe('useSlashCommandProcessor', () => {
  const mockAddItem = vi.fn();
  const mockClearItems = vi.fn();
  const mockLoadHistory = vi.fn();
  const mockSetShowHelp = vi.fn();
  const mockOpenAuthDialog = vi.fn();
  const mockSetQuittingMessages = vi.fn();

  const mockConfig = {
    getProjectRoot: () => '/mock/cwd',
    getSessionId: () => 'test-session',
    getGeminiClient: () => ({
      setHistory: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as Config;

  const mockSettings = {} as LoadedSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(BuiltinCommandLoader) as Mock).mockClear();
    mockBuiltinLoadCommands.mockResolvedValue([]);
    mockFileLoadCommands.mockResolvedValue([]);
  });

  const setupProcessorHook = (
    builtinCommands: SlashCommand[] = [],
    fileCommands: SlashCommand[] = [],
  ) => {
    mockBuiltinLoadCommands.mockResolvedValue(Object.freeze(builtinCommands));
    mockFileLoadCommands.mockResolvedValue(Object.freeze(fileCommands));

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
      ),
    );

    return result;
  };

  // Helper function for tests that need direct access to hook result
  const getProcessor = (ignoreParam?: any) => {
    const settings = {
      merged: {
        contextFileName: 'GEMINI.md',
      },
    } as unknown as LoadedSettings;
    const hook = renderHook(() =>
      useSlashCommandProcessor(
        mockConfig, // Use current mockConfig value
        settings,
        [],
        mockAddItem,
        mockClearItems,
        mockLoadHistory,
        mockRefreshStatic,
        mockSetShowHelp,
        mockOnDebugMessage,
        mockOpenThemeDialog,
        mockOpenAuthDialog,
        mockOpenEditorDialog,
        mockCorgiMode,
        mockSetQuittingMessages,
        vi.fn(), // mockOpenPrivacyNotice
        vi.fn(), // mockSetCurrentModel
        mockSlashCommandService,
      ),
    );
    return hook.result.current;
  };

  describe('Command Processing', () => {
    let ActualCommandService: typeof CommandService;

    beforeAll(async () => {
      const actual = (await vi.importActual(
        '../../services/CommandService.js',
      )) as { CommandService: typeof CommandService };
      ActualCommandService = actual.CommandService;
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

      expect(mockClearItems).toHaveBeenCalledTimes(1);
      expect(mockAddItem).toHaveBeenCalledWith(
        { type: 'user', text: 'old prompt' },
        expect.any(Number),
      );
    });

    describe('with fake timers', () => {
      // This test needs to let the async `waitFor` complete with REAL timers
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

        vi.useFakeTimers();

        try {
          await act(async () => {
            await result.current.handleSlashCommand('/exit');
          });

          await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
          });

          expect(mockSetQuittingMessages).toHaveBeenCalledWith([]);
          expect(mockProcessExit).toHaveBeenCalledWith(0);
        } finally {
          vi.useRealTimers();
        }
      });
    });

    it('should handle "submit_prompt" action returned from a file-based command', async () => {
      const fileCommand = createTestCommand(
        {
          name: 'filecmd',
          description: 'A command from a file',
          action: async () => ({
            type: 'submit_prompt',
            content: 'The actual prompt from the TOML file.',
          }),
        },
        CommandKind.FILE,
      );

      const result = setupProcessorHook([], [fileCommand]);
      await waitFor(() => expect(result.current.slashCommands).toHaveLength(1));

      let actionResult;
      await act(async () => {
        actionResult = await result.current.handleSlashCommand('/filecmd');
      });

      expect(actionResult).toEqual({
        type: 'submit_prompt',
        content: 'The actual prompt from the TOML file.',
      });

      expect(mockAddItem).toHaveBeenCalledWith(
        { type: MessageType.USER, text: '/filecmd' },
        expect.any(Number),
      );
    });
  });

  describe('/bug command', () => {
    const originalEnv = process.env;
    beforeEach(() => {
      vi.resetModules();
      mockGetCliVersionFn.mockResolvedValue('0.1.0');
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      vi.useRealTimers();
      process.env = originalEnv;
    });

    const getExpectedUrl = (
      description?: string,
      sandboxEnvVar?: string,
      seatbeltProfileVar?: string,
      cliVersion?: string,
    ) => {
      const osVersion = 'test-platform test-node-version';
      let sandboxEnvStr = 'no sandbox';
      if (sandboxEnvVar && sandboxEnvVar !== 'sandbox-exec') {
        sandboxEnvStr = sandboxEnvVar.replace(/^gemini-(?:code-)?/, '');
      } else if (sandboxEnvVar === 'sandbox-exec') {
        sandboxEnvStr = `sandbox-exec (${seatbeltProfileVar || 'unknown'})`;
      }
      const modelVersion = 'test-model';
      // Use the mocked memoryUsage value
      const memoryUsage = '11.8 MB';

      const info = `
*   **CLI Version:** ${cliVersion}
*   **Git Commit:** ${GIT_COMMIT_INFO}
*   **Operating System:** ${osVersion}
*   **Sandbox Environment:** ${sandboxEnvStr}
*   **Model Version:** ${modelVersion}
*   **Memory Usage:** ${memoryUsage}
`;
      let url =
        'https://github.com/google-gemini/gemini-cli/issues/new?template=bug_report.yml';
      if (description) {
        url += `&title=${encodeURIComponent(description)}`;
      }
      url += `&info=${encodeURIComponent(info)}`;
      return url;
    };

    it('should call open with the correct GitHub issue URL and return true', async () => {
      mockGetCliVersionFn.mockResolvedValue('test-version');
      process.env.SANDBOX = 'gemini-sandbox';
      process.env.SEATBELT_PROFILE = 'test_profile';
      const { handleSlashCommand } = getProcessor();
      const bugDescription = 'This is a test bug';
      const expectedUrl = getExpectedUrl(
        bugDescription,
        process.env.SANDBOX,
        process.env.SEATBELT_PROFILE,
        'test-version',
      );
      let commandResult: SlashCommandProcessorResult | false = false;
      await act(async () => {
        commandResult = await handleSlashCommand(`/bug ${bugDescription}`);
      });

      expect(mockAddItem).toHaveBeenCalledTimes(2);
      expect(open).toHaveBeenCalledWith(expectedUrl);
      expect(commandResult).toEqual({ type: 'handled' });
    });

    it('should use the custom bug command URL from config if available', async () => {
      process.env.CLI_VERSION = '0.1.0';
      process.env.SANDBOX = 'sandbox-exec';
      process.env.SEATBELT_PROFILE = 'permissive-open';
      const bugCommand = {
        urlTemplate:
          'https://custom-bug-tracker.com/new?title={title}&info={info}',
      };
      mockConfig = {
        ...mockConfig,
        getBugCommand: vi.fn(() => bugCommand),
      } as unknown as Config;
      process.env.CLI_VERSION = '0.1.0';

      const { handleSlashCommand } = getProcessor();
      const bugDescription = 'This is a custom bug';
      const info = `
*   **CLI Version:** 0.1.0
*   **Git Commit:** ${GIT_COMMIT_INFO}
*   **Operating System:** test-platform test-node-version
*   **Sandbox Environment:** sandbox-exec (permissive-open)
*   **Model Version:** test-model
*   **Memory Usage:** 11.8 MB
`;
      const expectedUrl = bugCommand.urlTemplate
        .replace('{title}', encodeURIComponent(bugDescription))
        .replace('{info}', encodeURIComponent(info));

      let commandResult: SlashCommandProcessorResult | false = false;
      await act(async () => {
        commandResult = await handleSlashCommand(`/bug ${bugDescription}`);
      });

      expect(mockAddItem).toHaveBeenCalledTimes(2);
      expect(open).toHaveBeenCalledWith(expectedUrl);
      expect(commandResult).toEqual({ type: 'handled' });
    });
  });

  describe('/quit and /exit commands', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([['/quit'], ['/exit']])(
      'should handle %s, set quitting messages, and exit the process',
      async (command) => {
        const { handleSlashCommand } = getProcessor();
        const mockDate = new Date('2025-01-01T01:02:03.000Z');
        vi.setSystemTime(mockDate);

        await act(async () => {
          handleSlashCommand(command);
        });

        expect(mockAddItem).not.toHaveBeenCalled();
        expect(mockSetQuittingMessages).toHaveBeenCalledWith([
          {
            type: 'user',
            text: command,
            id: expect.any(Number),
          },
          {
            type: 'quit',
            duration: '1h 2m 3s',
            id: expect.any(Number),
          },
        ]);

        // Fast-forward timers to trigger process.exit
        await act(async () => {
          vi.advanceTimersByTime(100);
        });
        expect(mockProcessExit).toHaveBeenCalledWith(0);
      },
    );
  });
  describe('Unknown command', () => {
    it('should show an error and return true for a general unknown command', async () => {
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/unknowncommand');
      });
      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.ERROR,
          text: 'Unknown command: /unknowncommand',
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
    });
  });

  describe('/tools command', () => {
    it('should show an error if tool registry is not available', async () => {
      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue(undefined),
      } as unknown as Config;
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/tools');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.ERROR,
          text: 'Could not retrieve tools.',
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
    });

    it('should show an error if getAllTools returns undefined', async () => {
      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getAllTools: vi.fn().mockReturnValue(undefined),
        }),
      } as unknown as Config;
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/tools');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.ERROR,
          text: 'Could not retrieve tools.',
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
    });

    it('should display only gemini CLI tools (filtering out MCP tools)', async () => {
      // Create mock tools - some with serverName property (MCP tools) and some without (gemini CLI tools)
      const mockTools = [
        { name: 'tool1', displayName: 'Tool1' },
        { name: 'tool2', displayName: 'Tool2' },
        { name: 'mcp_tool1', serverName: 'mcp-server1' },
        { name: 'mcp_tool2', serverName: 'mcp-server1' },
      ];

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getAllTools: vi.fn().mockReturnValue(mockTools),
        }),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/tools');
      });

      // Should only show tool1 and tool2, not the MCP tools
      const message = mockAddItem.mock.calls[1][0].text;
      expect(message).toContain('Tool1');
      expect(message).toContain('Tool2');
      expect(commandResult).toBe(true);
    });

    it('should display a message when no gemini CLI tools are available', async () => {
      // Only MCP tools available
      const mockTools = [
        { name: 'mcp_tool1', serverName: 'mcp-server1' },
        { name: 'mcp_tool2', serverName: 'mcp-server1' },
      ];

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getAllTools: vi.fn().mockReturnValue(mockTools),
        }),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/tools');
      });

      const message = mockAddItem.mock.calls[1][0].text;
      expect(message).toContain('No tools available');
      expect(commandResult).toBe(true);
    });

    it('should display tool descriptions when /tools desc is used', async () => {
      const mockTools = [
        {
          name: 'tool1',
          displayName: 'Tool1',
          description: 'Description for Tool1',
        },
        {
          name: 'tool2',
          displayName: 'Tool2',
          description: 'Description for Tool2',
        },
      ];

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getAllTools: vi.fn().mockReturnValue(mockTools),
        }),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/tools desc');
      });

      const message = mockAddItem.mock.calls[1][0].text;
      expect(message).toContain('Tool1');
      expect(message).toContain('Description for Tool1');
      expect(message).toContain('Tool2');
      expect(message).toContain('Description for Tool2');
      expect(commandResult).toBe(true);
    });
  });

  describe('/mcp command', () => {
    beforeEach(() => {
      // Mock the core module with getMCPServerStatus and getMCPDiscoveryState
      vi.mock('@sport/core', async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          MCPServerStatus: {
            CONNECTED: 'connected',
            CONNECTING: 'connecting',
            DISCONNECTED: 'disconnected',
          },
          MCPDiscoveryState: {
            NOT_STARTED: 'not_started',
            IN_PROGRESS: 'in_progress',
            COMPLETED: 'completed',
          },
          getMCPServerStatus: vi.fn(),
          getMCPDiscoveryState: vi.fn(),
        };
      });
    });

    it('should show an error if tool registry is not available', async () => {
      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue(undefined),
      } as unknown as Config;
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.ERROR,
          text: 'Could not retrieve tool registry.',
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
    });

    it('should display a message with a URL when no MCP servers are configured in a sandbox', async () => {
      process.env.SANDBOX = 'sandbox';
      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: vi.fn().mockReturnValue([]),
        }),
        getMcpServers: vi.fn().mockReturnValue({}),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: `No MCP servers configured. Please open the following URL in your browser to view documentation:\nhttps://goo.gle/gemini-cli-docs-mcp`,
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
      delete process.env.SANDBOX;
    });

    it('should display a message and open a URL when no MCP servers are configured outside a sandbox', async () => {
      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: vi.fn().mockReturnValue([]),
        }),
        getMcpServers: vi.fn().mockReturnValue({}),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: 'No MCP servers configured. Opening documentation in your browser: https://goo.gle/gemini-cli-docs-mcp',
        }),
        expect.any(Number),
      );
      expect(open).toHaveBeenCalledWith('https://goo.gle/gemini-cli-docs-mcp');
      expect(commandResult).toBe(true);
    });

    it('should display configured MCP servers with status indicators and their tools', async () => {
      // Mock MCP servers configuration
      const mockMcpServers = {
        server1: { command: 'cmd1' },
        server2: { command: 'cmd2' },
        server3: { command: 'cmd3' },
      };

      // Setup getMCPServerStatus mock implementation - use all CONNECTED to avoid startup message in this test
      vi.mocked(getMCPServerStatus).mockImplementation((serverName) => {
        if (serverName === 'server1') return MCPServerStatus.CONNECTED;
        if (serverName === 'server2') return MCPServerStatus.CONNECTED;
        return MCPServerStatus.DISCONNECTED; // Default for server3 and others
      });

      // Setup getMCPDiscoveryState mock to return completed so no startup message is shown
      vi.mocked(getMCPDiscoveryState).mockReturnValue(
        MCPDiscoveryState.COMPLETED,
      );

      // Mock tools from each server
      const mockServer1Tools = [
        { name: 'server1_tool1' },
        { name: 'server1_tool2' },
      ];

      const mockServer2Tools = [{ name: 'server2_tool1' }];

      const mockServer3Tools = [{ name: 'server3_tool1' }];

      const mockGetToolsByServer = vi.fn().mockImplementation((serverName) => {
        if (serverName === 'server1') return mockServer1Tools;
        if (serverName === 'server2') return mockServer2Tools;
        if (serverName === 'server3') return mockServer3Tools;
        return [];
      });

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: mockGetToolsByServer,
        }),
        getMcpServers: vi.fn().mockReturnValue(mockMcpServers),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: expect.stringContaining('Configured MCP servers:'),
        }),
        expect.any(Number),
      );

      // Check that the message contains details about servers and their tools
      const message = mockAddItem.mock.calls[1][0].text;
      // Server 1 - Connected
      expect(message).toContain(
        '🟢 \u001b[1mserver1\u001b[0m - Ready (2 tools)',
      );
      expect(message).toContain('\u001b[36mserver1_tool1\u001b[0m');
      expect(message).toContain('\u001b[36mserver1_tool2\u001b[0m');

      // Server 2 - Connected
      expect(message).toContain(
        '🟢 \u001b[1mserver2\u001b[0m - Ready (1 tools)',
      );
      expect(message).toContain('\u001b[36mserver2_tool1\u001b[0m');

      // Server 3 - Disconnected
      expect(message).toContain(
        '🔴 \u001b[1mserver3\u001b[0m - Disconnected (1 tools cached)',
      );
      expect(message).toContain('\u001b[36mserver3_tool1\u001b[0m');

      expect(commandResult).toBe(true);
    });

    it('should display tool descriptions when showToolDescriptions is true', async () => {
      // Mock MCP servers configuration with server description
      const mockMcpServers = {
        server1: {
          command: 'cmd1',
          description: 'This is a server description',
        },
      };

      // Setup getMCPServerStatus mock implementation
      vi.mocked(getMCPServerStatus).mockImplementation((serverName) => {
        if (serverName === 'server1') return MCPServerStatus.CONNECTED;
        return MCPServerStatus.DISCONNECTED;
      });

      // Setup getMCPDiscoveryState mock to return completed
      vi.mocked(getMCPDiscoveryState).mockReturnValue(
        MCPDiscoveryState.COMPLETED,
      );

      // Mock tools from server with descriptions
      const mockServerTools = [
        { name: 'tool1', description: 'This is tool 1 description' },
        { name: 'tool2', description: 'This is tool 2 description' },
      ];

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: vi.fn().mockReturnValue(mockServerTools),
        }),
        getMcpServers: vi.fn().mockReturnValue(mockMcpServers),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor(true);
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: expect.stringContaining('Configured MCP servers:'),
        }),
        expect.any(Number),
      );

      const message = mockAddItem.mock.calls[1][0].text;

      // Check that server description is included (with ANSI color codes)
      expect(message).toContain('\u001b[1mserver1\u001b[0m - Ready (2 tools)');
      expect(message).toContain(
        '\u001b[32mThis is a server description\u001b[0m',
      );

      // Check that tool descriptions are included (with ANSI color codes)
      expect(message).toContain('\u001b[36mtool1\u001b[0m');
      expect(message).toContain(
        '\u001b[32mThis is tool 1 description\u001b[0m',
      );
      expect(message).toContain('\u001b[36mtool2\u001b[0m');
      expect(message).toContain(
        '\u001b[32mThis is tool 2 description\u001b[0m',
      );

      expect(commandResult).toBe(true);
    });

    it('should indicate when a server has no tools', async () => {
      // Mock MCP servers configuration
      const mockMcpServers = {
        server1: { command: 'cmd1' },
        server2: { command: 'cmd2' },
      };

      // Setup getMCPServerStatus mock implementation
      vi.mocked(getMCPServerStatus).mockImplementation((serverName) => {
        if (serverName === 'server1') return MCPServerStatus.CONNECTED;
        if (serverName === 'server2') return MCPServerStatus.DISCONNECTED;
        return MCPServerStatus.DISCONNECTED;
      });

      // Setup getMCPDiscoveryState mock to return completed
      vi.mocked(getMCPDiscoveryState).mockReturnValue(
        MCPDiscoveryState.COMPLETED,
      );

      // Mock tools from each server - server2 has no tools
      const mockServer1Tools = [{ name: 'server1_tool1' }];

      const mockServer2Tools = [];

      const mockGetToolsByServer = vi.fn().mockImplementation((serverName) => {
        if (serverName === 'server1') return mockServer1Tools;
        if (serverName === 'server2') return mockServer2Tools;
        return [];
      });

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: mockGetToolsByServer,
        }),
        getMcpServers: vi.fn().mockReturnValue(mockMcpServers),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: expect.stringContaining('Configured MCP servers:'),
        }),
        expect.any(Number),
      );

      // Check that the message contains details about both servers and their tools
      const message = mockAddItem.mock.calls[1][0].text;
      expect(message).toContain(
        '🟢 \u001b[1mserver1\u001b[0m - Ready (1 tools)',
      );
      expect(message).toContain('\u001b[36mserver1_tool1\u001b[0m');
      expect(message).toContain(
        '🔴 \u001b[1mserver2\u001b[0m - Disconnected (0 tools cached)',
      );
      expect(message).toContain('No tools available');

      expect(commandResult).toBe(true);
    });

    it('should show startup indicator when servers are connecting', async () => {
      // Mock MCP servers configuration
      const mockMcpServers = {
        server1: { command: 'cmd1' },
        server2: { command: 'cmd2' },
      };

      // Setup getMCPServerStatus mock implementation with one server connecting
      vi.mocked(getMCPServerStatus).mockImplementation((serverName) => {
        if (serverName === 'server1') return MCPServerStatus.CONNECTED;
        if (serverName === 'server2') return MCPServerStatus.CONNECTING;
        return MCPServerStatus.DISCONNECTED;
      });

      // Setup getMCPDiscoveryState mock to return in progress
      vi.mocked(getMCPDiscoveryState).mockReturnValue(
        MCPDiscoveryState.IN_PROGRESS,
      );

      // Mock tools from each server
      const mockServer1Tools = [{ name: 'server1_tool1' }];
      const mockServer2Tools = [{ name: 'server2_tool1' }];

      const mockGetToolsByServer = vi.fn().mockImplementation((serverName) => {
        if (serverName === 'server1') return mockServer1Tools;
        if (serverName === 'server2') return mockServer2Tools;
        return [];
      });

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: mockGetToolsByServer,
        }),
        getMcpServers: vi.fn().mockReturnValue(mockMcpServers),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp');
      });

      const message = mockAddItem.mock.calls[1][0].text;

      // Check that startup indicator is shown
      expect(message).toContain(
        '⏳ MCP servers are starting up (1 initializing)...',
      );
      expect(message).toContain(
        'Note: First startup may take longer. Tool availability will update automatically.',
      );

      // Check server statuses
      expect(message).toContain(
        '🟢 \u001b[1mserver1\u001b[0m - Ready (1 tools)',
      );
      expect(message).toContain(
        '🔄 \u001b[1mserver2\u001b[0m - Starting... (first startup may take longer) (tools will appear when ready)',
      );

      expect(commandResult).toBe(true);
    });
  });

  describe('/mcp schema', () => {
    it('should display tool schemas and descriptions', async () => {
      // Mock MCP servers configuration with server description
      const mockMcpServers = {
        server1: {
          command: 'cmd1',
          description: 'This is a server description',
        },
      };

      // Setup getMCPServerStatus mock implementation
      vi.mocked(getMCPServerStatus).mockImplementation((serverName) => {
        if (serverName === 'server1') return MCPServerStatus.CONNECTED;
        return MCPServerStatus.DISCONNECTED;
      });

      // Setup getMCPDiscoveryState mock to return completed
      vi.mocked(getMCPDiscoveryState).mockReturnValue(
        MCPDiscoveryState.COMPLETED,
      );

      // Mock tools from server with descriptions
      const mockServerTools = [
        {
          name: 'tool1',
          description: 'This is tool 1 description',
          schema: {
            parameters: [{ name: 'param1', type: 'string' }],
          },
        },
        {
          name: 'tool2',
          description: 'This is tool 2 description',
          schema: {
            parameters: [{ name: 'param2', type: 'number' }],
          },
        },
      ];

      mockConfig = {
        ...mockConfig,
        getToolRegistry: vi.fn().mockResolvedValue({
          getToolsByServer: vi.fn().mockReturnValue(mockServerTools),
        }),
        getMcpServers: vi.fn().mockReturnValue(mockMcpServers),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor(true);
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/mcp schema');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: expect.stringContaining('Configured MCP servers:'),
        }),
        expect.any(Number),
      );

      const message = mockAddItem.mock.calls[1][0].text;

      // Check that server description is included
      expect(message).toContain('Ready (2 tools)');
      expect(message).toContain('This is a server description');

      // Check that tool schemas are included
      expect(message).toContain('tool 1 description');
      expect(message).toContain('param1');
      expect(message).toContain('string');
      expect(message).toContain('tool 2 description');
      expect(message).toContain('param2');
      expect(message).toContain('number');

      expect(commandResult).toBe(true);
    });
  });

  describe('/compress command', () => {
    it('should call tryCompressChat(true)', async () => {
      const hook = getProcessorHook();
      mockTryCompressChat.mockImplementationOnce(async (force?: boolean) => {
        expect(force).toBe(true);
        await act(async () => {
          hook.rerender();
        });
        expect(hook.result.current.pendingHistoryItems).toContainEqual({
          type: MessageType.COMPRESSION,
          compression: {
            isPending: true,
            originalTokenCount: null,
            newTokenCount: null,
          },
        });
        return {
          originalTokenCount: 100,
          newTokenCount: 50,
        };
      });

      await act(async () => {
        hook.result.current.handleSlashCommand('/compress');
      });
      await act(async () => {
        hook.rerender();
      });
      expect(hook.result.current.pendingHistoryItems).toEqual([]);
      expect(mockGeminiClient.tryCompressChat).toHaveBeenCalledWith(true);
      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.COMPRESSION,
          compression: {
            isPending: false,
            originalTokenCount: 100,
            newTokenCount: 50,
          },
        }),
        expect.any(Number),
      );
    });
  });
});
