/**
 * Custom API Provider Registration
 */

import { AuthType } from '../core/contentGenerator.js';
import { ProviderRegistry } from './registry.js';
import { CustomApiContentGenerator } from './customApiContentGenerator.js';

export function registerCustomApiProvider(registry: ProviderRegistry): void {
  registry.register({
    id: 'custom-api',
    name: 'Custom API',
    description: 'Connect to any OpenAI-compatible API endpoint',
    authType: AuthType.USE_CUSTOM_API,
    requiredEnvVars: ['CUSTOM_API_KEY', 'CUSTOM_API_ENDPOINT'],
    optionalEnvVars: ['CUSTOM_API_MODEL', 'CUSTOM_API_HEADERS'],
    enabledByDefault: false,
    configInstructions: `To use a custom API:
1. Set the API endpoint: export CUSTOM_API_ENDPOINT="https://your-api.com/v1"
2. Set your API key: export CUSTOM_API_KEY="your-api-key"
3. (Optional) Set default model: export CUSTOM_API_MODEL="your-model-name"
4. (Optional) Set custom headers: export CUSTOM_API_HEADERS='{"X-Custom-Header": "value"}'`,
    factory: async (config) => new CustomApiContentGenerator(config),
  });
}