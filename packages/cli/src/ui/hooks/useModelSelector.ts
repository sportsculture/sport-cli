/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Config } from '@google/gemini-cli-core';
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
    (model: string) => {
      const previousModel = config.getModel();
      config.setModel(model);
      setIsModelSelectorOpen(false);
      
      addItem(
        {
          type: MessageType.INFO,
          text: `Model changed from ${previousModel} to ${model}`,
        },
        Date.now(),
      );
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