/**
 * OpenRouter Provider Registration
 */

import { AuthType } from '../core/contentGenerator.js';
import { ProviderRegistry } from './registry.js';
import { OpenRouterContentGenerator } from './openRouterContentGenerator.js';

export function registerOpenRouterProvider(registry: ProviderRegistry): void {
  registry.register({
    id: 'openrouter',
    name: 'OpenRouter',
    description: "Access 300+ AI models through OpenRouter's unified API",
    authType: AuthType.USE_OPENROUTER,
    requiredEnvVars: ['OPENROUTER_API_KEY'],
    optionalEnvVars: ['OPENROUTER_BASE_URL'],
    enabledByDefault: true,
    configInstructions: `To use OpenRouter:
1. Create an account at https://openrouter.ai
2. Get your API key from https://openrouter.ai/keys
3. Set the environment variable: export OPENROUTER_API_KEY="your-api-key"
4. (Optional) Set a custom base URL: export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"`,
    factory: async (config) => new OpenRouterContentGenerator(config),
  });
}
