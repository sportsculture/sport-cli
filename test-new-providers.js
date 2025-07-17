#!/usr/bin/env node

// Test script for new OpenRouter and Custom API providers
import { 
  AuthType, 
  createContentGeneratorConfig, 
  createContentGenerator 
} from './packages/core/dist/index.js';

console.log('🧪 Testing New Provider Integration\n');

async function testProviderAuth() {
  console.log('Available AuthTypes:');
  for (const [key, value] of Object.entries(AuthType)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log();

  // Test 1: OpenRouter Configuration (without API call)
  console.log('1. Testing OpenRouter Configuration:');
  try {
    // Temporarily set a test key
    const originalKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'test-key-123';
    
    const openRouterConfig = await createContentGeneratorConfig(
      'deepseek/deepseek-chat',
      AuthType.USE_OPENROUTER
    );
    
    console.log('✅ OpenRouter config created successfully:');
    console.log('   Model:', openRouterConfig.model);
    console.log('   AuthType:', openRouterConfig.authType);
    console.log('   Has API Key:', !!openRouterConfig.apiKey);
    
    // Restore original key
    if (originalKey) {
      process.env.OPENROUTER_API_KEY = originalKey;
    } else {
      delete process.env.OPENROUTER_API_KEY;
    }
  } catch (error) {
    console.log('❌ OpenRouter config failed:', error.message);
  }

  // Test 2: Custom API Configuration (without API call)
  console.log('\n2. Testing Custom API Configuration:');
  try {
    // Temporarily set test keys
    const originalApiKey = process.env.CUSTOM_API_KEY;
    const originalEndpoint = process.env.CUSTOM_API_ENDPOINT;
    
    process.env.CUSTOM_API_KEY = 'test-key-456';
    process.env.CUSTOM_API_ENDPOINT = 'http://10.0.0.69:8080';
    
    const customConfig = await createContentGeneratorConfig(
      'deepseek-v3',
      AuthType.USE_CUSTOM_API
    );
    
    console.log('✅ Custom API config created successfully:');
    console.log('   Model:', customConfig.model);
    console.log('   AuthType:', customConfig.authType);
    console.log('   Has API Key:', !!customConfig.apiKey);
    console.log('   Endpoint:', customConfig.customEndpoint);
    
    // Restore original keys
    if (originalApiKey) process.env.CUSTOM_API_KEY = originalApiKey;
    else delete process.env.CUSTOM_API_KEY;
    if (originalEndpoint) process.env.CUSTOM_API_ENDPOINT = originalEndpoint;
    else delete process.env.CUSTOM_API_ENDPOINT;
  } catch (error) {
    console.log('❌ Custom API config failed:', error.message);
  }

  // Test 3: Provider Instantiation
  console.log('\n3. Testing Provider Instantiation:');
  try {
    // Test OpenRouter
    process.env.OPENROUTER_API_KEY = 'test-key-123';
    const openRouterConfig = await createContentGeneratorConfig(
      'deepseek/deepseek-chat',
      AuthType.USE_OPENROUTER
    );
    const openRouterGenerator = await createContentGenerator(openRouterConfig);
    console.log('✅ OpenRouter generator created:', openRouterGenerator.constructor.name);
    
    // Test Custom API
    process.env.CUSTOM_API_KEY = 'test-key-456';
    process.env.CUSTOM_API_ENDPOINT = 'http://10.0.0.69:8080';
    const customConfig = await createContentGeneratorConfig(
      'deepseek-v3',
      AuthType.USE_CUSTOM_API
    );
    const customGenerator = await createContentGenerator(customConfig);
    console.log('✅ Custom API generator created:', customGenerator.constructor.name);
    
    // Clean up
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.CUSTOM_API_KEY;
    delete process.env.CUSTOM_API_ENDPOINT;
    
  } catch (error) {
    console.log('❌ Provider instantiation failed:', error.message);
  }

  console.log('\n🎉 Provider integration tests completed!');
  console.log('\nNext steps:');
  console.log('1. Add real API keys to .env file');
  console.log('2. Run: npx @google/gemini-cli');
  console.log('3. Select "OpenRouter" or "Custom API" from auth dialog');
  console.log('4. Start chatting with your new providers!');
}

testProviderAuth().catch(console.error);