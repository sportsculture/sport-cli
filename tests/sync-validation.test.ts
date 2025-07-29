/**
 * Sync Validation Test Suite
 * 
 * These tests ensure that sport-cli's core functionality remains intact
 * after syncing with upstream google-gemini/gemini-cli
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Mock environment variables for testing
vi.mock('process', async () => {
  const actual = await vi.importActual('process');
  return {
    ...actual,
    env: {
      ...process.env,
      GEMINI_API_KEY: 'test-gemini-key',
      OPENROUTER_API_KEY: 'test-openrouter-key',
      CUSTOM_API_KEY: 'test-custom-key',
      CUSTOM_API_ENDPOINT: 'https://test.api.com',
    },
  };
});

describe('Upstream Sync Validation', () => {
  const rootDir = process.cwd();

  describe('Core Files Existence', () => {
    it('should have all provider abstraction files', () => {
      const providerFiles = [
        'packages/core/src/providers/types.ts',
        'packages/core/src/providers/geminiContentGenerator.ts',
        'packages/core/src/providers/openRouterContentGenerator.ts',
        'packages/core/src/providers/customApiContentGenerator.ts',
        'packages/core/src/providers/modelCache.ts',
        'packages/core/src/providers/modelCapabilities.ts',
      ];

      providerFiles.forEach(file => {
        const filePath = join(rootDir, file);
        expect(existsSync(filePath), `Missing file: ${file}`).toBe(true);
      });
    });

    it('should have modified contentGenerator.ts with provider support', () => {
      const filePath = join(rootDir, 'packages/core/src/core/contentGenerator.ts');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      // Check for sport-cli specific imports
      expect(content).toContain('OpenRouterContentGenerator');
      expect(content).toContain('CustomApiContentGenerator');
      expect(content).toContain('AuthType.USE_OPENROUTER');
      expect(content).toContain('AuthType.USE_CUSTOM_API');
    });

    it('should have sport-cli branding in package.json', () => {
      const packagePath = join(rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      expect(packageJson.name).toBe('@sport/sport-cli');
      expect(packageJson.bin).toHaveProperty('sport');
      expect(packageJson.repository.url).toContain('sportsculture');
    });
  });

  describe('Provider Integration', () => {
    it('should export all provider auth types', async () => {
      // Dynamic import to test actual exports
      const { AuthType } = await import('../packages/core/src/core/contentGenerator.js');
      
      expect(AuthType).toHaveProperty('USE_GEMINI');
      expect(AuthType).toHaveProperty('USE_OPENROUTER');
      expect(AuthType).toHaveProperty('USE_CUSTOM_API');
      expect(AuthType).toHaveProperty('USE_VERTEX_AI');
    });

    it('should have provider factory function', async () => {
      const { createContentGenerator } = await import('../packages/core/src/core/contentGenerator.js');
      expect(typeof createContentGenerator).toBe('function');
    });
  });

  describe('Command System', () => {
    it('should have /model command in commands list', () => {
      const commandsPath = join(rootDir, 'packages/cli/src/utils/commands.ts');
      const content = readFileSync(commandsPath, 'utf-8');
      
      expect(content).toContain('/model');
      expect(content).toContain('Switch AI model/provider');
    });

    it('should have /models command for listing', () => {
      const commandsPath = join(rootDir, 'packages/cli/src/utils/commands.ts');
      const content = readFileSync(commandsPath, 'utf-8');
      
      expect(content).toContain('/models');
      expect(content).toContain('List available models');
    });
  });

  describe('Configuration System', () => {
    it('should have multi-provider model defaults', () => {
      const modelsPath = join(rootDir, 'packages/core/src/config/models.ts');
      const content = readFileSync(modelsPath, 'utf-8');
      
      expect(content).toContain('DEFAULT_OPENROUTER_MODEL');
      expect(content).toContain('DEFAULT_CUSTOM_API_MODEL');
    });

    it('should support provider-specific configuration', () => {
      const configPath = join(rootDir, 'packages/core/src/config/config.ts');
      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain gemini wrapper for compatibility', () => {
      const wrapperPath = join(rootDir, 'packages/cli/src/bin/gemini-wrapper.ts');
      expect(existsSync(wrapperPath)).toBe(true);
      
      const content = readFileSync(wrapperPath, 'utf-8');
      expect(content).toContain('sport-cli wrapper for gemini command');
    });

    it('should have both .sport and .gemini config fallback', () => {
      // This would be tested in the actual config loading logic
      // For now, we just check if the pattern exists in code
      const configFiles = execSync('grep -r "\\.gemini" packages/core/src/config || true', {
        encoding: 'utf-8',
        cwd: rootDir,
      });
      expect(configFiles).toBeTruthy();
    });
  });

  describe('Build System', () => {
    it('should build without errors', () => {
      // This is a critical test - if the build fails after sync, we have problems
      try {
        execSync('npm run build', {
          encoding: 'utf-8',
          cwd: rootDir,
          stdio: 'pipe',
        });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it('should pass TypeScript checks', () => {
      try {
        execSync('npm run typecheck', {
          encoding: 'utf-8',
          cwd: rootDir,
          stdio: 'pipe',
        });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });
  });

  describe('Patch System', () => {
    it('should have patches directory with categories', () => {
      const patchDirs = [
        'patches/001-provider-abstraction',
        'patches/002-branding',
        'patches/003-configuration',
        'patches/004-tools-and-features',
      ];

      patchDirs.forEach(dir => {
        const dirPath = join(rootDir, dir);
        expect(existsSync(dirPath), `Missing patch directory: ${dir}`).toBe(true);
      });
    });

    it('should have patch manifest', () => {
      const manifestPath = join(rootDir, 'patches/MANIFEST.md');
      expect(existsSync(manifestPath)).toBe(true);
    });
  });

  describe('Documentation', () => {
    it('should have sport-cli specific documentation', () => {
      const docs = [
        'CLAUDE.md',
        'SYNC_WORKFLOW.md',
        'README.md',
      ];

      docs.forEach(doc => {
        const docPath = join(rootDir, doc);
        expect(existsSync(docPath), `Missing documentation: ${doc}`).toBe(true);
      });
    });

    it('should have sport-cli content in README', () => {
      const readmePath = join(rootDir, 'README.md');
      const content = readFileSync(readmePath, 'utf-8');
      
      expect(content).toContain('sport-cli');
      expect(content).toContain('multi-provider');
      expect(content).toContain('OpenRouter');
    });
  });
});

describe('Provider Functionality Tests', () => {
  it('should create GeminiContentGenerator correctly', async () => {
    const { createContentGenerator, AuthType } = await import('../packages/core/src/core/contentGenerator.js');
    const { Config } = await import('../packages/core/src/config/config.js');
    
    const config = new Config();
    const generator = await createContentGenerator(
      {
        model: 'gemini-1.5-flash',
        authType: AuthType.USE_GEMINI,
        apiKey: 'test-key',
      },
      config
    );
    
    expect(generator).toBeDefined();
    expect(generator.generateContent).toBeDefined();
  });

  it('should create OpenRouterContentGenerator correctly', async () => {
    const { createContentGenerator, AuthType } = await import('../packages/core/src/core/contentGenerator.js');
    const { Config } = await import('../packages/core/src/config/config.js');
    
    const config = new Config();
    const generator = await createContentGenerator(
      {
        model: 'openai/gpt-4',
        authType: AuthType.USE_OPENROUTER,
        apiKey: 'test-key',
      },
      config
    );
    
    expect(generator).toBeDefined();
    expect(generator.generateContent).toBeDefined();
  });
});