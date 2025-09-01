# OpenRouter Rankings Scraper

This module scrapes OpenRouter model rankings and updates a GitHub Gist with the latest data.

## Setup

1. Install dependencies:

```bash
cd scripts/rankings-scraper
npm install
```

2. Create a GitHub Gist:
   - Go to https://gist.github.com
   - Create a new public gist with filename `openrouter-rankings.json`
   - Copy the Gist ID from the URL

3. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Create a token with `gist` scope
   - Save the token securely

## Local Testing

```bash
# Set environment variables
export GIST_ID="your-gist-id"
export GH_TOKEN="your-github-token"

# Run the scraper
npm run scrape

# Update the gist with scraped data
npm run update-gist rankings.json
```

## GitHub Actions Setup

Add these secrets to your repository:

- `GIST_ID`: Your Gist ID
- `GH_TOKEN`: Your GitHub Personal Access Token

The workflow will run automatically:

- Daily at 04:37 UTC
- On manual trigger via workflow_dispatch

## Data Structure

The scraper produces JSON with this structure:

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-11T19:05:00Z",
  "source": "https://openrouter.ai/rankings",
  "snapshots": [
    {
      "category": "overall",
      "period": "day",
      "models": [
        {
          "rank": 1,
          "model_id": "openai/gpt-4o",
          "name": "GPT-4o",
          "share": 0.214,
          "tokens": 123456789,
          "url": "https://openrouter.ai/models/openai/gpt-4o"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Scraper finds no models

- Check if OpenRouter's HTML structure has changed
- Update selectors in `scrape-rankings.ts`
- Enable debug logging to see what's being parsed

### Gist update fails

- Verify your GitHub token has `gist` scope
- Check that the Gist ID is correct
- Ensure the token hasn't expired

### Rate limiting

- The scraper includes polite delays between requests
- If you get rate limited, increase `delayMs` in the config

## Development

To modify the scraper:

1. Update selectors in `scrape-rankings.ts` if HTML changes
2. Test locally with `npm run scrape`
3. Verify data structure matches expectations
4. Test Gist update with `npm run update-gist`

## Politeness

This scraper follows best practices:

- Identifies itself with a descriptive User-Agent
- Includes delays between requests (750ms default)
- Implements exponential backoff for retries
- Respects server errors and doesn't hammer the site
- Only runs once per day in production
