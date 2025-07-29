# Three-Branch Workflow for Upstream Synchronization

## Overview

This document describes the three-branch Git workflow designed to maintain the sport-cli fork while staying synchronized with the upstream google-gemini/gemini-cli repository.

## Branch Structure

```
upstream/main ─────┬─────────────────┬─────────────────┐
                   │                 │                 │
sport-upstream ────┴─────────────────┴─────────────────┘
     │                                   
     ├─ (cherry-pick upstream changes)
     │
sport-main ────────────────────────────────────────────
     │
     └─ (feature branches)
```

### Branch Purposes

1. **upstream/main**: Read-only reference to google-gemini/gemini-cli
2. **sport-upstream**: Clean mirror of upstream with ZERO modifications
3. **sport-main**: Production branch with all sport-cli customizations
4. **feature branches**: All new development work

## Initial Setup

### 1. Add Upstream Remote (if not already done)

```bash
git remote add upstream https://github.com/google-gemini/gemini-cli.git
git fetch upstream
```

### 2. Create sport-upstream Branch

```bash
# Create a clean branch from current upstream
git checkout -b sport-upstream upstream/main
git push origin sport-upstream
```

### 3. Protect Branches

Configure branch protection rules on GitHub:
- **sport-upstream**: No direct pushes, only sync from upstream
- **sport-main**: Require PR reviews, status checks

## Sync Process

### Weekly Automated Sync

1. **Update sport-upstream**:
   ```bash
   git checkout sport-upstream
   git fetch upstream
   git reset --hard upstream/main
   git push origin sport-upstream --force-with-lease
   ```

2. **Create Sync Branch**:
   ```bash
   git checkout sport-main
   git checkout -b sync/upstream-$(date +%Y%m%d)
   ```

3. **Merge Upstream Changes**:
   ```bash
   git merge sport-upstream
   ```

4. **Apply Patches** (if using patch system):
   ```bash
   for patch in patches/*/*.patch; do
     git apply $patch || echo "Conflict in $patch"
   done
   ```

5. **Resolve Conflicts**:
   - Core gemini code: Take upstream
   - Provider system: Keep sport-cli
   - Tests: Merge both
   - Dependencies: Merge carefully

6. **Create Pull Request**:
   ```bash
   git push origin sync/upstream-$(date +%Y%m%d)
   gh pr create --title "Sync with upstream $(date +%Y-%m-%d)" \
                --body "Weekly sync from google-gemini/gemini-cli"
   ```

## Conflict Resolution Guidelines

### By File Type

| File Pattern | Strategy | Reason |
|--------------|----------|---------|
| `packages/core/src/providers/*` | Keep sport-cli | Our core value-add |
| `packages/core/src/contentGenerator.ts` | Merge carefully | Has provider injections |
| `package.json` | Merge both | Keep our deps + upstream |
| `README.md` | Take upstream, re-add our section | Minimize changes |
| Tests | Merge both | Keep all tests |

### By Change Type

1. **New Features from Upstream**: Always include
2. **Bug Fixes**: Always include
3. **Breaking Changes**: Adapt our code to match
4. **Dependency Updates**: Merge, prioritizing security

## Feature Development Workflow

### Creating Features

```bash
# Always branch from sport-main
git checkout sport-main
git pull origin sport-main
git checkout -b feature/my-feature
```

### Keeping Features Updated

```bash
# Regularly rebase on sport-main
git checkout feature/my-feature
git rebase sport-main
```

## Emergency Upstream Fixes

If upstream has a critical fix:

```bash
# Cherry-pick specific commits
git checkout sport-main
git cherry-pick <upstream-commit-hash>
git push origin sport-main
```

## Monitoring Upstream

### Automated Notifications

Set up GitHub Actions to notify when:
- Upstream has new releases
- Upstream has security updates
- Weekly sync fails

### Manual Checks

```bash
# Check upstream changes
git fetch upstream
git log sport-upstream..upstream/main --oneline

# See what files changed
git diff sport-upstream upstream/main --name-only
```

## Best Practices

1. **Never modify sport-upstream directly**
2. **Always create sync PRs for review**
3. **Document conflict resolutions in PR**
4. **Run full test suite after each sync**
5. **Tag sport-main before major syncs**

## Rollback Procedure

If a sync goes wrong:

```bash
# Find last good commit
git log sport-main --oneline

# Reset to last good state
git checkout sport-main
git reset --hard <last-good-commit>
git push origin sport-main --force-with-lease
```

## Tools and Scripts

Create these helper scripts in `scripts/`:

### sync-upstream.sh
```bash
#!/bin/bash
set -e

echo "Syncing with upstream..."
git checkout sport-upstream
git fetch upstream
git reset --hard upstream/main
git push origin sport-upstream --force-with-lease

echo "Creating sync branch..."
git checkout sport-main
SYNC_BRANCH="sync/upstream-$(date +%Y%m%d)"
git checkout -b $SYNC_BRANCH

echo "Merging upstream changes..."
git merge sport-upstream

echo "Sync branch created: $SYNC_BRANCH"
echo "Please resolve any conflicts and create a PR"
```

### check-divergence.sh
```bash
#!/bin/bash
echo "Fetching latest..."
git fetch upstream
git fetch origin

echo -e "\nCommits in upstream not in sport-main:"
git log sport-main..upstream/main --oneline | head -20

echo -e "\nFiles changed in upstream:"
git diff sport-main upstream/main --name-only | head -20

echo -e "\nOur unique commits:"
git log upstream/main..sport-main --oneline | head -20
```

## Next Steps

1. Set up branch protection rules
2. Create GitHub Action for automation
3. Document all current injection points
4. Create initial patch set