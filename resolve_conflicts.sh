#!/bin/bash

# Script to help identify and resolve merge conflicts

echo "Files with merge conflicts:"
echo "=========================="

# Find all files with conflict markers
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec grep -l "<<<<<<" {} \; 2>/dev/null | sort

echo ""
echo "Total files with conflicts: $(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -l "<<<<<<" {} \; 2>/dev/null | wc -l)"