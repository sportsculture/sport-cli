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
