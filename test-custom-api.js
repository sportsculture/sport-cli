#!/usr/bin/env node

async function testCustomApiDirect() {
  console.log('Testing the OCRFlux-3B API directly...\n');

  try {
    const response = await fetch('http://10.0.0.69:8000/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Hello! This is a test from the new sprtscltr CLI. Please respond briefly.',
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Direct API call successful!');
    console.log('Response:', result);

  } catch (error) {
    console.log('❌ Direct API call failed:', error.message);
  }
}

// Also test the OpenAI-compatible endpoint on Ollama
async function testOllamaOpenAI() {
  console.log('\nTesting Ollama OpenAI-compatible API...\n');

  try {
    const response = await fetch('http://10.0.0.69:5000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-key'
      },
      body: JSON.stringify({
        model: 'deepseek-r1:7b',
        messages: [
          {
            role: 'user',
            content: 'Hello! This is a test from the new sprtscltr CLI. Please respond briefly.'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Ollama OpenAI API call successful!');
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.log('❌ Ollama API call failed:', error.message);
  }
}

testCustomApiDirect().then(() => testOllamaOpenAI());