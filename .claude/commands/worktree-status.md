# Worktree Status Check

Show the current worktree status and provide guidance based on the worktree type.

## Steps:
1. Run `git worktree list` to see all worktrees
2. Run `pwd` to identify current worktree
3. Check git status in current worktree
4. Identify the worktree type from branch name (feat/, fix/, refactor/, etc.)
5. Remind about the appropriate Claude persona and guidelines for this worktree type
6. Show any uncommitted changes or work in progress
7. Suggest next steps based on worktree type and current state