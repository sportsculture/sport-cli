#!/bin/bash
set -euo pipefail

# Usage: ./scripts/worktree-remove.sh <branch-name>
# Example: ./scripts/worktree-remove.sh feat/add-anthropic-provider

BRANCH_NAME="${1:?Please provide branch name to remove}"
WORKTREE_PATH="./worktrees/$BRANCH_NAME"

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree not found at $WORKTREE_PATH"
    echo "Available worktrees:"
    git worktree list
    exit 1
fi

# Confirm removal
echo "⚠️  This will remove worktree: $WORKTREE_PATH"
echo "   and delete branch: $BRANCH_NAME"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Remove worktree
echo "🗑️  Removing worktree..."
git worktree remove "$WORKTREE_PATH"

# Delete branch
echo "🗑️  Deleting branch..."
git branch -d "$BRANCH_NAME" 2>/dev/null || {
    echo "Branch has unmerged changes. Force delete?"
    read -p "(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -D "$BRANCH_NAME"
    fi
}

echo "✅ Worktree removed successfully!"