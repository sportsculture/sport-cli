#!/bin/bash

# Enhanced upstream sync script with better conflict handling
# Usage: ./scripts/sync-upstream.sh [--dry-run] [--force]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
UPSTREAM_REMOTE="upstream"
UPSTREAM_BRANCH="main"
MAIN_BRANCH="main"
PLUGINS_BRANCH="plugins"
PLUGINS_START_TAG="plugins-start"

# Parse arguments
DRY_RUN=false
FORCE=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--force]"
      exit 1
      ;;
  esac
done

# Functions
log() {
    echo -e "${GREEN}[SYNC]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if upstream remote exists
    if ! git remote | grep -q "^${UPSTREAM_REMOTE}$"; then
        error "Upstream remote '${UPSTREAM_REMOTE}' not found"
        echo "Run: git remote add ${UPSTREAM_REMOTE} https://github.com/google-gemini/gemini-cli.git"
        exit 1
    fi
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        error "Uncommitted changes detected"
        echo "Please commit or stash your changes before syncing"
        exit 1
    fi
    
    # Check if plugins branch exists
    if ! git rev-parse --verify ${PLUGINS_BRANCH} >/dev/null 2>&1; then
        warn "Plugins branch '${PLUGINS_BRANCH}' not found"
        echo "Creating plugins branch..."
        git checkout -b ${PLUGINS_BRANCH}
        git checkout ${MAIN_BRANCH}
    fi
    
    # Check if plugins-start tag exists
    if ! git rev-parse --verify ${PLUGINS_START_TAG} >/dev/null 2>&1; then
        error "Plugins start tag '${PLUGINS_START_TAG}' not found"
        echo "Please create it at the commit before your first plugin:"
        echo "git tag ${PLUGINS_START_TAG} <commit-hash>"
        exit 1
    fi
}

fetch_upstream() {
    log "Fetching upstream changes..."
    git fetch ${UPSTREAM_REMOTE} ${UPSTREAM_BRANCH}
}

create_sync_branch() {
    local sync_branch="sync-upstream-$(date +%Y%m%d-%H%M%S)"
    log "Creating sync branch: ${sync_branch}"
    
    git checkout -b ${sync_branch} ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}
    echo ${sync_branch}
}

check_divergence() {
    log "Analyzing divergence from upstream..."
    
    local commits_ahead=$(git rev-list --count ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}..${MAIN_BRANCH})
    local files_changed=$(git diff --name-only ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}..${MAIN_BRANCH} | wc -l)
    
    echo "Commits ahead: ${commits_ahead}"
    echo "Files changed: ${files_changed}"
    
    if [[ ${commits_ahead} -gt 100 ]]; then
        warn "High divergence detected (${commits_ahead} commits)"
        if [[ "${FORCE}" != "true" ]]; then
            read -p "Continue? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
}

apply_plugins() {
    log "Applying plugin commits..."
    
    # Get list of plugin commits
    local plugin_commits=$(git rev-list ${PLUGINS_START_TAG}..${PLUGINS_BRANCH})
    local total_commits=$(echo "${plugin_commits}" | wc -l)
    local current=0
    
    for commit in ${plugin_commits}; do
        current=$((current + 1))
        echo -n "Applying commit ${current}/${total_commits}: "
        
        if git cherry-pick ${commit} >/dev/null 2>&1; then
            echo "✓ $(git log --oneline -1 ${commit})"
        else
            error "Cherry-pick failed for commit ${commit}"
            echo "Commit message: $(git log --oneline -1 ${commit})"
            
            if [[ "${DRY_RUN}" == "true" ]]; then
                warn "Dry run mode: skipping conflict resolution"
                git cherry-pick --abort
                continue
            fi
            
            echo "Please resolve conflicts manually, then run:"
            echo "  git cherry-pick --continue"
            echo "  $0 --continue"
            exit 1
        fi
    done
}

run_tests() {
    log "Running test suites..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        warn "Dry run mode: skipping tests"
        return
    fi
    
    # Run all test suites
    npm run test:upstream || {
        error "Upstream tests failed"
        exit 1
    }
    
    npm run test:sport || {
        error "Sport-CLI tests failed"
        exit 1
    }
    
    npm run test:integration || {
        error "Integration tests failed"
        exit 1
    }
}

merge_to_main() {
    local sync_branch=$1
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        warn "Dry run mode: skipping merge"
        log "Would merge ${sync_branch} to ${MAIN_BRANCH}"
        return
    fi
    
    log "Merging to main branch..."
    git checkout ${MAIN_BRANCH}
    git merge ${sync_branch} --no-ff -m "Sync with upstream $(date +%Y-%m-%d)"
}

update_sync_log() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        return
    fi
    
    log "Updating sync log..."
    
    local log_file="UPSTREAM_SYNC_LOG.md"
    local date=$(date +"%Y-%m-%d %H:%M:%S")
    local upstream_commit=$(git rev-parse ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH})
    
    cat >> ${log_file} << EOF

## Sync ${date}

- Upstream commit: ${upstream_commit}
- Conflicts resolved: $(git log --oneline --grep="Merge conflict" | wc -l)
- Tests passed: ✓
- Notes: [Add any important notes here]

EOF
    
    git add ${log_file}
    git commit -m "Update upstream sync log"
}

cleanup() {
    local sync_branch=$1
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "Dry run complete. Cleaning up..."
        git checkout ${MAIN_BRANCH}
        git branch -D ${sync_branch}
        return
    fi
    
    log "Cleaning up..."
    read -p "Delete sync branch ${sync_branch}? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -d ${sync_branch}
    fi
}

# Main execution
main() {
    log "Starting upstream sync process..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        warn "Running in DRY RUN mode - no changes will be made"
    fi
    
    check_prerequisites
    check_divergence
    fetch_upstream
    
    sync_branch=$(create_sync_branch)
    
    apply_plugins
    run_tests
    merge_to_main ${sync_branch}
    update_sync_log
    cleanup ${sync_branch}
    
    log "Sync completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Review the changes with: git log --oneline -10"
    echo "2. Run final verification: npm run preflight"
    echo "3. Push to origin: git push origin ${MAIN_BRANCH}"
}

# Run main
main