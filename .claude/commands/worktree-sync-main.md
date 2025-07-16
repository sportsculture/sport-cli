# Sync Worktree with Main

Sync the current worktree with the latest changes from main branch.

## Steps:
1. Check current worktree with `pwd` and git status
2. Warn if there are uncommitted changes
3. Run `npm run worktree:sync` to:
   - Update main branch
   - Stash local changes
   - Rebase current branch on main
   - Pop stashed changes
4. If conflicts occur, provide clear instructions for resolution
5. If package files changed, remind to run npm install
6. Show the current status after sync