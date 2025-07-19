/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Config } from '@sport/core';
import { HistoryItem, MessageType } from '../types.js';

export const useModelSelector = (
  config: Config,
  addItem: (item: Omit<HistoryItem, 'id'>, timestamp: number) => void,
) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const openModelSelector = useCallback(() => {
    setIsModelSelectorOpen(true);
  }, []);

  const closeModelSelector = useCallback(() => {
    setIsModelSelectorOpen(false);
  }, []);

  const handleModelSelect = useCallback(
    async (model: string) => {
      const previousModel = config.getModel();
      try {
        await config.setModel(model);
        setIsModelSelectorOpen(false);

        addItem(
          {
            type: MessageType.INFO,
            text: `Model changed from ${previousModel} to ${model}\n\nThe conversation history has been preserved for continuity.`,
          },
          Date.now(),
        );
      } catch (error) {
        addItem(
          {
            type: MessageType.ERROR,
            text:
              error instanceof Error ? error.message : 'Failed to switch model',
          },
          Date.now(),
        );
      }
    },
    [config, addItem],
  );

  return {
    isModelSelectorOpen,
    openModelSelector,
    closeModelSelector,
    handleModelSelect,
  };
};
