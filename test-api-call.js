#!/usr/bin/env node

import { CustomApiContentGenerator } from './packages/core/dist/src/providers/customApiContentGenerator.js';

async function testApiCall() {
  console.log('Testing actual API call to local server...\n');

  try {
    const customProvider = new CustomApiContentGenerator({
      model: 'deepseek-r1:7b',
      apiKey: 'demo-key',
      authType: 'custom-api',
      customEndpoint: 'http://10.0.0.69:5000',
      customHeaders: { 'X-Test-Client': 'gemini-cli-test' }
    });

    console.log('✓ Custom API provider created');
    console.log('🔄 Making test API call...');

    const testRequest = {
      contents: 'Hello! This is a test from the new sprtscltr CLI custom provider. Please respond briefly.',
      config: {
        temperature: 0.7,
        maxOutputTokens: 100
      }
    };

    const response = await customProvider.generateContent(testRequest);
    
    console.log('✅ API call successful!');
    console.log('Response text:', response.text);
    console.log('Response candidates:', response.candidates?.length || 0);
    
    if (response.usageMetadata) {
      console.log('Token usage:', response.usageMetadata);
    }

  } catch (error) {
    console.log('❌ API call failed:', error.message);
    console.log('This might be expected if the server at 10.0.0.69:8000 is not accessible');
  }
}

testApiCall();