/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type Config, isGitRepository, tildeifyPath } from '@sport/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import path from 'path';

interface TipsProps {
  config: Config;
}

interface GitInfo {
  branch?: string;
  status?: string;
  lastCommit?: string;
}

const getGitInfo = (workDir: string): GitInfo => {
  try {
    if (!isGitRepository(workDir)) {
      return {};
    }
    
    const branch = execSync('git branch --show-current', { 
      cwd: workDir, 
      encoding: 'utf-8' 
    }).trim();
    
    const statusOutput = execSync('git status --porcelain', { 
      cwd: workDir, 
      encoding: 'utf-8' 
    });
    
    const modifiedFiles = statusOutput.split('\n').filter(line => line.trim()).length;
    const status = modifiedFiles === 0 ? 'clean' : `${modifiedFiles} file${modifiedFiles > 1 ? 's' : ''} modified`;
    
    const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { 
      cwd: workDir, 
      encoding: 'utf-8' 
    }).trim();
    
    return { branch, status, lastCommit };
  } catch {
    return {};
  }
};

const getFolderStats = (workDir: string): { fileCount: number; totalSize: string } => {
  try {
    let fileCount = 0;
    let totalBytes = 0;
    
    const walkDir = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
              walkDir(fullPath);
            } else if (stat.isFile()) {
              fileCount++;
              totalBytes += stat.size;
            }
          } catch {
            // Ignore permission errors
          }
        }
      } catch {
        // Ignore permission errors
      }
    };
    
    walkDir(workDir);
    
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    
    return { fileCount, totalSize: formatBytes(totalBytes) };
  } catch {
    return { fileCount: 0, totalSize: '0 B' };
  }
};

export const Tips: React.FC<TipsProps> = ({ config }) => {
  const geminiMdFileCount = config.getGeminiMdFileCount();
  const workDir = config.getWorkingDir();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const { gitInfo, folderStats, dateInfo } = useMemo(() => {
    const git = getGitInfo(workDir);
    const stats = getFolderStats(workDir);
    const now = currentTime;
    
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return {
      gitInfo: git,
      folderStats: stats,
      dateInfo: { date: dateStr, time: timeStr }
    };
  }, [workDir, currentTime]);
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={Colors.AccentGreen}>
          ╭─ {dateInfo.date} • {dateInfo.time} ─╮
        </Text>
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        <Text color={Colors.Gray}>
          📁 <Text color={Colors.AccentBlue}>{tildeifyPath(workDir)}</Text>
        </Text>
        <Text color={Colors.Gray}>
          ├─ {folderStats.fileCount} files ({folderStats.totalSize})
        </Text>
        {gitInfo.branch && (
          <>
            <Text color={Colors.Gray}>
              ├─ <Text color={Colors.AccentYellow}>git:</Text> {gitInfo.branch} ({gitInfo.status})
            </Text>
            {gitInfo.lastCommit && (
              <Text color={Colors.Gray}>
                └─ {gitInfo.lastCommit}
              </Text>
            )}
          </>
        )}
      </Box>
      
      <Box flexDirection="column">
        <Text color={Colors.Foreground}>
          <Text color={Colors.AccentPurple}>→</Text> Ask questions, edit files, or run commands
        </Text>
        <Text color={Colors.Foreground}>
          <Text color={Colors.AccentPurple}>→</Text> Be specific for the best results
        </Text>
        {geminiMdFileCount === 0 && (
          <Text color={Colors.Foreground}>
            <Text color={Colors.AccentPurple}>→</Text> Create{' '}
            <Text bold color={Colors.AccentYellow}>
              SPORT.md
            </Text>{' '}
            files to customize your interactions
          </Text>
        )}
        <Text color={Colors.Foreground}>
          <Text color={Colors.AccentPurple}>→</Text> Type{' '}
          <Text bold color={Colors.AccentYellow}>
            /help
          </Text>{' '}
          for commands •{' '}
          <Text bold color={Colors.AccentYellow}>
            /auth
          </Text>{' '}
          to switch providers
        </Text>
      </Box>
    </Box>
  );
};
