import { spawn } from 'child_process';

// Test OpenRouter directly
process.env.OPENROUTER_API_KEY = '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';

const cli = spawn('npm', ['start', '--', '-p', 'test this please'], {
  stdio: 'inherit',
  env: process.env
});

cli.on('close', (code) => {
  console.log(`CLI exited with code ${code}`);
});