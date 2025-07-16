#!/bin/bash

# GridPlay Project GPS - Status Visualization Setup Script
# Creates a comprehensive project status visualization system

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-$(basename "$(pwd)")}"
GPS_DIR=".gps"
VISUALIZATION_DIR="${GPS_DIR}/visualizations"
STATUS_FILE="${GPS_DIR}/status.json"
DASHBOARD_FILE="${GPS_DIR}/dashboard.html"

echo -e "${BLUE}🚀 Setting up GridPlay Project GPS for ${PROJECT_NAME}${NC}"

# Create GPS directory structure
echo -e "${YELLOW}📁 Creating GPS directory structure...${NC}"
mkdir -p "${VISUALIZATION_DIR}"
mkdir -p "${GPS_DIR}/reports"
mkdir -p "${GPS_DIR}/metrics"

# Initialize status tracking file
echo -e "${YELLOW}📊 Initializing status tracking...${NC}"
cat > "${STATUS_FILE}" << 'EOF'
{
  "project": {
    "name": "PROJECT_NAME_PLACEHOLDER",
    "version": "0.1.0",
    "lastUpdated": "TIMESTAMP_PLACEHOLDER",
    "health": "green",
    "completion": 0
  },
  "modules": {
    "core": {
      "status": "in-progress",
      "completion": 45,
      "tests": { "passed": 12, "failed": 0, "total": 25 }
    },
    "ui": {
      "status": "pending",
      "completion": 0,
      "tests": { "passed": 0, "failed": 0, "total": 0 }
    },
    "api": {
      "status": "complete",
      "completion": 100,
      "tests": { "passed": 35, "failed": 0, "total": 35 }
    }
  },
  "metrics": {
    "codeQuality": {
      "coverage": 78,
      "complexity": "moderate",
      "technicalDebt": "2.5 days"
    },
    "performance": {
      "buildTime": "45s",
      "bundleSize": "2.3MB",
      "lighthouse": 92
    }
  },
  "risks": [
    {
      "level": "medium",
      "description": "Dependencies need updating",
      "mitigation": "Schedule dependency update sprint"
    }
  ]
}
EOF

# Replace placeholders
sed -i "s/PROJECT_NAME_PLACEHOLDER/${PROJECT_NAME}/g" "${STATUS_FILE}"
sed -i "s/TIMESTAMP_PLACEHOLDER/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" "${STATUS_FILE}"

# Create status update script
echo -e "${YELLOW}🔧 Creating status update utility...${NC}"
cat > "${GPS_DIR}/update-status.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
EOF
chmod +x "${GPS_DIR}/update-status.js"

