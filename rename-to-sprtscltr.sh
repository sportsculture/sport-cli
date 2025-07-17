#!/bin/bash

# Gemini to sprtscltr renaming script
# This script helps automate the renaming process

echo "========================================="
echo "Gemini CLI → sprtscltr Rebranding Script"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup function
backup_project() {
    echo -e "${YELLOW}Creating backup...${NC}"
    cp -r . ../gemini-cli-backup-$(date +%Y%m%d-%H%M%S)
    echo -e "${GREEN}✓ Backup created${NC}"
}

# Function to show current status
show_status() {
    echo -e "\n${YELLOW}Current gemini references:${NC}"
    echo "Files with 'gemini' in name:"
    find . -name "*gemini*" -type f | grep -v node_modules | grep -v .git | wc -l
    echo ""
    echo "Code references to 'gemini' (case-insensitive):"
    grep -ri "gemini" . --exclude-dir=node_modules --exclude-dir=.git | wc -l
}

# Main menu
show_menu() {
    echo -e "\n${YELLOW}Select an option:${NC}"
    echo "1. Show current status"
    echo "2. Create backup"
    echo "3. Preview changes (dry run)"
    echo "4. Phase 1: Update constants and config"
    echo "5. Phase 2: Update package names"
    echo "6. Phase 3: Rename files"
    echo "7. Phase 4: Update documentation"
    echo "8. Run all phases (careful!)"
    echo "9. Exit"
    echo ""
    read -p "Enter your choice: " choice
}

# Phase 1: Update constants
phase1_constants() {
    echo -e "\n${YELLOW}Phase 1: Updating constants and configuration...${NC}"
    
    # Create a list of replacements
    # NOTE: We keep GEMINI_API_KEY unchanged because it's needed for Google's Gemini API
    cat > replacements.txt << 'EOF'
GEMINI_DIR:SPRTSCLTR_DIR
GEMINI_CONFIG_DIR:SPRTSCLTR_CONFIG_DIR
GEMINI_SANDBOX:SPRTSCLTR_SANDBOX
gemini-cli:sprtscltr-cli
Gemini CLI:sprtscltr CLI
geminiChat:sprtscltrChat
GeminiChat:SprtscltrChat
geminiRequest:sprtscltrRequest
GeminiRequest:SprtscltrRequest
EOF

    if [ "$1" == "preview" ]; then
        echo "Would replace:"
        while IFS=: read -r old new; do
            count=$(grep -r "$old" . --exclude-dir=node_modules --exclude-dir=.git | wc -l)
            echo "  $old → $new ($count occurrences)"
        done < replacements.txt
    else
        while IFS=: read -r old new; do
            echo "Replacing $old with $new..."
            find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \) \
                -not -path "./node_modules/*" -not -path "./.git/*" \
                -exec sed -i "s/$old/$new/g" {} +
        done < replacements.txt
        echo -e "${GREEN}✓ Phase 1 complete${NC}"
    fi
    
    rm -f replacements.txt
}

# Phase 2: Update package names
phase2_packages() {
    echo -e "\n${YELLOW}Phase 2: Updating package names...${NC}"
    
    if [ "$1" == "preview" ]; then
        echo "Would update package.json files:"
        echo "  @google/gemini-cli → @google/sprtscltr-cli"
        echo "  @google/gemini-cli-core → @google/sprtscltr-cli-core"
    else
        # Update package names
        find . -name "package.json" -not -path "./node_modules/*" \
            -exec sed -i 's/@google\/gemini-cli-core/@google\/sprtscltr-cli-core/g' {} +
        find . -name "package.json" -not -path "./node_modules/*" \
            -exec sed -i 's/@google\/gemini-cli/@google\/sprtscltr-cli/g' {} +
        
        # Update bin entry
        sed -i 's/"gemini":/"sprtscltr":/g' packages/cli/package.json
        
        echo -e "${GREEN}✓ Phase 2 complete${NC}"
    fi
}

# Phase 3: Rename files
phase3_files() {
    echo -e "\n${YELLOW}Phase 3: Renaming files...${NC}"
    
    if [ "$1" == "preview" ]; then
        echo "Would rename these files:"
        find . -name "*gemini*" -type f | grep -v node_modules | grep -v .git
    else
        # Rename TypeScript/JavaScript files
        for file in $(find . -name "*gemini*" -type f | grep -v node_modules | grep -v .git); do
            newfile=$(echo "$file" | sed 's/gemini/sprtscltr/g')
            echo "Renaming $file → $newfile"
            mv "$file" "$newfile"
        done
        
        echo -e "${GREEN}✓ Phase 3 complete${NC}"
    fi
}

# Phase 4: Update documentation
phase4_docs() {
    echo -e "\n${YELLOW}Phase 4: Updating documentation...${NC}"
    
    if [ "$1" == "preview" ]; then
        echo "Would update documentation files"
        grep -l -ri "gemini" . --include="*.md" --exclude-dir=node_modules | wc -l
        echo "markdown files contain 'gemini'"
    else
        # Update markdown files
        find . -name "*.md" -not -path "./node_modules/*" \
            -exec sed -i 's/gemini/sprtscltr/g' {} +
        find . -name "*.md" -not -path "./node_modules/*" \
            -exec sed -i 's/Gemini/Sprtscltr/g' {} +
        find . -name "*.md" -not -path "./node_modules/*" \
            -exec sed -i 's/GEMINI/SPRTSCLTR/g' {} +
            
        echo -e "${GREEN}✓ Phase 4 complete${NC}"
    fi
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1) show_status ;;
        2) backup_project ;;
        3) 
            phase1_constants "preview"
            phase2_packages "preview"
            phase3_files "preview"
            phase4_docs "preview"
            ;;
        4) phase1_constants ;;
        5) phase2_packages ;;
        6) phase3_files ;;
        7) phase4_docs ;;
        8) 
            echo -e "${RED}This will rename everything! Are you sure? (yes/no)${NC}"
            read confirm
            if [ "$confirm" = "yes" ]; then
                backup_project
                phase1_constants
                phase2_packages
                phase3_files
                phase4_docs
                echo -e "${GREEN}✓ All phases complete!${NC}"
            fi
            ;;
        9) 
            echo "Exiting..."
            exit 0
            ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
done