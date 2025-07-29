#!/bin/bash
# Helper script for resolving common merge conflicts during upstream sync
set -e

echo "============================================="
echo "sport-cli Conflict Resolution Helper"
echo "============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're in a merge
if ! git status | grep -q "You have unmerged paths"; then
    echo -e "${YELLOW}No merge in progress. This script helps during merge conflicts.${NC}"
    exit 0
fi

echo -e "\n${BLUE}Analyzing conflicts...${NC}\n"

# Get list of conflicted files
CONFLICTS=$(git diff --name-only --diff-filter=U)

# Categorize conflicts
PROVIDER_CONFLICTS=""
PACKAGE_JSON_CONFLICT=""
README_CONFLICT=""
TEST_CONFLICTS=""
OTHER_CONFLICTS=""

for file in $CONFLICTS; do
    if [[ $file == *"provider"* ]] || [[ $file == *"openrouter"* ]] || [[ $file == *"customApi"* ]]; then
        PROVIDER_CONFLICTS="$PROVIDER_CONFLICTS$file\n"
    elif [[ $file == "package.json" ]] || [[ $file == "packages/*/package.json" ]]; then
        PACKAGE_JSON_CONFLICT="$PACKAGE_JSON_CONFLICT$file\n"
    elif [[ $file == "README.md" ]]; then
        README_CONFLICT="$file"
    elif [[ $file == *".test."* ]] || [[ $file == *".spec."* ]]; then
        TEST_CONFLICTS="$TEST_CONFLICTS$file\n"
    else
        OTHER_CONFLICTS="$OTHER_CONFLICTS$file\n"
    fi
done

# Show categorized conflicts
if [ -n "$PROVIDER_CONFLICTS" ]; then
    echo -e "${RED}Provider/Multi-model Conflicts:${NC} (Keep sport-cli version)"
    echo -e "$PROVIDER_CONFLICTS"
fi

if [ -n "$PACKAGE_JSON_CONFLICT" ]; then
    echo -e "${YELLOW}Package.json Conflicts:${NC} (Merge both dependencies)"
    echo -e "$PACKAGE_JSON_CONFLICT"
fi

if [ -n "$README_CONFLICT" ]; then
    echo -e "${YELLOW}README.md Conflict:${NC} (Take upstream, re-add sport-cli section)"
    echo "$README_CONFLICT"
fi

if [ -n "$TEST_CONFLICTS" ]; then
    echo -e "${BLUE}Test Conflicts:${NC} (Merge both test suites)"
    echo -e "$TEST_CONFLICTS"
fi

if [ -n "$OTHER_CONFLICTS" ]; then
    echo -e "${YELLOW}Other Conflicts:${NC} (Review case by case)"
    echo -e "$OTHER_CONFLICTS"
fi

# Offer automated resolution for some conflicts
echo -e "\n${GREEN}Automated Resolution Options:${NC}"
echo "============================================="

# Provider conflicts - keep ours
if [ -n "$PROVIDER_CONFLICTS" ]; then
    echo -e "\n${BLUE}1. Auto-resolve provider conflicts (keep sport-cli)?${NC}"
    read -p "   Apply? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for file in $(echo -e "$PROVIDER_CONFLICTS" | grep -v "^$"); do
            echo "   Keeping our version of: $file"
            git checkout --ours "$file"
            git add "$file"
        done
        echo -e "   ${GREEN}✓ Provider conflicts resolved${NC}"
    fi
fi

# README conflict
if [ -n "$README_CONFLICT" ]; then
    echo -e "\n${BLUE}2. Handle README.md conflict?${NC}"
    echo "   This will take upstream version and re-add sport-cli section"
    read -p "   Apply? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Take upstream version first
        git checkout --theirs README.md
        
        # Check if sport-cli section exists in our version
        if git show HEAD:README.md | grep -q "sport-cli"; then
            echo "   Re-adding sport-cli section..."
            # This is a simplified approach - in reality, you'd want to
            # extract and re-add the sport-cli specific sections
            echo -e "   ${YELLOW}⚠ Manual edit needed to re-add sport-cli content${NC}"
            echo "   Opening README.md in default editor..."
            ${EDITOR:-nano} README.md
        fi
        
        git add README.md
        echo -e "   ${GREEN}✓ README.md handled${NC}"
    fi
fi

# Show remaining conflicts
echo -e "\n${YELLOW}Remaining Conflicts:${NC}"
REMAINING=$(git diff --name-only --diff-filter=U)
if [ -z "$REMAINING" ]; then
    echo -e "${GREEN}✓ All conflicts resolved!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git diff --cached"
    echo "2. Complete merge: git merge --continue"
    echo "3. Run tests: npm run preflight"
else
    echo "$REMAINING"
    echo ""
    echo -e "${YELLOW}Manual resolution required for remaining files.${NC}"
    echo ""
    echo "For each file:"
    echo "• Edit to resolve conflicts"
    echo "• git add <file>"
    echo "• When done: git merge --continue"
fi

echo ""
echo "============================================="
echo -e "${BLUE}Conflict Markers Reference:${NC}"
echo "<<<<<<< HEAD         (your version)"
echo "======="
echo ">>>>>>> sport-upstream  (upstream version)"
echo "============================================="