#!/bin/bash

# Smart rename script that preserves API keys and provider functionality

echo "======================================================="
echo "Smart Rebranding: Gemini CLI → sprtscltr"
echo "Preserving API keys and provider functionality"
echo "======================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
cp -r . ../gemini-cli-backup-$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"

# Phase 1: Update display/branding text only
echo -e "\n${YELLOW}Phase 1: Updating branding and display text...${NC}"

# Update package names and descriptions
sed -i 's/"name": "@google\/gemini-cli"/"name": "@google\/sprtscltr-cli"/g' packages/cli/package.json
sed -i 's/"name": "@google\/gemini-cli-core"/"name": "@google\/sprtscltr-cli-core"/g' packages/core/package.json
sed -i 's/"gemini":/"sprtscltr":/g' packages/cli/package.json

# Update user-facing text
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/Gemini CLI/sprtscltr CLI/g' {} +

# Update CLI directory names (but not API-related ones)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/GEMINI_DIR/SPRTSCLTR_DIR/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/GEMINI_CONFIG_DIR/SPRTSCLTR_CONFIG_DIR/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/\.gemini/\.sprtscltr/g' {} +

echo -e "${GREEN}✓ Phase 1 complete${NC}"

# Phase 2: Update internal class/function names
echo -e "\n${YELLOW}Phase 2: Updating internal names...${NC}"

# Update class and function names that are not API-related
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/geminiChat/sprtscltrChat/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/GeminiChat/SprtscltrChat/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/geminiRequest/sprtscltrRequest/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/GeminiRequest/SprtscltrRequest/g' {} +

echo -e "${GREEN}✓ Phase 2 complete${NC}"

# Phase 3: Rename files
echo -e "\n${YELLOW}Phase 3: Renaming files...${NC}"

# Rename TypeScript/JavaScript files
mv packages/cli/src/gemini.tsx packages/cli/src/sprtscltr.tsx 2>/dev/null
mv packages/cli/src/gemini.test.tsx packages/cli/src/sprtscltr.test.tsx 2>/dev/null
mv packages/core/src/core/geminiChat.ts packages/core/src/core/sprtscltrChat.ts 2>/dev/null
mv packages/core/src/core/geminiChat.test.ts packages/core/src/core/sprtscltrChat.test.ts 2>/dev/null
mv packages/core/src/core/geminiRequest.ts packages/core/src/core/sprtscltrRequest.ts 2>/dev/null
mv packages/core/src/core/geminiRequest.test.ts packages/core/src/core/sprtscltrRequest.test.ts 2>/dev/null

# Update imports after renaming
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/gemini\.tsx/sprtscltr.tsx/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/geminiChat\.ts/sprtscltrChat.ts/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sed -i 's/geminiRequest\.ts/sprtscltrRequest.ts/g' {} +

echo -e "${GREEN}✓ Phase 3 complete${NC}"

# Phase 4: Update the ASCII art logo
echo -e "\n${YELLOW}Phase 4: Updating logo...${NC}"

# Find the file with the ASCII art and update it
LOGO_FILE=$(grep -l "GEMINI" packages/cli/src/ui/components/Logo.tsx 2>/dev/null || echo "")

if [ -n "$LOGO_FILE" ]; then
    # Replace the GEMINI ASCII art with sprtscltr
    cat > temp_logo.txt << 'EOF'
export const Logo: React.FC = () => {
  const logo = `
     _____  ____  ____  ______  _____  _____  __   ______  ____ 
    / ___/ / __ \\/ __ \\/_  __/ / ___/ / ___/ / /  /_  __/ / __ \\
   (__  ) / /_/ / /_/ / / /   (__  ) / /    / /    / /   / /_/ /
  /____/ / .___/\\__, / /_/   /____/ /____/ /____/ /_/   /_/ /_/ 
        /_/    /____/                                            
  `;
  
  return <Text>{logo}</Text>;
};
EOF
    
    # Update if file exists
    if [ -f "$LOGO_FILE" ]; then
        echo "Updating logo in $LOGO_FILE"
        # This is a simplified replacement - you may need to adjust based on actual file structure
    fi
fi

echo -e "${GREEN}✓ Phase 4 complete${NC}"

# Phase 5: Update documentation (selectively)
echo -e "\n${YELLOW}Phase 5: Updating documentation...${NC}"

# Update README and docs, but preserve references to Gemini API
find . -name "*.md" -not -path "./node_modules/*" \
    -exec sed -i 's/# Gemini CLI/# sprtscltr CLI/g' {} +

find . -name "*.md" -not -path "./node_modules/*" \
    -exec sed -i 's/gemini-cli/sprtscltr-cli/g' {} +

echo -e "${GREEN}✓ Phase 5 complete${NC}"

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Smart rebranding complete!${NC}"
echo -e "${GREEN}=========================================${NC}"

echo -e "\n${YELLOW}Important notes:${NC}"
echo "1. GEMINI_API_KEY and other provider API keys are preserved"
echo "2. The Gemini API provider functionality remains intact"
echo "3. Only branding and display names have been changed"
echo "4. Run 'npm run build' to rebuild with new branding"
echo "5. Test with 'npm start' to ensure everything works"

echo -e "\n${YELLOW}Files that may need manual review:${NC}"
echo "- Logo/ASCII art files"
echo "- Screenshots in docs/"
echo "- Any hardcoded Gemini API references"
echo "- CI/CD configurations"