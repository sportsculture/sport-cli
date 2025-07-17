/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import TextInput from 'ink-text-input';
import { AuthType } from '@google/gemini-cli-core';

interface ApiKeyDialogProps {
  authType: AuthType;
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

export function ApiKeyDialog({
  authType,
  onSubmit,
  onCancel,
}: ApiKeyDialogProps): React.JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = (value: string) => {
    if (!value.trim()) {
      setError('API key cannot be empty');
      return;
    }
    onSubmit(value.trim());
  };

  const getProviderName = () => {
    switch (authType) {
      case AuthType.USE_OPENROUTER:
        return 'OpenRouter';
      case AuthType.USE_CUSTOM_API:
        return 'Custom API';
      default:
        return 'Provider';
    }
  };

  const getHelpText = () => {
    switch (authType) {
      case AuthType.USE_OPENROUTER:
        return 'Get your API key from https://openrouter.ai/keys';
      case AuthType.USE_CUSTOM_API:
        return 'Enter your custom API key';
      default:
        return '';
    }
  };

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Enter {getProviderName()} API Key</Text>
      <Box marginTop={1}>
        <Text>{getHelpText()}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>API Key: </Text>
        <TextInput
          value={apiKey}
          onChange={setApiKey}
          onSubmit={handleSubmit}
          mask="*"
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={Colors.Gray}>(Press Enter to submit, Esc to cancel)</Text>
      </Box>
    </Box>
  );
}