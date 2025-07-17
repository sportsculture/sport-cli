#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statusFile = path.join(__dirname, 'status.json');

function updateStatus(module, field, value) {
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  
  if (module && status.modules[module]) {
    if (field) {
      status.modules[module][field] = value;
    } else {
      status.modules[module] = value;
    }
  } else if (module === 'project') {
    status.project[field] = value;
  }
  
  status.project.lastUpdated = new Date().toISOString();
  
  // Calculate overall completion
  const modules = Object.values(status.modules);
  status.project.completion = Math.round(
    modules.reduce((sum, mod) => sum + mod.completion, 0) / modules.length
  );
  
  // Update health status based on risks and failures
  const hasFailures = modules.some(mod => mod.tests && mod.tests.failed > 0);
  const highRisks = status.risks.filter(r => r.level === 'high').length;
  
  if (hasFailures || highRisks > 0) {
    status.project.health = 'red';
  } else if (status.risks.length > 0) {
    status.project.health = 'yellow';
  } else {
    status.project.health = 'green';
  }
  
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log('✅ Status updated successfully');
}

// CLI interface
const args = process.argv.slice(2);
if (args.length >= 2) {
  const [module, field, value] = args;
  updateStatus(module, field, JSON.parse(value));
} else {
  console.log('Usage: update-status.js <module> <field> <value>');
  console.log('Example: update-status.js core completion 75');
}
