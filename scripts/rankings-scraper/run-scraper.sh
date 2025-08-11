#!/bin/bash

# Load environment variables from .env file
if [ -f "../../.env" ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
fi

echo "🚀 Running OpenRouter Rankings Scraper"
echo "======================================="

# Run the scraper
echo "📊 Scraping rankings..."
npx tsx scrape-table.ts

# Enhance the data
echo "✨ Enhancing data..."
npx tsx enhance-rankings.ts

# Update the Gist
echo "📤 Updating Gist..."
npx tsx update-gist.ts enhanced-rankings.json

echo "✅ Complete!"