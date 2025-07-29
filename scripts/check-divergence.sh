#!/bin/bash
# Check divergence between sport-cli and upstream google-gemini/gemini-cli
set -e

echo "============================================="
echo "sport-cli Divergence Check"
echo "============================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo "Error: upstream remote not found. Please add it with:"
    echo "git remote add upstream https://github.com/google-gemini/gemini-cli.git"
    exit 1
fi

echo "Fetching latest from upstream..."
git fetch upstream --quiet
git fetch origin --quiet

echo ""
echo "Upstream Status:"
echo "================"
UPSTREAM_COMMITS=$(git log --oneline main..upstream/main 2>/dev/null | head -20)
if [ -z "$UPSTREAM_COMMITS" ]; then
    echo "✓ No new commits in upstream/main"
else
    echo "New commits in upstream/main not in our main:"
    echo "$UPSTREAM_COMMITS"
    UPSTREAM_COUNT=$(git rev-list --count main..upstream/main 2>/dev/null || echo "0")
    if [ "$UPSTREAM_COUNT" -gt 20 ]; then
        echo "... and $((UPSTREAM_COUNT - 20)) more commits"
    fi
fi

echo ""
echo "Our Unique Changes:"
echo "==================="
OUR_COMMITS=$(git log --oneline upstream/main..main 2>/dev/null | head -20)
if [ -z "$OUR_COMMITS" ]; then
    echo "⚠ No unique commits (main is behind or equal to upstream)"
else
    echo "Our commits not in upstream:"
    echo "$OUR_COMMITS"
    OUR_COUNT=$(git rev-list --count upstream/main..main 2>/dev/null || echo "0")
    if [ "$OUR_COUNT" -gt 20 ]; then
        echo "... and $((OUR_COUNT - 20)) more commits"
    fi
fi

echo ""
echo "Files Changed:"
echo "=============="
echo "Files we've modified compared to upstream:"
CHANGED_FILES=$(git diff --name-only upstream/main main 2>/dev/null | head -20)
if [ -z "$CHANGED_FILES" ]; then
    echo "No files changed"
else
    echo "$CHANGED_FILES"
    FILE_COUNT=$(git diff --name-only upstream/main main 2>/dev/null | wc -l)
    if [ "$FILE_COUNT" -gt 20 ]; then
        echo "... and $((FILE_COUNT - 20)) more files"
    fi
fi

echo ""
echo "Provider-Specific Changes:"
echo "========================="
PROVIDER_FILES=$(git diff --name-only upstream/main main 2>/dev/null | grep -E "(provider|openrouter|customApi)" || true)
if [ -z "$PROVIDER_FILES" ]; then
    echo "No provider-specific files found"
else
    echo "Provider/multi-model files:"
    echo "$PROVIDER_FILES"
fi

echo ""
echo "Branch Summary:"
echo "==============="
echo "- main: $(git rev-parse --short main)"
echo "- sport-upstream: $(git rev-parse --short sport-upstream 2>/dev/null || echo "branch not found")"
echo "- upstream/main: $(git rev-parse --short upstream/main)"
echo "- origin/main: $(git rev-parse --short origin/main)"

echo ""
echo "Recommendations:"
echo "================"
if [ -n "$UPSTREAM_COMMITS" ]; then
    echo "→ There are new upstream changes. Consider running: ./scripts/sync-upstream.sh"
elif [ -z "$OUR_COMMITS" ]; then
    echo "→ Your main branch appears to be behind upstream. Consider updating."
else
    echo "→ You're up to date with upstream and have your own changes."
fi

echo ""
echo "============================================="