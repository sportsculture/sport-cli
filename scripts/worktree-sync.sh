#!/bin/bash
set -euo pipefail

# Usage: ./scripts/worktree-sync.sh [worktree-name]
# Syncs a worktree with the latest changes from main
# If no worktree name provided, syncs current worktree

WORKTREE_NAME="${1:-}"
CURRENT_DIR=$(pwd)

# If no worktree specified, detect from current directory
if [ -z "$WORKTREE_NAME" ]; then
    if [[ "$CURRENT_DIR" == *"/worktrees/"* ]]; then
        WORKTREE_NAME=$(echo "$CURRENT_DIR" | sed 's|.*/worktrees/||')
        echo "🔍 Detected worktree: $WORKTREE_NAME"
    else
        echo "Error: Not in a worktree directory and no worktree specified"
        echo "Usage: ./scripts/worktree-sync.sh [worktree-name]"
        exit 1
    fi
fi

# Get the main repo directory
MAIN_REPO=$(git worktree list | head -1 | awk '{print $1}')

# Update main branch
echo "📦 Updating main branch..."
cd "$MAIN_REPO"
git checkout main
git pull origin main

# Go to worktree
WORKTREE_PATH="$MAIN_REPO/worktrees/$WORKTREE_NAME"
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree not found at $WORKTREE_PATH"
    exit 1
fi

cd "$WORKTREE_PATH"
CURRENT_BRANCH=$(git branch --show-current)

# Stash any uncommitted changes
echo "💾 Stashing uncommitted changes..."
STASH_OUTPUT=$(git stash push -m "worktree-sync auto-stash $(date +%s)" 2>&1)
STASHED=false
if [[ ! "$STASH_OUTPUT" =~ "No local changes to save" ]]; then
    STASHED=true
fi

# Rebase on main
echo "🔄 Rebasing $CURRENT_BRANCH on main..."
if git rebase main; then
    echo "✅ Rebase successful!"
else
    echo "❌ Rebase failed. Resolve conflicts and run:"
    echo "   git rebase --continue"
    if [ "$STASHED" = true ]; then
        echo "Don't forget to apply your stash:"
        echo "   git stash pop"
    fi
    exit 1
fi

# Pop stash if we stashed
if [ "$STASHED" = true ]; then
    echo "📤 Restoring stashed changes..."
    git stash pop || {
        echo "⚠️  Failed to pop stash. Your changes are safe in stash."
        echo "Run 'git stash list' to see stashes."
    }
fi

# Update dependencies if package.json changed
if git diff HEAD@{1} --name-only | grep -q "package.*json"; then
    echo "📦 Package files changed, running npm install..."
    npm install
fi

echo "✅ Worktree synced successfully!"