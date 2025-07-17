#!/bin/bash

# Test OpenRouter auth flow
echo "Testing OpenRouter authentication flow..."

# Ensure no API key is set
unset OPENROUTER_API_KEY
unset CUSTOM_API_KEY

# Run the CLI and select OpenRouter
echo "Starting sprtscltr..."
npm start