/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { Box } from 'ink';
import type { IndividualToolCallDisplay } from '../../types.js';
import { ToolCallStatus } from '../../types.js';
import { ToolMessage } from './ToolMessage.js';
import { ToolConfirmationMessage } from './ToolConfirmationMessage.js';
import { Colors } from '../../colors.js';
import { Config } from '@sport/core';
import { SHELL_COMMAND_NAME } from '../../constants.js';

interface ToolGroupMessageProps {
  groupId: number;
  toolCalls: IndividualToolCallDisplay[];
  availableTerminalHeight?: number;
  terminalWidth: number;
  config: Config;
  isFocused?: boolean;
}

// Create a stable key for tool groups to prevent duplicate rendering
function createToolGroupKey(
  groupId: number,
  toolCalls: IndividualToolCallDisplay[],
): string {
  const toolCallIds = toolCalls
    .map((tc) => tc.callId)
    .sort()
    .join(',');
  return `${groupId}-${toolCallIds}`;
}

// Main component renders the border and maps the tools using ToolMessage
export const ToolGroupMessage: React.FC<ToolGroupMessageProps> = React.memo(
  ({
    groupId,
    toolCalls,
    availableTerminalHeight,
    terminalWidth,
    config,
    isFocused = true,
  }) => {
    // Track rendered tool groups to prevent duplicates
    const renderedKeyRef = useRef<string>('');
    const currentKey = createToolGroupKey(groupId, toolCalls);

    // Prevent duplicate rendering by tracking unique keys
    useEffect(() => {
      renderedKeyRef.current = currentKey;
    }, [currentKey]);

    const hasPending = !toolCalls.every(
      (t) => t.status === ToolCallStatus.Success,
    );
    const isShellCommand = toolCalls.some((t) => t.name === SHELL_COMMAND_NAME);
    const borderColor =
      hasPending || isShellCommand ? Colors.AccentYellow : Colors.Gray;

    const staticHeight = /* border */ 2 + /* marginBottom */ 1;
    // This is a bit of a magic number, but it accounts for the border and
    // marginLeft.
    const innerWidth = terminalWidth - 4;

    // Debug logging for duplicate tool calls
    if (process.env.DEBUG === 'true' || process.env.DEBUG_TOOLS === 'true') {
      console.log(
        '[DEBUG ToolGroupMessage] Rendering group:',
        groupId,
        'with tools:',
        toolCalls.map((t) => ({
          callId: t.callId,
          name: t.name,
          status: t.status,
        })),
      );
    }

    // only prompt for tool approval on the first 'confirming' tool in the list
    // note, after the CTA, this automatically moves over to the next 'confirming' tool
    const toolAwaitingApproval = useMemo(
      () => toolCalls.find((tc) => tc.status === ToolCallStatus.Confirming),
      [toolCalls],
    );

    let countToolCallsWithResults = 0;
    for (const tool of toolCalls) {
      if (tool.resultDisplay !== undefined && tool.resultDisplay !== '') {
        countToolCallsWithResults++;
      }
    }
    const countOneLineToolCalls = toolCalls.length - countToolCallsWithResults;
    const availableTerminalHeightPerToolMessage = availableTerminalHeight
      ? Math.max(
          Math.floor(
            (availableTerminalHeight - staticHeight - countOneLineToolCalls) /
              Math.max(1, countToolCallsWithResults),
          ),
          1,
        )
      : undefined;

    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        /*
        This width constraint is highly important and protects us from an Ink rendering bug.
        Since the ToolGroup can typically change rendering states frequently, it can cause
        Ink to render the border of the box incorrectly and span multiple lines and even
        cause tearing.
      */
        width="100%"
        marginLeft={1}
        borderDimColor={hasPending}
        borderColor={borderColor}
        overflow="hidden"
      >
        {toolCalls.map((tool) => {
          const isConfirming = toolAwaitingApproval?.callId === tool.callId;
          return (
            <Box key={tool.callId} flexDirection="column" minHeight={1}>
              <Box flexDirection="row" alignItems="center">
                <ToolMessage
                  callId={tool.callId}
                  name={tool.name}
                  description={tool.description}
                  resultDisplay={tool.resultDisplay}
                  status={tool.status}
                  confirmationDetails={tool.confirmationDetails}
                  availableTerminalHeight={
                    availableTerminalHeightPerToolMessage
                  }
                  terminalWidth={innerWidth}
                  emphasis={
                    isConfirming
                      ? 'high'
                      : toolAwaitingApproval
                        ? 'low'
                        : 'medium'
                  }
                  renderOutputAsMarkdown={tool.renderOutputAsMarkdown}
                />
              </Box>
              {tool.status === ToolCallStatus.Confirming &&
                isConfirming &&
                tool.confirmationDetails && (
                  <ToolConfirmationMessage
                    confirmationDetails={tool.confirmationDetails}
                    config={config}
                    isFocused={isFocused}
                    availableTerminalHeight={
                      availableTerminalHeightPerToolMessage
                    }
                    terminalWidth={innerWidth}
                  />
                )}
            </Box>
          );
        })}
      </Box>
    );
  },
);

ToolGroupMessage.displayName = 'ToolGroupMessage';
