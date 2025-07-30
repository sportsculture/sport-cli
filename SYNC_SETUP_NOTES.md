# Three-Branch Workflow Setup Notes

## Current Status

As of 2025-07-29, the three-branch workflow has been partially implemented for the sport-cli project.

### ✅ Completed

1. **Remote Configuration**
   - `upstream` remote is properly configured pointing to https://github.com/google-gemini/gemini-cli.git
   - `origin` remote points to https://github.com/sportsculture/gemini-cli.git

2. **sport-upstream Branch**
   - Created locally and synced with upstream/main
   - Currently at commit 7356764a (latest from upstream)
   - ⚠️ Not yet pushed to origin due to authentication requirements

3. **Helper Scripts Created**
   - `scripts/sync-upstream.sh` - Existing sophisticated sync script (already present)
   - `scripts/sync-upstream-simple.sh` - New simplified three-branch workflow script
   - `scripts/check-divergence.sh` - Check divergence between forks
   - `scripts/resolve-conflicts-helper.sh` - Interactive conflict resolution helper

### ⚠️ Considerations

1. **Branch Naming**
   - Currently using `main` instead of `sport-main` as specified in SYNC_WORKFLOW.md
   - Scripts are configured to work with either name
   - Consider if renaming is necessary for clarity

2. **Authentication**
   - Push operations to origin require authentication
   - HTTPS URLs are used, which may require credentials or SSH setup

3. **Existing Sync Script**
   - There's already a more complex `sync-upstream.sh` script with additional features
   - The new `sync-upstream-simple.sh` follows the documented three-branch workflow more closely

## Next Steps

### Immediate Actions Required

1. **Push sport-upstream to origin**

   ```bash
   git checkout sport-upstream
   git push origin sport-upstream
   ```

2. **Set up branch protection** (on GitHub)
   - Protect `sport-upstream` from direct pushes
   - Protect `main` to require PR reviews

3. **Test the workflow**
   ```bash
   ./scripts/check-divergence.sh  # Check current state
   ./scripts/sync-upstream-simple.sh  # Test sync process
   ```

### Optional Improvements

1. **Consider branch rename**

   ```bash
   # If you want to use sport-main instead of main
   git branch -m main sport-main
   git push origin -u sport-main
   # Update default branch on GitHub
   ```

2. **GitHub Actions**
   - Set up automated weekly sync
   - Add notifications for upstream changes
   - Automate conflict detection

3. **Documentation Updates**
   - Update CLAUDE.md with new sync workflow
   - Add script documentation to CONTRIBUTING.md

## Script Usage Guide

### Check Current Divergence

```bash
./scripts/check-divergence.sh
```

Shows commits and files that differ between sport-cli and upstream.

### Perform Upstream Sync

```bash
./scripts/sync-upstream-simple.sh
```

Executes the three-branch sync workflow:

1. Updates sport-upstream to match upstream/main
2. Creates a sync branch from main
3. Merges upstream changes
4. Runs tests if merge succeeds

### Resolve Conflicts

```bash
./scripts/resolve-conflicts-helper.sh
```

Interactive helper that:

- Categorizes conflicts by type
- Offers automated resolution for common patterns
- Provides guidance for manual resolution

## Conflict Resolution Strategy

Based on the codebase analysis:

| File Pattern                            | Resolution Strategy                 | Reason                            |
| --------------------------------------- | ----------------------------------- | --------------------------------- |
| `packages/core/src/providers/*`         | Keep sport-cli                      | Core multi-provider functionality |
| `packages/core/src/contentGenerator.ts` | Merge carefully                     | Has provider injections           |
| `package.json`                          | Merge both                          | Keep all dependencies             |
| `README.md`                             | Take upstream, re-add sport section | Minimize divergence               |
| Test files                              | Merge both                          | Keep all tests                    |
| `CLAUDE.md`                             | Keep sport-cli                      | Fork-specific documentation       |

## Known Issues

1. **Authentication**: HTTPS remotes require credential setup for pushing
2. **Branch Protection**: Not yet configured on GitHub
3. **sport-upstream**: Not yet pushed to origin

## Maintenance Tips

1. Run `check-divergence.sh` weekly to monitor upstream changes
2. Sync promptly when upstream has important fixes
3. Keep provider code well-isolated to minimize conflicts
4. Document all conflict resolutions in PR descriptions
5. Tag main branch before major syncs for easy rollback
