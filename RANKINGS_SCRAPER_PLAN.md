# OpenRouter Rankings Scraper Implementation Plan

## 🎯 Objective

Create a polite, efficient system to collect OpenRouter model rankings daily and use them to provide data-driven model recommendations in sport-cli.

## 📊 Data Flow Architecture

```
OpenRouter Rankings → Daily Scraper → GitHub Gist → sport-cli → Smart Recommendations
     (source)         (GitHub Actions)   (storage)    (consumer)      (end user)
```

## 🏗️ Implementation Phases

### Phase 1: Scraper Module Setup

**Location**: `scripts/rankings-scraper/`

#### 1.1 Core Scraper (`scrape-rankings.ts`)

```typescript
// Key features:
- Cheerio-based HTML parsing (fast, lightweight)
- Puppeteer fallback for JS-rendered content
- Polite scraping: User-Agent, delays, rate limiting
- Multiple categories: overall, programming, translation
- Multiple periods: day, week, month
```

#### 1.2 Data Schema

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-11T19:05:00Z",
  "source": "https://openrouter.ai/rankings",
  "snapshots": [
    {
      "category": "programming",
      "period": "day",
      "models": [
        {
          "rank": 1,
          "model_id": "openai/gpt-4o",
          "name": "GPT-4o",
          "share": 0.214,
          "tokens": 123456789,
          "url": "https://openrouter.ai/openai/gpt-4o"
        }
      ]
    }
  ]
}
```

#### 1.3 Gist Updater (`update-gist.ts`)

```typescript
// Features:
- GitHub API integration
- Atomic updates
- Version history (via Gist commits)
- Error handling and retries
```

### Phase 2: GitHub Actions Workflow

**Location**: `.github/workflows/rankings-scraper.yml`

```yaml
Schedule:
- Daily at 04:37 UTC (randomized minute)
- Manual trigger via workflow_dispatch
- Conditional run (skip if no changes)

Steps:
1. Checkout repository
2. Setup Node.js
3. Install dependencies (cached)
4. Run scraper
5. Update Gist
6. Commit any changes (optional)
```

### Phase 3: CLI Integration

**Location**: `packages/core/src/rankings/`

#### 3.1 Rankings Client (`rankings-client.ts`)

```typescript
class RankingsClient {
  - fetchLatest(): Fetch from Gist URL
  - getCached(): Return cached data if < 24h old
  - getTopModels(category, count): Get top N models
  - getModelRank(modelId, category): Get specific model's rank
  - getTrending(): Compare week vs day rankings
}
```

#### 3.2 Cache Manager (`rankings-cache.ts`)

```typescript
// Storage locations:
- Memory cache (runtime)
- Disk cache (~/.sport/cache/rankings.json)
- TTL: 24 hours
- Fallback to last known good data
```

### Phase 4: Recommendations Enhancement

**Location**: `packages/cli/src/ui/commands/modelsCommand.ts`

#### 4.1 Enhanced Scoring

```typescript
// Combine multiple signals:
- OpenRouter rankings (40% weight)
- Cost efficiency (30% weight)
- Context window (20% weight)
- Provider reliability (10% weight)
```

#### 4.2 New Recommendation Categories

```typescript
- "🔥 Trending" - Rising in rankings
- "👑 Most Popular" - #1 in overall rankings
- "💻 Top for Code" - #1 in programming category
- "📈 Rising Star" - Biggest rank improvement
- "🎯 Community Choice" - High market share
```

## 📁 File Structure

```
sport-cli/
├── scripts/
│   └── rankings-scraper/
│       ├── scrape-rankings.ts
│       ├── update-gist.ts
│       ├── parse-html.ts
│       ├── types.ts
│       └── README.md
├── .github/
│   └── workflows/
│       └── rankings-scraper.yml
├── packages/
│   └── core/
│       └── src/
│           └── rankings/
│               ├── index.ts
│               ├── rankings-client.ts
│               ├── rankings-cache.ts
│               └── types.ts
└── docs/
    └── rankings-integration.md
