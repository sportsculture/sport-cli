#!/bin/bash
# Manual sync helper for sport-cli upstream synchronization

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}sport-cli Manual Sync Helper${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to pause and wait for user
pause() {
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# Ensure we're in the git root
cd "$(git rev-parse --show-toplevel)"

# Check for required tools
if ! command_exists gh; then
    echo -e "${YELLOW}Warning: GitHub CLI (gh) not found. PR creation will be manual.${NC}"
fi

# Step 1: Check current status
echo -e "\n${GREEN}Step 1: Checking current status...${NC}"
git status --short
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Step 2: Fetch latest from upstream
echo -e "\n${GREEN}Step 2: Fetching latest from upstream...${NC}"
git fetch upstream
git fetch origin

# Step 3: Show divergence
echo -e "\n${GREEN}Step 3: Checking divergence...${NC}"
./scripts/check-divergence.sh || true
pause

# Step 4: Update sport-upstream
echo -e "\n${GREEN}Step 4: Updating sport-upstream branch...${NC}"
git checkout sport-upstream
git reset --hard upstream/main
echo -e "${YELLOW}Ready to push sport-upstream. This will force-push to origin.${NC}"
echo -e "Command: git push origin sport-upstream --force-with-lease"
read -p "Execute? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin sport-upstream --force-with-lease || echo -e "${YELLOW}Push failed. You may need to set up authentication.${NC}"
fi

# Step 5: Create sync branch
echo -e "\n${GREEN}Step 5: Creating sync branch...${NC}"
git checkout main
SYNC_DATE=$(date +%Y%m%d-%H%M%S)
SYNC_BRANCH="sync/upstream-$SYNC_DATE"
git checkout -b "$SYNC_BRANCH"
echo "Created branch: $SYNC_BRANCH"

# Step 6: Attempt merge
echo -e "\n${GREEN}Step 6: Attempting merge...${NC}"
echo -e "${YELLOW}This will attempt to merge upstream changes. Conflicts may occur.${NC}"
pause

if git merge sport-upstream --no-edit; then
    echo -e "${GREEN}✓ Merge completed successfully!${NC}"
    MERGE_SUCCESS=true
else
    echo -e "${YELLOW}⚠ Merge has conflicts. Opening conflict resolution helper...${NC}"
    MERGE_SUCCESS=false
    
    # Show conflicted files
    echo -e "\n${RED}Conflicted files:${NC}"
    git diff --name-only --diff-filter=U
    
    echo -e "\n${YELLOW}Would you like to run the conflict resolution helper? (y/n)${NC}"
    read -p "" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/resolve-conflicts-helper.sh || true
    fi
fi

# Step 7: Apply patches (if merge was successful)
if [ "$MERGE_SUCCESS" = true ]; then
    echo -e "\n${GREEN}Step 7: Applying sport-cli patches...${NC}"
    PATCH_COUNT=0
    PATCH_FAILED=0
    
    for patch in patches/*/*.patch; do
        if [ -f "$patch" ]; then
            echo -n "Applying $(basename "$patch")... "
            if git apply "$patch" 2>/dev/null; then
                echo -e "${GREEN}✓${NC}"
                ((PATCH_COUNT++))
            else
                echo -e "${RED}✗${NC}"
                ((PATCH_FAILED++))
            fi
        fi
    done
    
    echo -e "Applied $PATCH_COUNT patches successfully, $PATCH_FAILED failed."
fi

# Step 8: Run tests
echo -e "\n${GREEN}Step 8: Running tests...${NC}"
echo -e "${YELLOW}Would you like to run the test suite? (y/n)${NC}"
read -p "" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run preflight || echo -e "${YELLOW}Tests failed. Please fix before creating PR.${NC}"
fi

# Step 9: Create PR
echo -e "\n${GREEN}Step 9: Creating Pull Request...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}You have uncommitted changes from the sync. Committing them...${NC}"
    git add -A
    git commit -m "Sync with upstream google-gemini/gemini-cli

- Merged latest changes from upstream
- Applied sport-cli patches
- Resolved conflicts (if any)"
fi

git push origin "$SYNC_BRANCH"

if command_exists gh; then
    echo -e "\n${YELLOW}Would you like to create a PR using GitHub CLI? (y/n)${NC}"
    read -p "" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gh pr create \
            --title "🔄 Sync with upstream google-gemini/gemini-cli" \
            --body "## Manual Upstream Sync

This PR syncs sport-cli with the latest changes from upstream.

### Checklist
- [ ] All conflicts resolved
- [ ] Tests passing
- [ ] sport-cli features tested
- [ ] Documentation updated if needed

### Notes
Add any specific notes about the sync here...

---
*Created using the manual sync helper script*" \
            --label "upstream-sync" \
            --draft
    fi
else
    echo -e "\n${YELLOW}Push complete! Create a PR manually at:${NC}"
    echo "https://github.com/sportsculture/gemini-cli/compare/main...$SYNC_BRANCH"
fi

echo -e "\n${GREEN}Sync process complete!${NC}"
echo -e "${YELLOW}Don't forget to:${NC}"
echo "1. Review all changes carefully"
echo "2. Test sport-cli specific features"
echo "3. Update documentation if needed"
echo "4. Request review before merging"