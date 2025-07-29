/**
 * Gemini Provider Registration
 */

import { AuthType } from '../core/contentGenerator.js';
import { ProviderRegistry } from './registry.js';
import { GeminiContentGenerator } from './geminiContentGenerator.js';

export function registerGeminiProvider(registry: ProviderRegistry): void {
  registry.register({
    id: 'gemini',
    name: 'Gemini',
    description: 'Google\'s Gemini AI models with native integration',
    authType: AuthType.USE_GEMINI,
    requiredEnvVars: ['GEMINI_API_KEY'],
    optionalEnvVars: [],
    enabledByDefault: true,
    configInstructions: `To use Gemini:
1. Get an API key from https://makersuite.google.com/app/apikey
2. Set the environment variable: export GEMINI_API_KEY="your-api-key"`,
    factory: async (config) => new GeminiContentGenerator(config),
  });

  // Also register Vertex AI variant
  registry.register({
    id: 'vertex-ai',
    name: 'Vertex AI',
    description: 'Google\'s Vertex AI for enterprise use',
    authType: AuthType.USE_VERTEX_AI,
    requiredEnvVars: ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION'],
    optionalEnvVars: ['GOOGLE_API_KEY'],
    enabledByDefault: false,
    configInstructions: `To use Vertex AI:
1. Set up a Google Cloud project with Vertex AI enabled
2. Set environment variables:
   export GOOGLE_CLOUD_PROJECT="your-project-id"
   export GOOGLE_CLOUD_LOCATION="us-central1"
   export GOOGLE_API_KEY="your-api-key" (optional)`,
    factory: async (config) => new GeminiContentGenerator(config),
  });
}