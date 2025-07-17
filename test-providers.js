import {
  AuthType,
  createContentGeneratorConfig,
  createContentGenerator,
} from './packages/core/dist/src/index.js';

import { OpenRouterContentGenerator } from './packages/core/dist/src/providers/openRouterContentGenerator.js';
import { CustomApiContentGenerator } from './packages/core/dist/src/providers/customApiContentGenerator.js';

async function testProviders() {
  console.log('Testing OpenRouter and Custom API providers...\n');

  // Test OpenRouter configuration
  console.log('1. Testing OpenRouter configuration:');
  try {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const openRouterConfig = await createContentGeneratorConfig(
      'deepseek/deepseek-chat',
      AuthType.USE_OPENROUTER
    );
    console.log('✓ OpenRouter config created:', openRouterConfig);
    
    const openRouterGenerator = await createContentGenerator(openRouterConfig);
    console.log('✓ OpenRouter generator created:', openRouterGenerator.constructor.name);
  } catch (error) {
    console.log('✗ OpenRouter test failed:', error.message);
  }

  // Test Custom API configuration
  console.log('\n2. Testing Custom API configuration:');
  try {
    process.env.CUSTOM_API_KEY = 'test-key';
    process.env.CUSTOM_API_ENDPOINT = 'http://10.0.0.69:8080';
    const customConfig = await createContentGeneratorConfig(
      'deepseek-v3',
      AuthType.USE_CUSTOM_API
    );
    console.log('✓ Custom API config created:', customConfig);
    
    const customGenerator = await createContentGenerator(customConfig);
    console.log('✓ Custom API generator created:', customGenerator.constructor.name);
  } catch (error) {
    console.log('✗ Custom API test failed:', error.message);
  }

  // Test direct provider instantiation
  console.log('\n3. Testing direct provider instantiation:');
  try {
    const directOpenRouter = new OpenRouterContentGenerator({
      model: 'deepseek/deepseek-chat',
      apiKey: 'test-key',
      authType: AuthType.USE_OPENROUTER,
    });
    console.log('✓ Direct OpenRouter instantiation successful');
    
    const directCustom = new CustomApiContentGenerator({
      model: 'deepseek-v3',
      apiKey: 'test-key',
      authType: AuthType.USE_CUSTOM_API,
      customEndpoint: 'http://10.0.0.69:8080',
    });
    console.log('✓ Direct Custom API instantiation successful');
  } catch (error) {
    console.log('✗ Direct instantiation test failed:', error.message);
  }

  console.log('\n🎉 All provider tests completed!');
}

testProviders().catch(console.error);