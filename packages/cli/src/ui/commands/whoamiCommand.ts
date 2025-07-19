/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageType } from '../types.js';
import { SlashCommand } from './types.js';

export const whoamiCommand: SlashCommand = {
  name: 'whoami',
  description: 'Ask the model to identify itself',
  action: (context, args) => {
    // For now, just display a message about the feature
    // TODO: Implement actual query submission once we understand the mechanism
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: 'The /whoami command is not yet implemented. To check model identity, simply ask "What is your name?"',
      },
      Date.now(),
    );
  },
};
