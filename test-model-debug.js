// Debug what model is being used
import { createContentGeneratorConfig, AuthType } from './packages/core/dist/src/core/contentGenerator.js';
import { DEFAULT_OPENROUTER_MODEL } from './packages/core/dist/src/config/models.js';

process.env.OPENROUTER_API_KEY = 'test-key';

const config = await createContentGeneratorConfig(
  'deepseek/deepseek-chat',
  AuthType.USE_OPENROUTER,
  { getModel: () => 'gemini-2.5-pro' }
);

console.log('Config:', config);
console.log('DEFAULT_OPENROUTER_MODEL:', DEFAULT_OPENROUTER_MODEL);