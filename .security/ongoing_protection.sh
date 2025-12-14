#!/bin/bash
# Ongoing Protection and Monitoring System
# Purpose: Continuous protection with automated checks

SECURITY_DIR="/home/user/copilot-cli/.security"
REPO_DIR="/home/user/copilot-cli"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   ONGOING IP PROTECTION & MONITORING SYSTEM            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Function to create daily backup
daily_backup() {
    echo "📦 Running daily encrypted backup..."
    "$SECURITY_DIR/encrypt_and_backup.sh"
}

# Function to monitor network
monitor_network() {
    echo "🔍 Running network security scan..."
    "$SECURITY_DIR/network_monitor.sh"
}

# Function to verify file integrity
verify_integrity() {
    echo "🔐 Verifying file integrity..."
    cd "$REPO_DIR"

    current_hash=$(sha256sum Phoenix_Protocol_Super_Agent_Architecture.ipynb | awk '{print $1}')
    expected_hash="e8b23fb589ddd02ec94d54567f549438e483778977e70932aaed5ab6809d2c62"

    if [ "$current_hash" = "$expected_hash" ]; then
        echo "✓ File integrity verified: Phoenix Protocol notebook unchanged"
    else
        echo "⚠️  WARNING: File has been modified!"
        echo "   Expected: $expected_hash"
        echo "   Current:  $current_hash"
        echo "   Timestamp: $(date -Iseconds)"
        echo "   ALERT: Unauthorized modification detected!" >> "$SECURITY_DIR/ALERTS.log"
    fi
}

# Function to check git status
check_git_status() {
    echo "📊 Checking git repository status..."
    cd "$REPO_DIR"

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  Uncommitted changes detected"
        git status --short
    else
        echo "✓ No uncommitted changes"
    fi

    # Check for unpushed commits
    unpushed=$(git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null | wc -l)
    if [ "$unpushed" -gt 0 ]; then
        echo "⚠️  $unpushed unpushed commits detected"
    else
        echo "✓ All commits pushed to remote"
    fi
}

# Function to verify GPG signing
verify_gpg_config() {
    echo "🔑 Verifying GPG signing configuration..."

    signing_enabled=$(git config --get commit.gpgsign)
    signing_key=$(git config --get user.signingkey)

    if [ "$signing_enabled" = "true" ] && [ -n "$signing_key" ]; then
        echo "✓ GPG signing enabled (Key: $signing_key)"
    else
        echo "⚠️  WARNING: GPG signing not properly configured!"
        echo "   Re-run: .security/setup_gpg_signing.sh"
    fi
}

# Main protection routine
run_protection_check() {
    echo "Starting protection check at $(date -Iseconds)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    verify_integrity
    echo ""

    check_git_status
    echo ""

    verify_gpg_config
    echo ""

    monitor_network
    echo ""

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✓ Protection check complete"
    echo ""
}

# Create cron job helper (if user wants to automate)
setup_cron() {
    echo "To run this automatically every day at midnight:"
    echo "  crontab -e"
    echo "  Add this line:"
    echo "  0 0 * * * $SECURITY_DIR/ongoing_protection.sh >> $SECURITY_DIR/protection.log 2>&1"
    echo ""
}

# Display usage
show_usage() {
    echo "Usage:"
    echo "  $0                    # Run protection check"
    echo "  $0 --backup           # Create backup only"
    echo "  $0 --monitor          # Monitor network only"
    echo "  $0 --verify           # Verify integrity only"
    echo "  $0 --setup-cron       # Show cron setup instructions"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    --backup)
        daily_backup
        ;;
    --monitor)
        monitor_network
        ;;
    --verify)
        verify_integrity
        ;;
    --setup-cron)
        setup_cron
        ;;
    --help)
        show_usage
        ;;
    *)
        run_protection_check
        ;;
esac
