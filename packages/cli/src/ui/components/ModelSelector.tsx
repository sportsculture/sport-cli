/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels.js';
import { ContentGeneratorConfig } from '@sport/core';
import Spinner from 'ink-spinner';

interface ModelSelectorProps {
  config: ContentGeneratorConfig | null;
  currentModel: string;
  onSelect: (model: string) => void;
  onCancel: () => void;
}

export function ModelSelector({
  config,
  currentModel,
  onSelect,
  onCancel,
}: ModelSelectorProps): React.JSX.Element {
  const { models, loading, error } = useOpenRouterModels(config);

  const handleSelect = (model: string) => {
    onSelect(model);
  };

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  // Find current model index
  const currentIndex = models.findIndex((m) => m.id === currentModel);
  const initialIndex = currentIndex >= 0 ? currentIndex : 0;

  if (loading && models.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor={Colors.Gray}
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text bold>Select Model</Text>
        <Box marginTop={1}>
          <Text color={Colors.AccentBlue}>
            <Spinner type="dots" /> Loading available models...
          </Text>
        </Box>
      </Box>
    );
  }

  if (error && models.length === 0) {
    return (
      <Box
        borderStyle="round"
        borderColor={Colors.Gray}
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text bold>Select Model</Text>
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>
            Error loading models: {error.message}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={Colors.Gray}>(Press Escape to cancel)</Text>
        </Box>
      </Box>
    );
  }

  // Format models for display
  const modelItems = models.map((model) => ({
    label: `${model.name} (${model.id})`,
    value: model.id,
  }));

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Select Model</Text>
      {currentModel && (
        <Box marginTop={1}>
          <Text color={Colors.Gray}>Current: {currentModel}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <RadioButtonSelect
          items={modelItems}
          initialIndex={initialIndex}
          onSelect={handleSelect}
          isFocused={true}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          (Use arrow keys to navigate, Enter to select, Escape to cancel)
        </Text>
      </Box>
    </Box>
  );
}
