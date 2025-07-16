#!/bin/bash

echo "🚀 Gemini CLI Provider Demo"
echo "=========================="
echo ""

# Demo 1: Show available providers
echo "1️⃣ Available Authentication Providers:"
echo ""
echo "When you run 'npm start', you'll see:"
echo "  1. Login with Google"
echo "  2. Gemini API Key (AI Studio)" 
echo "  3. Vertex AI"
echo "  4. OpenRouter (NEW!)"
echo "  5. Custom API (NEW!)"
echo ""

# Demo 2: Test with Custom API
echo "2️⃣ Testing Custom API (Your GPU Server):"
echo ""
echo "Using DeepSeek R1 7B on your local server..."
echo ""

# Create a test prompt
cat > test-prompt.txt << 'EOF'
5
Write a haiku about GPUs
exit
EOF

echo "Running: npm start < test-prompt.txt"
echo "(This selects option 5 - Custom API, asks for a haiku, then exits)"
echo ""
echo "Expected behavior:"
echo "- Connects to http://10.0.0.69:5000"
echo "- Uses deepseek-r1:7b model"
echo "- Generates a haiku about GPUs"
echo ""

# Demo 3: Configuration check
echo "3️⃣ Current Configuration:"
echo ""
echo "OpenRouter API Key: ${OPENROUTER_API_KEY:0:20}..."
echo "Custom API Endpoint: ${CUSTOM_API_ENDPOINT:-http://10.0.0.69:5000}"
echo "Custom API Key: ${CUSTOM_API_KEY:-demo-key}"
echo ""

# Demo 4: Quick test of both providers
echo "4️⃣ Quick Provider Test:"
echo ""
echo "Testing provider instantiation..."
node -e "
import { createContentGenerator, AuthType } from './packages/core/dist/src/index.js';

// Test Custom API
try {
  const customGen = createContentGenerator({
    authType: AuthType.USE_CUSTOM_API,
    apiKey: 'demo-key',
    model: 'deepseek-r1:7b',
    customEndpoint: 'http://10.0.0.69:5000'
  });
  console.log('✅ Custom API provider ready!');
} catch (e) {
  console.log('❌ Custom API error:', e.message);
}

// Test OpenRouter
try {
  const orGen = createContentGenerator({
    authType: AuthType.USE_OPENROUTER,
    apiKey: process.env.OPENROUTER_API_KEY || 'sk-or-demo',
    model: 'deepseek/deepseek-chat'
  });
  console.log('✅ OpenRouter provider ready!');
} catch (e) {
  console.log('❌ OpenRouter error:', e.message);
}
"

echo ""
echo "5️⃣ Ready to Use!"
echo ""
echo "Run 'npm start' and choose:"
echo "  - Option 4 for OpenRouter (cloud models)"
echo "  - Option 5 for your GPU server (local models)"
echo ""
echo "Then use commands like:"
echo "  > help"
echo "  > show package.json"
echo "  > explain this code"
echo "  > search for authentication"
echo ""