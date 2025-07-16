# Create New Worktree

Create a new git worktree for development: $ARGUMENTS

## Steps:
1. Parse the branch type and name from arguments (e.g., "feat/new-provider" or "fix new-provider")
2. If format is incorrect, suggest proper format: type/name
3. Run `npm run worktree:new -- <branch-name>`
4. Show the created worktree location
5. Provide instructions for:
   - Navigating to the new worktree
   - Running npm install
   - Opening in editor
   - Understanding the Claude persona for this worktree type
6. Remind about worktree-specific guidelines based on type