# Create visualization dashboard
echo -e "${YELLOW}📈 Creating visualization dashboard...${NC}"
cat > "${DASHBOARD_FILE}" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GridPlay Project GPS Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f7fa;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 2.5em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .card h2 {
      margin-top: 0;
      color: #4a5568;
      font-size: 1.3em;
    }
    .health-indicator {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin-left: 10px;
      animation: pulse 2s infinite;
    }
    .health-green { background: #48bb78; }
    .health-yellow { background: #f6e05e; }
    .health-red { background: #f56565; }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    .progress-bar {
      background: #e2e8f0;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      background: linear-gradient(90deg, #4299e1 0%, #667eea 100%);
      height: 100%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.8em;
      font-weight: bold;
    }
    .module-grid {
      display: grid;
      gap: 15px;
    }
    .module-item {
      background: #f7fafc;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      text-align: center;
    }
    .metric-item {
      padding: 15px;
      background: #f7fafc;
      border-radius: 8px;
    }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      color: #718096;
      font-size: 0.9em;
      margin-top: 5px;
    }
    .risk-item {
      background: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
    }
    .risk-level {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 0.8em;
    }
    .timestamp {
      color: #a0aec0;
      font-size: 0.9em;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span id="projectName">Project</span> GPS Dashboard
        <span class="health-indicator" id="healthIndicator"></span>
      </h1>
      <div class="progress-bar" style="margin-top: 20px;">
        <div class="progress-fill" id="overallProgress">0%</div>
      </div>
      <div class="timestamp" id="lastUpdated">Last updated: Never</div>
    </div>
    
    <div class="grid">
      <div class="card">
        <h2>📦 Module Status</h2>
        <div class="module-grid" id="moduleGrid"></div>
      </div>
      
      <div class="card">
        <h2>📊 Metrics</h2>
        <div class="metrics-grid" id="metricsGrid"></div>
      </div>
      
      <div class="card">
        <h2>🧪 Test Coverage</h2>
        <canvas id="testChart"></canvas>
      </div>
      
      <div class="card">
        <h2>⚠️ Risk Assessment</h2>
        <div id="riskList"></div>
      </div>
    </div>
    
    <div class="card">
      <h2>📈 Progress Timeline</h2>
      <canvas id="timelineChart"></canvas>
    </div>
  </div>
  
  <script>
    async function loadStatus() {
      try {
        const response = await fetch('status.json');
        const data = await response.json();
        updateDashboard(data);
      } catch (error) {
        console.error('Error loading status:', error);
      }
    }
    
    function updateDashboard(data) {
      // Update header
      document.getElementById('projectName').textContent = data.project.name;
      document.getElementById('overallProgress').style.width = data.project.completion + '%';
      document.getElementById('overallProgress').textContent = data.project.completion + '%';
      document.getElementById('healthIndicator').className = 'health-indicator health-' + data.project.health;
      document.getElementById('lastUpdated').textContent = 'Last updated: ' + new Date(data.project.lastUpdated).toLocaleString();
      
      // Update modules
      const moduleGrid = document.getElementById('moduleGrid');
      moduleGrid.innerHTML = '';
      Object.entries(data.modules).forEach(([name, module]) => {
        const moduleEl = document.createElement('div');
        moduleEl.className = 'module-item';
        moduleEl.innerHTML = `
          <strong>${name}</strong> - ${module.status}
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${module.completion}%">${module.completion}%</div>
          </div>
          ${module.tests ? `<small>Tests: ${module.tests.passed}/${module.tests.total}</small>` : ''}
        `;
        moduleGrid.appendChild(moduleEl);
      });
      
      // Update metrics
      const metricsGrid = document.getElementById('metricsGrid');
      metricsGrid.innerHTML = '';
      const metrics = [
        { label: 'Coverage', value: data.metrics.codeQuality.coverage + '%' },
        { label: 'Build Time', value: data.metrics.performance.buildTime },
        { label: 'Bundle Size', value: data.metrics.performance.bundleSize }
      ];
      metrics.forEach(metric => {
        const metricEl = document.createElement('div');
        metricEl.className = 'metric-item';
        metricEl.innerHTML = `
          <div class="metric-value">${metric.value}</div>
          <div class="metric-label">${metric.label}</div>
        `;
        metricsGrid.appendChild(metricEl);
      });
      
      // Update test chart
      const testData = Object.entries(data.modules)
        .filter(([_, m]) => m.tests)
        .map(([name, m]) => ({
          name,
          passed: m.tests.passed,
          failed: m.tests.failed,
          pending: m.tests.total - m.tests.passed - m.tests.failed
        }));
      
      updateTestChart(testData);
      
      // Update risks
      const riskList = document.getElementById('riskList');
      riskList.innerHTML = '';
      data.risks.forEach(risk => {
        const riskEl = document.createElement('div');
        riskEl.className = 'risk-item';
        riskEl.innerHTML = `
          <div class="risk-level">${risk.level} Risk</div>
          <div>${risk.description}</div>
          <small>Mitigation: ${risk.mitigation}</small>
        `;
        riskList.appendChild(riskEl);
      });
      
      // Update timeline
      updateTimelineChart(data.modules);
    }
    
    let testChart;
    function updateTestChart(data) {
      const ctx = document.getElementById('testChart').getContext('2d');
      
      if (testChart) {
        testChart.destroy();
      }
      
      testChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(d => d.name),
          datasets: [
            {
              label: 'Passed',
              data: data.map(d => d.passed),
              backgroundColor: '#48bb78'
            },
            {
              label: 'Failed',
              data: data.map(d => d.failed),
              backgroundColor: '#f56565'
            },
            {
              label: 'Pending',
              data: data.map(d => d.pending),
              backgroundColor: '#cbd5e0'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            x: { stacked: true },
            y: { stacked: true }
          }
        }
      });
    }
    
    let timelineChart;
    function updateTimelineChart(modules) {
      const ctx = document.getElementById('timelineChart').getContext('2d');
      
      if (timelineChart) {
        timelineChart.destroy();
      }
      
      timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Object.keys(modules),
          datasets: [{
            label: 'Completion %',
            data: Object.values(modules).map(m => m.completion),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }
    
    // Load initial data
    loadStatus();
    
    // Auto-refresh every 30 seconds
    setInterval(loadStatus, 30000);
  </script>
</body>
</html>
EOF

# Create task integration script
echo -e "${YELLOW}🔗 Creating Task Master integration...${NC}"
cat > "${GPS_DIR}/sync-with-taskmaster.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const statusFile = path.join(__dirname, 'status.json');
const tasksFile = path.join(__dirname, '..', '.taskmaster', 'tasks', 'tasks.json');

function syncWithTaskMaster() {
  if (!fs.existsSync(tasksFile)) {
    console.log('Task Master not found. Skipping sync.');
    return;
  }
  
  try {
    const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8')).tasks;
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    
    // Map task status to module progress
    const moduleProgress = {};
    tasks.forEach(task => {
      const module = task.title.toLowerCase().includes('ui') ? 'ui' :
                    task.title.toLowerCase().includes('api') ? 'api' : 'core';
      
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
        const completion = Math.round((progress.completed / progress.total) * 100);
        status.modules[module].completion = completion;
        status.modules[module].status = 
          completion === 100 ? 'complete' :
          completion > 0 ? 'in-progress' : 'pending';
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
EOF
chmod +x "${GPS_DIR}/sync-with-taskmaster.js"

# Create README for GPS
echo -e "${YELLOW}📝 Creating GPS documentation...${NC}"
cat > "${GPS_DIR}/README.md" << 'EOF'
# GridPlay Project GPS

## Overview
GridPlay Project GPS provides real-time visualization of your project status, including:
- Module completion tracking
- Test coverage visualization
- Risk assessment
- Performance metrics
- Integration with Task Master AI

## Usage

### View Dashboard
Open `.gps/dashboard.html` in your browser to view the interactive dashboard.

### Update Status
```bash
# Update module completion
.gps/update-status.js core completion 75

# Update test results
.gps/update-status.js ui tests '{"passed": 10, "failed": 2, "total": 15}'

# Update project version
.gps/update-status.js project version "0.2.0"
```

### Sync with Task Master
```bash
# Sync progress from Task Master tasks
.gps/sync-with-taskmaster.js
```

### Automated Updates
Add to your CI/CD pipeline:
```yaml
- name: Update Project GPS
  run: |
    .gps/update-status.js core completion ${{ env.COMPLETION }}
    .gps/sync-with-taskmaster.js
```

## Directory Structure
```
.gps/
├── dashboard.html          # Interactive visualization dashboard
├── status.json            # Current project status data
├── update-status.js       # CLI tool for status updates
├── sync-with-taskmaster.js # Task Master integration
├── visualizations/        # Additional visualization assets
├── reports/              # Generated reports
└── metrics/              # Historical metrics data
```

## Integration Ideas
1. **Git Hooks**: Update status on commits
2. **CI/CD**: Update metrics after builds
3. **Task Master**: Auto-sync task completion
4. **Slack/Discord**: Send status notifications
5. **VS Code**: Status bar integration

## Customization
Edit `status.json` to add custom modules, metrics, or risk categories.
Modify `dashboard.html` to customize the visualization style and layout.
EOF

# Create Git hook for automatic updates
echo -e "${YELLOW}🪝 Setting up Git hooks...${NC}"
mkdir -p .git/hooks
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
# Auto-update GPS on commit

if [ -x ".gps/sync-with-taskmaster.js" ]; then
  echo "Updating Project GPS..."
  .gps/sync-with-taskmaster.js
fi
EOF
chmod +x .git/hooks/post-commit

# Success message
echo -e "${GREEN}✅ GridPlay Project GPS setup complete!${NC}"
echo -e "${BLUE}📊 Open ${DASHBOARD_FILE} in your browser to view the dashboard${NC}"
echo -e "${BLUE}📝 See ${GPS_DIR}/README.md for usage instructions${NC}"

# Initial sync if Task Master exists
if [ -f ".taskmaster/tasks/tasks.json" ]; then
  echo -e "${YELLOW}🔄 Performing initial Task Master sync...${NC}"
  node "${GPS_DIR}/sync-with-taskmaster.js"
fi