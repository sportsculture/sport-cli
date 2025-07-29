#!/bin/bash
# Simple three-branch sync workflow for sport-cli
# Based on SYNC_WORKFLOW.md documentation
set -e

echo "============================================="
echo "sport-cli Three-Branch Sync Process"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

if ! git remote | grep -q "^upstream$"; then
    echo -e "${RED}Error: upstream remote not found${NC}"
    echo "Run: git remote add upstream https://github.com/google-gemini/gemini-cli.git"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)

# Step 1: Update sport-upstream
echo -e "\n${GREEN}Step 1: Updating sport-upstream branch${NC}"
git checkout sport-upstream
git fetch upstream
git reset --hard upstream/main
echo "sport-upstream is now at: $(git rev-parse --short HEAD)"

# Try to push (may fail without auth)
if git push origin sport-upstream --force-with-lease 2>/dev/null; then
    echo -e "${GREEN}✓ Pushed sport-upstream to origin${NC}"
else
    echo -e "${YELLOW}⚠ Could not push to origin (auth required)${NC}"
fi

# Step 2: Create sync branch
echo -e "\n${GREEN}Step 2: Creating sync branch${NC}"
git checkout sport-main 2>/dev/null || git checkout main
SYNC_BRANCH="sync/upstream-$(date +%Y%m%d)"

# Check if branch already exists
if git show-ref --verify refs/heads/$SYNC_BRANCH > /dev/null 2>&1; then
    SYNC_BRANCH="sync/upstream-$(date +%Y%m%d-%H%M%S)"
fi

git checkout -b $SYNC_BRANCH
echo "Created branch: $SYNC_BRANCH"

# Step 3: Merge upstream changes
echo -e "\n${GREEN}Step 3: Merging upstream changes${NC}"
if git merge sport-upstream --no-edit; then
    echo -e "${GREEN}✓ Merge completed successfully!${NC}"
    
    # Step 4: Run tests
    echo -e "\n${GREEN}Step 4: Running preflight checks${NC}"
    if npm run preflight; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
    else
        echo -e "${YELLOW}⚠ Some tests failed. Please fix before creating PR.${NC}"
    fi
else
    echo -e "\n${YELLOW}⚠ Merge conflicts detected!${NC}"
    echo -e "\n${YELLOW}Conflict Resolution Guidelines:${NC}"
    echo "• packages/core/src/providers/*: Keep sport-cli version"
    echo "• package.json: Merge both dependencies"
    echo "• README.md: Keep upstream, re-add sport-cli section"
    echo "• Tests: Merge both test suites"
    echo ""
    echo "Files with conflicts:"
    git diff --name-only --diff-filter=U
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Resolve conflicts manually"
    echo "2. git add <resolved-files>"
    echo "3. git merge --continue"
    echo "4. npm run preflight"
fi

echo -e "\n============================================="
echo -e "${GREEN}Summary:${NC}"
echo "• Current branch: $SYNC_BRANCH"
echo "• sport-upstream: $(git rev-parse --short sport-upstream)"
echo "• upstream/main: $(git rev-parse --short upstream/main)"
echo ""
echo -e "${GREEN}To create a PR:${NC}"
echo "git push origin $SYNC_BRANCH"
echo "gh pr create --title \"Sync with upstream $(date +%Y-%m-%d)\" \\"
echo "  --body \"Weekly sync from google-gemini/gemini-cli\""
echo "============================================="