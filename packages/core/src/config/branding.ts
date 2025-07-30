/**
 * Configuration-driven branding system for sport-cli
 *
 * This centralized configuration makes it easy to maintain branding
 * across the codebase and minimize merge conflicts with upstream.
 */

export interface BrandingConfig {
  /** CLI command name (e.g., 'sport' or 'gemini') */
  cliName: string;
  /** NPM package name */
  packageName: string;
  /** Display name for UI and documentation */
  displayName: string;
  /** Short description */
  description: string;
  /** Configuration directory name */
  configDir: string;
  /** Fallback config directory for backward compatibility */
  fallbackConfigDir?: string;
  /** GitHub repository URL */
  repositoryUrl: string;
  /** Documentation URL */
  docsUrl: string;
  /** Copyright holder */
  copyright: string;
  /** Whether this is a fork */
  isFork: boolean;
  /** Upstream repository info if this is a fork */
  upstream?: {
    name: string;
    url: string;
  };
}

/**
 * Get branding configuration based on environment
 * This allows easy switching between sport-cli and gemini-cli branding
 */
export function getBrandingConfig(): BrandingConfig {
  // Allow environment variable override for testing upstream compatibility
  const brandingMode = process.env.BRANDING_MODE || 'sport';

  if (brandingMode === 'gemini') {
    // Original gemini-cli branding (useful for testing upstream compatibility)
    return {
      cliName: 'gemini',
      packageName: '@google/gemini-cli',
      displayName: 'Gemini CLI',
      description: 'A command-line AI workflow tool',
      configDir: '.gemini',
      repositoryUrl: 'https://github.com/google-gemini/gemini-cli',
      docsUrl: 'https://github.com/google-gemini/gemini-cli/docs',
      copyright: 'Google LLC',
      isFork: false,
    };
  }

  // Default sport-cli branding
  return {
    cliName: 'sport',
    packageName: '@sport/sport-cli',
    displayName: 'Sport CLI',
    description: 'Multi-provider command-line AI workflow tool',
    configDir: '.sport',
    fallbackConfigDir: '.gemini',
    repositoryUrl: 'https://github.com/sportsculture/gemini-cli',
    docsUrl: 'https://github.com/sportsculture/gemini-cli/docs',
    copyright: 'SportsCulture LLC',
    isFork: true,
    upstream: {
      name: 'google-gemini/gemini-cli',
      url: 'https://github.com/google-gemini/gemini-cli',
    },
  };
}

// Export singleton instance for convenient access
export const BRANDING = getBrandingConfig();

/**
 * Helper function to get config directory with fallback support
 */
export function getConfigDirectory(): string {
  const config = getBrandingConfig();
  return config.configDir;
}

/**
 * Get all possible config directories (including fallbacks)
 */
export function getAllConfigDirectories(): string[] {
  const config = getBrandingConfig();
  const dirs = [config.configDir];

  if (config.fallbackConfigDir) {
    dirs.push(config.fallbackConfigDir);
  }

  return dirs;
}

/**
 * Format display text with branding
 */
export function formatBrandedText(template: string): string {
  const config = getBrandingConfig();
  return template
    .replace(/\{cliName\}/g, config.cliName)
    .replace(/\{displayName\}/g, config.displayName)
    .replace(/\{description\}/g, config.description);
}

/**
 * Get ASCII art for the CLI
 */
export function getAsciiArt(): string {
  const config = getBrandingConfig();

  if (config.cliName === 'sport') {
    return `
╔═╗╔═╗╔═╗╦═╗╔╦╗   ╔═╗╦  ╦
╚═╗╠═╝║ ║╠╦╝ ║────║  ║  ║
╚═╝╩  ╚═╝╩╚═ ╩    ╚═╝╩═╝╩
Multi-Provider AI CLI`;
  }

  // Default/original ASCII art
  return `
╔═╗┌─┐┌┬┐┬┌┐┌┬  ╔═╗╦  ╦
║ ╦├┤ │││││││├─ ║  ║  ║
╚═╝└─┘┴ ┴┴┘└┘┴  ╚═╝╩═╝╩`;
}
