#!/usr/bin/env node
/**
 * Script to update branding across the codebase using the centralized branding configuration
 * This makes it easy to switch between sport-cli and gemini-cli branding
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Define branding configurations
const SPORT_BRANDING = {
  cliName: 'sport',
  packageName: '@sport/sport-cli',
  displayName: 'Sport CLI',
  description: 'Multi-provider command-line AI workflow tool',
  binName: 'sport',
  configDir: '.sport',
  repository: 'https://github.com/sportsculture/gemini-cli.git',
};

const GEMINI_BRANDING = {
  cliName: 'gemini',
  packageName: '@google/gemini-cli',
  displayName: 'Gemini CLI',
  description: 'A command-line AI workflow tool',
  binName: 'gemini',
  configDir: '.gemini',
  repository: 'https://github.com/google-gemini/gemini-cli.git',
};

// Get branding mode from command line or environment
const brandingMode = process.argv[2] || process.env.BRANDING_MODE || 'sport';
const branding = brandingMode === 'gemini' ? GEMINI_BRANDING : SPORT_BRANDING;

console.log(`Updating branding to: ${branding.displayName}`);

// Update root package.json
function updateRootPackageJson() {
  const packagePath = join(rootDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  
  packageJson.name = branding.packageName;
  packageJson.bin = { [branding.binName]: 'bundle/gemini.js' };
  packageJson.repository.url = `git+${branding.repository}`;
  
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✓ Updated root package.json');
}

// Update workspace package.json files
function updateWorkspacePackages() {
  const workspaces = ['packages/cli', 'packages/core'];
  
  workspaces.forEach(workspace => {
    const packagePath = join(rootDir, workspace, 'package.json');
    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      // Update package name to match pattern
      if (packageJson.name.includes('gemini-cli')) {
        packageJson.name = packageJson.name.replace('@google/gemini-cli', branding.packageName);
      }
      
      // Update dependencies
      if (packageJson.dependencies) {
        Object.keys(packageJson.dependencies).forEach(dep => {
          if (dep.includes('@google/gemini-cli')) {
            const newDep = dep.replace('@google/gemini-cli', branding.packageName);
            packageJson.dependencies[newDep] = packageJson.dependencies[dep];
            if (newDep !== dep) delete packageJson.dependencies[dep];
          }
        });
      }
      
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✓ Updated ${workspace}/package.json`);
    }
  });
}

// Update CLI entry point to use branding config
function updateCliMain() {
  const cliMainPath = join(rootDir, 'packages/cli/src/cliMain.tsx');
  if (existsSync(cliMainPath)) {
    let content = readFileSync(cliMainPath, 'utf-8');
    
    // Add import if not present
    if (!content.includes("import { BRANDING }")) {
      const importStatement = "import { BRANDING } from '@sport/sport-cli-core/config/branding.js';\n";
      content = importStatement + content;
    }
    
    // Update hardcoded strings to use BRANDING
    content = content.replace(/configDir: ['"]\.gemini['"]/, 'configDir: BRANDING.configDir');
    content = content.replace(/configDir: ['"]\.sport['"]/, 'configDir: BRANDING.configDir');
    
    writeFileSync(cliMainPath, content);
    console.log('✓ Updated CLI main to use branding config');
  }
}

// Create branding report
function createBrandingReport() {
  const report = `# Branding Update Report

## Current Branding: ${branding.displayName}

### Configuration
- CLI Name: ${branding.cliName}
- Package Name: ${branding.packageName}
- Binary Name: ${branding.binName}
- Config Directory: ${branding.configDir}

### Files Updated
- package.json (root)
- packages/cli/package.json
- packages/core/package.json
- packages/cli/src/cliMain.tsx

### Usage
To switch branding, run:
\`\`\`bash
node scripts/update-branding.js gemini  # Switch to Gemini branding
node scripts/update-branding.js sport   # Switch to Sport branding
\`\`\`

### Notes
- The branding configuration is centralized in packages/core/src/config/branding.ts
- This approach minimizes merge conflicts when syncing with upstream
- Environment variable BRANDING_MODE can also control branding at runtime
`;

  writeFileSync(join(rootDir, 'BRANDING_REPORT.md'), report);
  console.log('✓ Created branding report');
}

// Main execution
try {
  updateRootPackageJson();
  updateWorkspacePackages();
  updateCliMain();
  createBrandingReport();
  
  console.log('\n✅ Branding update complete!');
  console.log(`The project is now branded as: ${branding.displayName}`);
} catch (error) {
  console.error('❌ Error updating branding:', error);
  process.exit(1);
}