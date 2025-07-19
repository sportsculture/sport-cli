#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statusFile = path.join(__dirname, 'status.json');
const tasksFile = path.join(
  __dirname,
  '..',
  '.taskmaster',
  'tasks',
  'tasks.json',
);

function syncWithTaskMaster() {
  if (!fs.existsSync(tasksFile)) {
    console.log('Task Master not found. Skipping sync.');
    return;
  }

  try {
    const taskData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    // Handle both old and new Task Master formats
    const tasks = taskData.tasks || taskData.master?.tasks || [];
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));

    // Map task status to module progress
    const moduleProgress = {};
    tasks.forEach((task) => {
      const module = task.title.toLowerCase().includes('ui')
        ? 'ui'
        : task.title.toLowerCase().includes('api')
          ? 'api'
          : 'core';

      if (!moduleProgress[module]) {
        moduleProgress[module] = { total: 0, completed: 0 };
      }

      moduleProgress[module].total++;
      if (task.status === 'done') {
        moduleProgress[module].completed++;
      }
    });

    // Update module completion percentages
    Object.entries(moduleProgress).forEach(([module, progress]) => {
      if (status.modules[module]) {
        const completion = Math.round(
          (progress.completed / progress.total) * 100,
        );
        status.modules[module].completion = completion;
        status.modules[module].status =
          completion === 100
            ? 'complete'
            : completion > 0
              ? 'in-progress'
              : 'pending';
      }
    });

    // Save updated status
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    console.log('✅ Synced with Task Master successfully');
  } catch (error) {
    console.error('Error syncing with Task Master:', error.message);
  }
}

syncWithTaskMaster();
