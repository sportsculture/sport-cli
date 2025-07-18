/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Text } from 'ink';
import { Colors } from '../colors.js';
import { type MCPServerConfig, AuthType } from '@google/gemini-cli-core';

interface ContextSummaryDisplayProps {
  geminiMdFileCount: number;
  contextFileNames: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  showToolDescriptions?: boolean;
  currentModel?: string;
  authType?: string;
}

export const ContextSummaryDisplay: React.FC<ContextSummaryDisplayProps> = ({
  geminiMdFileCount,
  contextFileNames,
  mcpServers,
  showToolDescriptions,
  currentModel,
  authType,
}) => {
  const mcpServerCount = Object.keys(mcpServers || {}).length;

  // Show model info for all providers
  const showModel = currentModel;

  if (geminiMdFileCount === 0 && mcpServerCount === 0 && !showModel) {
    return <Text> </Text>; // Render an empty space to reserve height
  }

  const geminiMdText = (() => {
    if (geminiMdFileCount === 0) {
      return '';
    }
    const allNamesTheSame = new Set(contextFileNames).size < 2;
    const name = allNamesTheSame ? contextFileNames[0] : 'context';
    return `${geminiMdFileCount} ${name} file${
      geminiMdFileCount > 1 ? 's' : ''
    }`;
  })();

  const mcpText =
    mcpServerCount > 0
      ? `${mcpServerCount} MCP server${mcpServerCount > 1 ? 's' : ''}`
      : '';

  let summaryText = '';
  
  // Add model info
  if (showModel) {
    // For OpenRouter models, extract just the model name after the provider
    // For other providers, show the full model name
    const modelName = currentModel?.includes('/') 
      ? currentModel.split('/').pop() 
      : currentModel;
    summaryText = `Model: ${modelName}`;
  }
  
  // Add context info if present
  if (geminiMdText || mcpText) {
    if (summaryText) {
      summaryText += ' | ';
    }
    summaryText += 'Using ';
    if (geminiMdText) {
      summaryText += geminiMdText;
    }
    if (geminiMdText && mcpText) {
      summaryText += ' and ';
    }
    if (mcpText) {
      summaryText += mcpText;
      // Add ctrl+t hint when MCP servers are available
      if (mcpServers && Object.keys(mcpServers).length > 0) {
        if (showToolDescriptions) {
          summaryText += ' (ctrl+t to toggle)';
        } else {
          summaryText += ' (ctrl+t to view)';
        }
      }
    }
  }

  return <Text color={Colors.Gray}>{summaryText}</Text>;
};
