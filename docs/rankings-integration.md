# OpenRouter Rankings Integration

## Overview

The sport-cli integrates real-time OpenRouter model rankings to provide data-driven model recommendations. This system collects daily rankings data and uses it to enhance the model selection experience.

## Architecture

```
OpenRouter → Scraper → GitHub Gist → sport-cli → User
             (daily)    (storage)     (client)
```

## Components

### 1. Rankings Scraper (`scripts/rankings-scraper/`)

Automated scraper that collects rankings data daily:

- **Cheerio-based scraper**: Fast HTML parsing for static content
- **Puppeteer fallback**: Handles JavaScript-rendered pages
- **Polite scraping**: Rate limiting, proper User-Agent
- **Multiple categories**: overall, programming, translation, reasoning
- **Multiple time periods**: day, week, month

### 2. GitHub Actions Workflow (`.github/workflows/rankings-scraper.yml`)

Automated daily execution:
- Runs at 04:37 UTC daily
- Fetches latest rankings
- Updates GitHub Gist with fresh data
- Creates issues on failure for monitoring

### 3. Rankings Client (`packages/core/src/rankings/`)

Client library for consuming rankings data:

```typescript
import { getRankingsClient } from '@core/rankings';

const client = getRankingsClient();

// Get top models
const topModels = await client.getTopModels('programming', 'day', 10);

// Get trending models
const trending = await client.getTrending();

// Get model rank
const rank = await client.getModelRank('openai/gpt-4o');

// Get category leaders
const leaders = await client.getCategoryLeaders();
```

### 4. Caching System

Intelligent caching to minimize API calls:
- **Memory cache**: Runtime storage
- **Disk cache**: Persistent storage at `~/.sport/cache/rankings.json`
- **24-hour TTL**: Automatic refresh after expiry
- **Fallback**: Uses stale data if fetch fails

## Setup Instructions

### 1. Create GitHub Gist

1. Go to https://gist.github.com
2. Create a new public gist
3. Filename: `openrouter-rankings.json`
4. Initial content: `{}`
5. Save and copy the Gist ID from URL

### 2. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scope: `gist`
4. Copy the token

### 3. Configure Repository Secrets

Add to your GitHub repository:
- `GIST_ID`: Your Gist ID
- `GH_TOKEN`: Your GitHub token

### 4. Test Locally

```bash
cd scripts/rankings-scraper
npm install

# Test with mock data
npx tsx generate-mock-data.ts

# Test scraper (requires environment variables)
export GIST_ID="your-gist-id"
export GH_TOKEN="your-token"
npm run test

# Update gist with test data
npm run update-gist mock-rankings.json
```

## Data Schema

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

## Integration with CLI

The rankings data enhances the model selection experience:

### Model Recommendations

Rankings are used to score and sort model recommendations:

```typescript
// Scoring weights
- OpenRouter rankings: 40%
- Cost efficiency: 30%
- Context window: 20%
- Provider reliability: 10%
```

### Visual Indicators

Models display badges based on rankings:
- 🔥 **Trending**: Rising in rankings
- 👑 **Most Popular**: #1 in overall rankings
- 💻 **Top for Code**: #1 in programming category
- 📈 **Rising Star**: Biggest rank improvement
- 🎯 **Community Choice**: High market share

### CLI Commands

```bash
# View models with rankings
sport --models

# Get recommendations (uses rankings)
sport recommend --task programming

# Clear rankings cache
sport cache clear rankings
```

## Troubleshooting

### Scraper Issues

If the scraper fails to find models:

1. **Check HTML structure**: OpenRouter may have changed their page
2. **Update selectors**: Modify `scrape-rankings.ts`
3. **Use Puppeteer**: Run `npm run scrape:puppeteer` for JS-rendered content
4. **Check logs**: GitHub Actions logs show detailed errors

### Cache Issues

```bash
# Clear cache manually
rm ~/.sport/cache/rankings.json

# Force refresh in code
const client = getRankingsClient();
await client.fetchLatest(true); // force refresh
```

### Gist Update Failures

1. Verify token has `gist` scope
2. Check Gist ID is correct
3. Ensure token hasn't expired
4. Check GitHub API status

## Development

### Adding New Categories

1. Update types in `types.ts`
2. Add category to scraper loops
3. Update client methods
4. Add UI indicators

### Modifying Scraping Logic

1. Test locally first with mock data
2. Update selectors gradually
3. Keep fallback mechanisms
4. Test all categories/periods

### Performance Optimization

- Cache aggressively (24h TTL)
- Batch API calls
- Use memory cache first
- Implement request coalescing

## Security Considerations

1. **API Keys**: Never commit tokens
2. **Rate Limiting**: Respect OpenRouter's servers
3. **User Privacy**: Don't track individual usage
4. **Data Validation**: Sanitize scraped content

## Future Enhancements

1. **Historical Trends**: Track 30-day changes
2. **Performance Metrics**: Add latency scores
3. **Multi-Source**: Aggregate from multiple platforms
4. **Personalization**: User-specific recommendations
5. **Webhooks**: Real-time updates on rank changes

## Monitoring

### Health Checks

- GitHub Actions runs daily
- Creates issue on 3 consecutive failures
- Logs stored for 7 days
- Artifacts saved for debugging

### Metrics to Track

- Scraping success rate
- Data freshness
- Cache hit ratio
- Response times

## Contributing

1. Test changes locally
2. Update documentation
3. Add tests for new features
4. Follow existing patterns

## Support

For issues or questions:
- Check GitHub Actions logs
- Review error messages
- Open an issue with details
- Include rankings.json if available