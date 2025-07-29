#!/bin/bash
# Comprehensive sync status checker for sport-cli

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}       sport-cli Sync Infrastructure Status      ${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check file/directory exists
check_exists() {
    local path=$1
    local type=$2
    if [ -e "$path" ]; then
        echo -e "${GREEN}✓${NC} $type exists: $path"
        return 0
    else
        echo -e "${RED}✗${NC} $type missing: $path"
        return 1
    fi
}

# 1. Check Git Configuration
echo -e "\n${CYAN}1. Git Configuration${NC}"
echo -e "${CYAN}-------------------${NC}"

# Check remotes
if git remote | grep -q "^upstream$"; then
    UPSTREAM_URL=$(git remote get-url upstream)
    echo -e "${GREEN}✓${NC} Upstream remote configured: $UPSTREAM_URL"
else
    echo -e "${RED}✗${NC} Upstream remote not configured"
    echo -e "  ${YELLOW}Fix: git remote add upstream https://github.com/google-gemini/gemini-cli.git${NC}"
fi

# Check branches
echo -e "\n${YELLOW}Branches:${NC}"
if git show-ref --verify --quiet refs/heads/sport-upstream; then
    echo -e "${GREEN}✓${NC} sport-upstream branch exists locally"
else
    echo -e "${RED}✗${NC} sport-upstream branch missing"
fi

if git show-ref --verify --quiet refs/remotes/origin/sport-upstream; then
    echo -e "${GREEN}✓${NC} sport-upstream branch exists on origin"
else
    echo -e "${YELLOW}!${NC} sport-upstream not pushed to origin"
fi

# 2. Check Sync Infrastructure
echo -e "\n${CYAN}2. Sync Infrastructure${NC}"
echo -e "${CYAN}---------------------${NC}"

# Check scripts
SCRIPTS=(
    "scripts/check-divergence.sh"
    "scripts/sync-upstream-simple.sh"
    "scripts/manual-sync-helper.sh"
    "scripts/resolve-conflicts-helper.sh"
    "scripts/extract-patches.sh"
    "scripts/update-branding.js"
)

echo -e "\n${YELLOW}Helper Scripts:${NC}"
ALL_SCRIPTS_EXIST=true
for script in "${SCRIPTS[@]}"; do
    if check_exists "$script" "Script"; then
        if [ -x "$script" ]; then
            echo -e "  ${GREEN}✓${NC} Executable"
        else
            echo -e "  ${YELLOW}!${NC} Not executable (run: chmod +x $script)"
        fi
    else
        ALL_SCRIPTS_EXIST=false
    fi
done

# Check patches
echo -e "\n${YELLOW}Patch System:${NC}"
if [ -d "patches" ]; then
    echo -e "${GREEN}✓${NC} Patches directory exists"
    PATCH_COUNT=$(find patches -name "*.patch" -type f 2>/dev/null | wc -l)
    echo -e "  ${CYAN}Total patches: $PATCH_COUNT${NC}"
    
    # Show patch categories
    for dir in patches/*/; do
        if [ -d "$dir" ]; then
            category=$(basename "$dir")
            count=$(find "$dir" -name "*.patch" -type f 2>/dev/null | wc -l)
            echo -e "  ${category}: $count patches"
        fi
    done
else
    echo -e "${RED}✗${NC} Patches directory missing"
fi

# 3. Check Documentation
echo -e "\n${CYAN}3. Documentation${NC}"
echo -e "${CYAN}---------------${NC}"

DOCS=(
    "SYNC_WORKFLOW.md"
    "SYNC_GUIDE.md"
    "INJECTION_POINTS.md"
    "UPSTREAM_CONTRIBUTION.md"
    "patches/MANIFEST.md"
)

for doc in "${DOCS[@]}"; do
    check_exists "$doc" "Documentation"
done

# 4. Check GitHub Actions
echo -e "\n${CYAN}4. GitHub Actions${NC}"
echo -e "${CYAN}----------------${NC}"

check_exists ".github/workflows/upstream-sync.yml" "Workflow"

# 5. Check New Architecture
echo -e "\n${CYAN}5. Enhanced Architecture${NC}"
echo -e "${CYAN}-----------------------${NC}"

echo -e "\n${YELLOW}Provider System:${NC}"
check_exists "packages/core/src/providers/registry.ts" "Provider Registry"
check_exists "packages/core/src/providers/factory.ts" "Provider Factory"

echo -e "\n${YELLOW}Configuration System:${NC}"
check_exists "packages/core/src/config/branding.ts" "Branding Config"
check_exists "packages/core/src/config/features.ts" "Feature Flags"

# 6. Check Current Sync Status
echo -e "\n${CYAN}6. Current Sync Status${NC}"
echo -e "${CYAN}---------------------${NC}"

if command_exists git && git remote | grep -q "^upstream$"; then
    # Fetch latest
    echo "Fetching latest from upstream..."
    git fetch upstream >/dev/null 2>&1
    
    # Count commits
    BEHIND_COUNT=$(git rev-list --count HEAD..upstream/main 2>/dev/null || echo "?")
    AHEAD_COUNT=$(git rev-list --count upstream/main..HEAD 2>/dev/null || echo "?")
    
    echo -e "\n${YELLOW}Divergence from upstream:${NC}"
    echo -e "  Behind by: ${RED}$BEHIND_COUNT${NC} commits"
    echo -e "  Ahead by: ${GREEN}$AHEAD_COUNT${NC} commits"
    
    if [ "$BEHIND_COUNT" != "?" ] && [ "$BEHIND_COUNT" -gt 50 ]; then
        echo -e "  ${YELLOW}⚠ High divergence - consider syncing soon${NC}"
    fi
fi

# 7. Test Validation
echo -e "\n${CYAN}7. Validation Tests${NC}"
echo -e "${CYAN}------------------${NC}"

if check_exists "tests/sync-validation.test.ts" "Sync validation tests"; then
    echo -e "  ${CYAN}Run with: npm test tests/sync-validation.test.ts${NC}"
fi

# 8. Quick Actions
echo -e "\n${CYAN}8. Quick Actions${NC}"
echo -e "${CYAN}---------------${NC}"

echo -e "\n${YELLOW}Common Commands:${NC}"
echo -e "  Check divergence:  ${CYAN}./scripts/check-divergence.sh${NC}"
echo -e "  Manual sync:       ${CYAN}./scripts/manual-sync-helper.sh${NC}"
echo -e "  Extract patches:   ${CYAN}./scripts/extract-patches.sh${NC}"
echo -e "  Run sync tests:    ${CYAN}npm test tests/sync-validation.test.ts${NC}"

# Summary
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}                    Summary                      ${NC}"
echo -e "${BLUE}================================================${NC}"

READY=true

if ! git remote | grep -q "^upstream$"; then
    echo -e "${RED}✗ Upstream remote not configured${NC}"
    READY=false
fi

if ! git show-ref --verify --quiet refs/heads/sport-upstream; then
    echo -e "${RED}✗ sport-upstream branch missing${NC}"
    READY=false
fi

if [ ! -d "patches" ]; then
    echo -e "${RED}✗ Patches directory missing${NC}"
    READY=false
fi

if [ "$ALL_SCRIPTS_EXIST" = false ]; then
    echo -e "${RED}✗ Some sync scripts missing${NC}"
    READY=false
fi

if [ "$READY" = true ]; then
    echo -e "${GREEN}✓ Sync infrastructure is ready!${NC}"
    echo -e "\nNext steps:"
    echo -e "1. Push sport-upstream branch: ${CYAN}git push -u origin sport-upstream${NC}"
    echo -e "2. Configure GitHub branch protection"
    echo -e "3. Test sync process: ${CYAN}./scripts/manual-sync-helper.sh${NC}"
else
    echo -e "${YELLOW}⚠ Sync infrastructure needs setup${NC}"
    echo -e "\nRun setup commands above to fix issues."
fi

echo -e "\n${BLUE}================================================${NC}"