```

## 🔒 Security & Secrets

### Required Secrets (GitHub Actions)

```
GIST_ID: <gist-id>
GH_TOKEN: <github-personal-access-token>
```

### Permissions Needed

- `gist:write` - Update the rankings Gist
- `repo:read` - Read repository (for Actions)

## 🎯 Politeness & Best Practices

### Scraping Etiquette

1. **User-Agent**: `sport-cli-rankings-bot/1.0 (https://github.com/sportsculture/sport-cli; contact@sportsculture.com)`
2. **Rate Limiting**: 500-1000ms delay between requests
3. **Caching**: Honor ETags and 304 responses
4. **Robots.txt**: Check and respect (though rankings are public data)
5. **Attribution**: Always include source URL and timestamp

### Error Handling

1. **Graceful Degradation**: Use cached data if scraping fails
2. **Alerting**: Create GitHub Issue if scraping fails 3 days in a row
3. **Layout Changes**: Detect and log when selectors fail
4. **Retries**: Exponential backoff with max 3 attempts

## 📈 Success Metrics

### Phase 1 Success (Week 1)

- [ ] Scraper successfully extracts rankings
- [ ] Data pushed to GitHub Gist
- [ ] Manual test run succeeds

### Phase 2 Success (Week 2)

- [ ] GitHub Actions runs daily without errors
- [ ] Gist updates with fresh data
- [ ] 7 days of successful runs

### Phase 3 Success (Week 3)

- [ ] CLI fetches rankings data
- [ ] Cache works correctly
- [ ] Rankings displayed in --models command

### Phase 4 Success (Week 4)

- [ ] Smart recommendations use real rankings
- [ ] Users see "Trending" and "Popular" badges
- [ ] Performance metrics improved

## 🚀 Implementation Timeline

### Week 1: Foundation

- Day 1-2: Create scraper module
- Day 3: Set up GitHub Gist
- Day 4: Test scraper locally
- Day 5-7: Refine selectors, handle edge cases

### Week 2: Automation

- Day 8-9: Create GitHub Actions workflow
- Day 10: Configure secrets and permissions
- Day 11-14: Monitor daily runs, fix issues

### Week 3: Integration

- Day 15-16: Build rankings client
- Day 17-18: Implement caching
- Day 19-21: Integrate with CLI

### Week 4: Enhancement

- Day 22-23: Update recommendations algorithm
- Day 24-25: Add trending indicators
- Day 26-28: Testing and documentation

## 📝 Documentation Needed

1. **User Documentation** (`docs/rankings.md`)
   - How rankings work
   - What the badges mean
   - How often data updates

2. **Developer Documentation** (`scripts/rankings-scraper/README.md`)
   - How to run locally
   - How to update selectors
   - Troubleshooting guide

3. **API Documentation** (`packages/core/src/rankings/README.md`)
   - RankingsClient API
   - Cache behavior
   - Data structures

## ✅ Checklist for Implementation

### Prerequisites

- [ ] Create GitHub Gist manually
- [ ] Generate GitHub Personal Access Token
- [ ] Add secrets to repository
- [ ] Verify OpenRouter rankings page structure

### Development

- [ ] Implement scraper with Cheerio
- [ ] Add Puppeteer fallback
- [ ] Create Gist updater
- [ ] Set up GitHub Actions
- [ ] Build rankings client
- [ ] Add caching layer
- [ ] Integrate with models command
- [ ] Update recommendation algorithm

### Testing

- [ ] Unit tests for parser
- [ ] Integration tests for client
- [ ] End-to-end test with mock data
- [ ] Manual verification of rankings

### Deployment

- [ ] Enable GitHub Actions workflow
- [ ] Monitor first week of runs
- [ ] Add error alerting
- [ ] Document for users

## 🎉 Expected Outcomes

1. **Real-time Intelligence**: sport-cli knows which models are actually popular
2. **Trend Detection**: Users see which models are rising/falling
3. **Category Leaders**: Best models for specific tasks (programming, translation)
4. **Cost-Performance Balance**: Combine popularity with affordability
5. **Community Validation**: Recommendations backed by real usage data

## 🔮 Future Enhancements

1. **Historical Trends**: Show 30-day ranking changes
2. **Performance Metrics**: Add latency/quality scores if available
3. **Multi-Source**: Aggregate rankings from multiple platforms
4. **Personalization**: Weight recommendations based on user's usage patterns
5. **Alerts**: Notify when favorite models drop in rankings

---

This plan provides a production-ready, polite, and efficient way to enhance sport-cli with real-world model performance data!
