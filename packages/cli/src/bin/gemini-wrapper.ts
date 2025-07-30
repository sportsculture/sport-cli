#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find the sport executable - adjust path since we're in dist/src/bin/
const sportPath = resolve(__dirname, '../../index.js');

// Spawn the sport command with the legacy indicator
const child = spawn(process.execPath, [sportPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    IS_LEGACY_COMMAND: 'true',
    LEGACY_COMMAND_NAME: 'gemini',
  },
});

// Forward the exit code
child.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle errors
child.on('error', (err) => {
  console.error('Failed to launch sport-cli:', err);
  process.exit(1);
});
