# Comprehensive Upstream Sync Guide for sport-cli

This guide provides detailed instructions for maintaining synchronization between sport-cli and the upstream google-gemini/gemini-cli repository.

## Table of Contents

1. [Overview](#overview)
2. [Initial Setup](#initial-setup)
3. [Automated Sync Process](#automated-sync-process)
4. [Manual Sync Process](#manual-sync-process)
5. [Conflict Resolution](#conflict-resolution)
6. [Testing and Validation](#testing-and-validation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

sport-cli uses a three-branch workflow to maintain clean separation between upstream changes and our multi-provider enhancements:

- **sport-upstream**: Clean mirror of google-gemini/gemini-cli (no modifications)
- **main**: Our production branch with all sport-cli features
- **sync/upstream-YYYYMMDD**: Temporary branches for sync operations

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sportsculture/gemini-cli.git sport-cli
cd sport-cli
```

### 2. Add Upstream Remote

```bash
git remote add upstream https://github.com/google-gemini/gemini-cli.git
git fetch upstream
```

### 3. Set Up Authentication

For HTTPS (GitHub Personal Access Token):
```bash
git config --global credential.helper store
# You'll be prompted for credentials on first push
```

For SSH (Recommended):
```bash
git remote set-url origin git@github.com:sportsculture/gemini-cli.git
```

### 4. Create sport-upstream Branch

```bash
git checkout -b sport-upstream upstream/main
git push -u origin sport-upstream
```

### 5. Protect Branches on GitHub

1. Go to Settings → Branches
2. Add protection rules for:
   - `main`: Require PR reviews, status checks
   - `sport-upstream`: Restrict direct pushes

## Automated Sync Process

### GitHub Actions Workflow

The repository includes an automated sync workflow that runs weekly:

```yaml
# .github/workflows/upstream-sync.yml
- Runs every Sunday at 00:00 UTC
- Can be triggered manually via GitHub UI
- Creates PR automatically if upstream has changes
```

### Manual Trigger

1. Go to Actions → Upstream Sync
2. Click "Run workflow"
3. Select sync type:
   - `check`: Only check for changes
   - `sync`: Create sync PR
   - `force-sync`: Force sync even with conflicts

## Manual Sync Process

### Quick Sync (Using Helper Script)

```bash
./scripts/manual-sync-helper.sh
```

This interactive script will:
1. Check current status
2. Fetch latest changes
3. Update sport-upstream
4. Create sync branch
5. Attempt merge
6. Apply patches
7. Run tests
8. Create PR

### Step-by-Step Manual Process

#### 1. Check Current Divergence

```bash
./scripts/check-divergence.sh
```

#### 2. Update sport-upstream

```bash
git checkout sport-upstream
git fetch upstream
git reset --hard upstream/main
git push origin sport-upstream --force-with-lease
```

#### 3. Create Sync Branch

```bash
git checkout main
git checkout -b sync/upstream-$(date +%Y%m%d)
```

#### 4. Merge Upstream Changes

```bash
git merge sport-upstream
```

#### 5. Apply sport-cli Patches

```bash
for patch in patches/*/*.patch; do
    git apply "$patch" || echo "Failed: $patch"
done
```

#### 6. Run Tests

```bash
npm run preflight
```

#### 7. Create Pull Request

```bash
git push origin sync/upstream-$(date +%Y%m%d)
gh pr create --title "🔄 Sync with upstream" --body "..."
```

## Conflict Resolution

### Common Conflict Patterns

| File Type | Resolution Strategy | Tools |
|-----------|-------------------|-------|
| Provider files | Keep sport-cli version | `git checkout --ours` |
| Core gemini files | Take upstream, re-apply patches | `git checkout --theirs` |
| package.json | Merge both | Manual merge |
| Tests | Keep both test suites | Merge carefully |

### Using the Conflict Resolution Helper

```bash
./scripts/resolve-conflicts-helper.sh
```

This tool will:
- Categorize conflicts by type
- Suggest resolution strategies
- Offer automated fixes for common patterns

### Manual Conflict Resolution

1. **List conflicted files:**
   ```bash
   git diff --name-only --diff-filter=U
   ```

2. **For provider files (always keep ours):**
   ```bash
   git checkout --ours packages/core/src/providers/
   git add packages/core/src/providers/
   ```

3. **For upstream files (usually take theirs):**
   ```bash
   git checkout --theirs packages/core/src/someUpstreamFile.ts
   # Then re-apply our modifications if needed
   ```

4. **For mixed files (manual merge):**
   ```bash
   # Edit the file to resolve conflicts
   code packages/core/src/contentGenerator.ts
   # Look for our injection points and preserve them
   ```

## Testing and Validation

### Automated Test Suite

```bash
npm test -- tests/sync-validation.test.ts
```

This validates:
- All provider files exist
- Multi-provider functionality works
- Build system succeeds
- TypeScript compilation passes
- Backward compatibility maintained

### Manual Testing Checklist

- [ ] Build completes: `npm run build`
- [ ] TypeScript checks pass: `npm run typecheck`
- [ ] Unit tests pass: `npm test`
- [ ] sport CLI starts: `npm start`
- [ ] Provider switching works: `/model openai/gpt-4`
- [ ] Gemini compatibility: `gemini` command works
- [ ] Config fallback: Both `.sport` and `.gemini` directories work

### Integration Testing

```bash
# Test Gemini provider
export GEMINI_API_KEY="your-key"
npm start
> Hello, test the Gemini provider

# Test OpenRouter provider  
export OPENROUTER_API_KEY="your-key"
npm start
> /model claude-3-sonnet
> Hello, test the OpenRouter provider
```

## Troubleshooting

### Common Issues

#### 1. Push Authentication Failed

```bash
# Switch to SSH
git remote set-url origin git@github.com:sportsculture/gemini-cli.git
```

#### 2. Merge Conflicts in package.json

```bash
# Use npm to regenerate lock file
rm package-lock.json
npm install
git add package-lock.json
```

#### 3. Patch Application Failed

```bash
# Check patch validity
git apply --check patches/001-provider-abstraction/contentGenerator.patch

# Apply with context adjustment
git apply -3 patches/001-provider-abstraction/contentGenerator.patch
```

#### 4. Tests Failing After Sync

```bash
# Check for TypeScript errors first
npm run typecheck

# Run specific test
npm test -- --reporter=verbose path/to/failing.test.ts
```

### Emergency Rollback

If sync goes wrong:

```bash
# Find last good commit
git log --oneline main

# Reset to last good state
git checkout main
git reset --hard <last-good-commit>
git push origin main --force-with-lease
```

## Best Practices

### 1. Sync Frequency

- Run weekly automated sync
- Manual sync for critical security updates
- Don't let divergence grow > 100 commits

### 2. Patch Management

- Keep patches minimal and focused
- Review patches regularly: `./scripts/extract-patches.sh`
- Document why each patch exists

### 3. Commit Messages

```bash
# For sync commits
git commit -m "Sync with upstream google-gemini/gemini-cli

- Merged X commits from upstream
- Resolved conflicts in Y files
- All tests passing"
```

### 4. PR Reviews

Always have sync PRs reviewed for:
- Correct conflict resolution
- No lost sport-cli features
- Tests passing
- Documentation updates

### 5. Communication

- Note breaking changes in PR description
- Update CHANGELOG.md if needed
- Notify team of major upstream changes

## Maintaining the Sync System

### Update Patches

After adding new sport-cli features:

```bash
# Create patch for new changes
git diff upstream/main HEAD -- path/to/new/file > patches/category/newfile.patch

# Regenerate all patches
./scripts/extract-patches.sh
```

### Monitor Upstream

```bash
# Check for new upstream releases
git fetch upstream --tags
git tag -l --sort=-version:refname | head -10

# See what's coming
git log --oneline main..upstream/main
```

### Contribute Back

Consider upstreaming:
- General bug fixes
- Architecture improvements
- Test enhancements
- Documentation improvements

```bash
# Create a clean branch from upstream
git checkout -b upstream-contribution upstream/main
# Cherry-pick specific commits
git cherry-pick <commit-hash>
# Push and create PR to upstream
```

## Appendix: File Reference

### Scripts

- `scripts/check-divergence.sh` - Check sync status
- `scripts/sync-upstream-simple.sh` - Basic sync workflow
- `scripts/manual-sync-helper.sh` - Interactive sync wizard
- `scripts/resolve-conflicts-helper.sh` - Conflict resolution tool
- `scripts/extract-patches.sh` - Generate patch files
- `scripts/update-branding.js` - Switch branding configuration

### Configuration

- `.github/workflows/upstream-sync.yml` - Automated sync workflow
- `patches/` - sport-cli modifications as patches
- `packages/core/src/config/branding.ts` - Centralized branding

### Documentation

- `SYNC_WORKFLOW.md` - Three-branch workflow explanation
- `SYNC_SETUP_NOTES.md` - Implementation notes
- `patches/MANIFEST.md` - Patch documentation

---

For questions or issues with the sync process, please open an issue or contact the sport-cli maintainers.