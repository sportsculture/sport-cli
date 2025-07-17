#!/bin/bash
set -euo pipefail

# Usage: ./scripts/worktree-new.sh <type>/<name> [base-branch]
# Example: ./scripts/worktree-new.sh feat/add-anthropic-provider
# Example: ./scripts/worktree-new.sh fix/config-loading main

BRANCH_NAME="${1:?Please provide branch name in format: type/name}"
BASE_BRANCH="${2:-main}"

# Validate branch name format
if [[ ! "$BRANCH_NAME" =~ ^(feat|fix|refactor|chore|exp)/.+ ]]; then
    echo "Error: Branch name must start with feat/, fix/, refactor/, chore/, or exp/"
    echo "Example: feat/add-new-provider"
    exit 1
fi

# Extract type and name
TYPE=$(echo "$BRANCH_NAME" | cut -d'/' -f1)
NAME=$(echo "$BRANCH_NAME" | cut -d'/' -f2-)

# Update main branch first
echo "📦 Updating $BASE_BRANCH branch..."
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"

# Create worktree
WORKTREE_PATH="./worktrees/$BRANCH_NAME"
echo "🌳 Creating worktree at $WORKTREE_PATH..."
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"

# Copy environment files
if [ -f ".env" ]; then
    echo "📋 Copying .env file..."
    cp .env "$WORKTREE_PATH/.env"
fi

if [ -f ".env.example" ]; then
    cp .env.example "$WORKTREE_PATH/.env.example"
fi

# Copy MCP configuration if exists
if [ -f ".mcp.json" ]; then
    echo "🔧 Copying MCP configuration..."
    cp .mcp.json "$WORKTREE_PATH/.mcp.json"
fi

# Create worktree-specific CLAUDE.md based on type
echo "📝 Creating worktree-specific CLAUDE.md..."
cat > "$WORKTREE_PATH/CLAUDE.md" << EOF
# Worktree: $BRANCH_NAME

## Worktree Type: ${TYPE^^}

### Claude Code Persona: $(case $TYPE in
    feat) echo "Feature Developer" ;;
    fix) echo "Debugger" ;;
    refactor) echo "Architect" ;;
    chore) echo "Maintainer" ;;
    exp) echo "Prototyper" ;;
esac)

### Context
This is a git worktree for: $BRANCH_NAME
Base branch: $BASE_BRANCH
Created: $(date)

### Primary Guidelines for $TYPE worktree:

$(case $TYPE in
    feat)
        cat << 'FEAT'
- **Scope is bounded to the feature**
- Free to add new dependencies (with justification)
- Must write corresponding unit and integration tests
- Must write or update relevant documentation
- Focus on functionality and innovation
FEAT
        ;;
    fix)
        cat << 'FIX'
- **Minimalist changes** - Fix the bug with smallest possible change
- **Test-driven approach is mandatory** - Write failing test first
- Do not refactor surrounding code unless necessary
- Focus on precision and isolation
FIX
        ;;
    refactor)
        cat << 'REFACTOR'
- **Understand the full scope** before making changes
- Perform systematic, repo-wide changes
- Prioritize consistency over cleverness
- Functional behavior must be identical before/after
- No new features or logic changes
REFACTOR
        ;;
    chore)
        cat << 'CHORE'
- Focus on maintenance tasks
- Update dependencies carefully
- Improve build processes
- Clean up technical debt
- No functional changes
CHORE
        ;;
    exp)
        cat << 'EXP'
- **Get it working, not perfect**
- Validate ideas quickly
- Tests and docs are optional
- Code quality standards relaxed
- This code is NOT for direct merge to main
EXP
        ;;
esac)

### Remember
- Run tests before committing: \`npm test\`
- Check types: \`npm run typecheck\`
- Lint code: \`npm run lint\`
- Keep commits focused and atomic

---
$(cat CLAUDE.md 2>/dev/null || echo "# No main CLAUDE.md found")
EOF

echo "✅ Worktree created successfully!"
echo ""
echo "Next steps:"
echo "1. cd $WORKTREE_PATH"
echo "2. npm install"
echo "3. code . (or your preferred editor)"
echo ""
echo "When done, remove with: ./scripts/worktree-remove.sh $BRANCH_NAME"