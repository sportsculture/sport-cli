/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SportCliPlugin } from '../types.js';

/**
 * Example hello-world plugin for sport-cli
 * Demonstrates basic hook usage
 */
const helloWorldPlugin: SportCliPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Example plugin that adds a greeting before shell commands',
  author: 'SportsCulture',

  async onLoad() {
    console.log('👋 Hello from hello-world plugin!');
  },

  hooks: {
    beforeShellExecute: (cmd: string) =>
      // Add a greeting before the command
      `echo "👋 Hello from sport-cli plugin!" && ${cmd}`,
    afterShellExecute: (result) =>
      // Add a footer to the output
      ({
        ...result,
        stdout: result.stdout + '\n\n✨ Powered by sport-cli plugins',
      }),
  },
};

export default helloWorldPlugin;
