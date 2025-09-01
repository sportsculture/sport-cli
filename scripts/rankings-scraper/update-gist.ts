#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Sports Culture LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RankingsData } from './types.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

interface GistUpdateConfig {
  gistId: string;
  token: string;
  filename?: string;
}

class GistUpdater {
  private octokit: Octokit;
  private config: Required<GistUpdateConfig>;

  constructor(config: GistUpdateConfig) {
    this.config = {
      filename: 'openrouter-rankings.json',
      ...config,
    };

    this.octokit = new Octokit({
      auth: this.config.token,
    });
  }

  async update(data: RankingsData): Promise<void> {
    try {
      console.log(`Updating Gist ${this.config.gistId}...`);

      // Validate data
      this.validateData(data);

      // Get current gist to check if it exists
      const currentGist = await this.octokit.gists.get({
        gist_id: this.config.gistId,
      });

      if (!currentGist.data) {
        throw new Error('Gist not found');
      }

      // Update the gist
      const response = await this.octokit.gists.update({
        gist_id: this.config.gistId,
        files: {
          [this.config.filename]: {
            content: JSON.stringify(data, null, 2),
          },
        },
        description: `OpenRouter Rankings - Updated ${data.timestamp}`,
      });

      console.log(`✅ Gist updated successfully!`);
      console.log(`   URL: ${response.data.html_url}`);
      console.log(
        `   Raw: ${response.data.files?.[this.config.filename]?.raw_url}`,
      );
    } catch (error) {
      console.error('❌ Failed to update Gist:', error);
      throw error;
    }
  }

  private validateData(data: RankingsData): void {
    if (!data.version) {
      throw new Error('Missing version in rankings data');
    }

    if (!data.timestamp) {
      throw new Error('Missing timestamp in rankings data');
    }

    if (!data.snapshots || data.snapshots.length === 0) {
      throw new Error('No snapshots in rankings data');
    }

    // Check that we have at least some models
    const totalModels = data.snapshots.reduce(
      (sum, s) => sum + s.models.length,
      0,
    );
    if (totalModels === 0) {
      throw new Error('No models found in any snapshot');
    }

    console.log(
      `✓ Data validation passed: ${data.snapshots.length} snapshots, ${totalModels} total models`,
    );
  }

  async compareWithCurrent(newData: RankingsData): Promise<void> {
    try {
      const gist = await this.octokit.gists.get({
        gist_id: this.config.gistId,
      });

      const currentContent = gist.data.files?.[this.config.filename]?.content;
      if (!currentContent) {
        console.log('No existing data found in Gist');
        return;
      }

      const currentData: RankingsData = JSON.parse(currentContent);

      // Compare timestamps
      const currentTime = new Date(currentData.timestamp);
      const newTime = new Date(newData.timestamp);
      const hoursDiff =
        (newTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

      console.log(`\n📊 Comparison with current data:`);
      console.log(
        `   Last update: ${currentData.timestamp} (${hoursDiff.toFixed(1)} hours ago)`,
      );
      console.log(`   Current snapshots: ${currentData.snapshots.length}`);
      console.log(`   New snapshots: ${newData.snapshots.length}`);

      // Find top model changes
      const currentOverall = currentData.snapshots.find(
        (s) => s.category === 'overall' && s.period === 'day',
      );
      const newOverall = newData.snapshots.find(
        (s) => s.category === 'overall' && s.period === 'day',
      );

      if (currentOverall && newOverall) {
        const currentTop = currentOverall.models[0];
        const newTop = newOverall.models[0];

        if (currentTop?.model_id !== newTop?.model_id) {
          console.log(
            `\n🏆 New #1 model: ${newTop.name} (was ${currentTop.name})`,
          );
        } else {
          console.log(`\n🏆 #1 model unchanged: ${currentTop.name}`);
        }
      }
    } catch (error) {
      console.log('Could not compare with current data:', error);
    }
  }
}

// Main execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  (async () => {
    try {
      // Get configuration from environment variables
      const gistId = process.env.GIST_ID;
      const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

      if (!gistId || !token) {
        console.error('❌ Missing required environment variables:');
        if (!gistId) console.error('   - GIST_ID');
        if (!token) console.error('   - GH_TOKEN or GITHUB_TOKEN');
        process.exit(1);
      }

      // Read rankings data
      const dataPath = process.argv[2] || resolve(__dirname, 'rankings.json');
      console.log(`Reading data from: ${dataPath}`);

      const dataContent = readFileSync(dataPath, 'utf-8');
      const data: RankingsData = JSON.parse(dataContent);

      // Update gist
      const updater = new GistUpdater({
        gistId,
        token,
      });

      await updater.compareWithCurrent(data);
      await updater.update(data);

      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

export { GistUpdater };
