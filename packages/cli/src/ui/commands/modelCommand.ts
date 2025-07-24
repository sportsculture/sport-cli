/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand, OpenDialogActionReturn } from './types.js';
import { MessageType } from '../types.js';

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'show or change current AI model',
  kind: CommandKind.BUILT_IN,
  action: async (context, args) => {
    const config = context.services.config;
    if (!config) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Configuration not available',
        },
        Date.now(),
      );
      return;
    }

    const currentModel = config.getModel();

    // If no arguments, show current model and open selector
    if (args.length === 0 || args === '') {
      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `Current model: **${currentModel}**\n\n_Opening model selector..._`,
        },
        Date.now(),
      );

      // Return dialog action to open model selector
      return {
        type: 'dialog',
        dialog: 'model',
      } as OpenDialogActionReturn;
    }

    // If argument is provided, try to set the model directly
    const newModel = args.trim();

    try {
      await config.setModel(newModel);
      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `✓ Model changed from **${currentModel}** to **${newModel}**`,
        },
        Date.now(),
      );
    } catch (error) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Failed to set model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        Date.now(),
      );
    }
  },
};
