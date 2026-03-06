#!/bin/bash
# NextRole Automation Engine
# This script runs repeatedly in the background to handle:
# 1. Scraping new jobs implicitly
# 2. Saving profile and app data to GitHub

# Set strict mode
set -e

NEXTROLE_DIR="$HOME/Documents/NextRole"
DATA_DIR="$NEXTROLE_DIR/.data"
LOG_DIR="$NEXTROLE_DIR/logs"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/automation.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting NextRole automation sweep..."

# 1. Sync Data to GitHub
cd "$NEXTROLE_DIR"
log "Checking for local changes..."

if [[ $(git status --porcelain) ]]; then
    log "Changes detected. Committing and pushing to GitHub..."
    git add .
    git commit -m "Auto-backup: NextRole Data [$(date +'%Y-%m-%d %H:%M:%S')]"
    git push origin main
    log "Backup complete."
else
    log "No changes to backup."
fi

log "Sweep complete."
