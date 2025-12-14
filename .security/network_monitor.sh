#!/bin/bash
# Network Monitoring System
# Purpose: Detect potential data exfiltration attempts

LOG_FILE="/home/user/copilot-cli/.security/network_activity.log"
ALERT_FILE="/home/user/copilot-cli/.security/ALERTS.log"

echo "=== NETWORK MONITORING SYSTEM ==="
echo "Started: $(date -Iseconds)"
echo "Log file: $LOG_FILE"
echo ""

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Log current network connections
{
    echo "=== NETWORK SNAPSHOT ==="
    echo "Timestamp: $(date -Iseconds)"
    echo ""

    # Active connections
    echo "--- ACTIVE CONNECTIONS ---"
    netstat -tunapo 2>/dev/null || ss -tunapo || echo "Network tools not available"
    echo ""

    # DNS queries (if available)
    echo "--- RECENT DNS ACTIVITY ---"
    if [ -f /var/log/syslog ]; then
        grep -i "DNS" /var/log/syslog | tail -20 || echo "No DNS logs available"
    else
        echo "System logs not accessible"
    fi
    echo ""

    # Git remote operations
    echo "--- GIT REMOTE CONFIG ---"
    cd /home/user/copilot-cli
    git remote -v
    echo ""

    echo "--- GIT PUSH/PULL HISTORY ---"
    git reflog --date=iso | grep -E "(pull|push|fetch)" | head -20 || echo "No recent remote operations"
    echo ""

} >> "$LOG_FILE"

# Check for suspicious patterns
{
    echo "=== SECURITY SCAN ==="
    echo "Timestamp: $(date -Iseconds)"
    echo ""

    # Check if files are being uploaded to unknown hosts
    suspicious_found=false

    # Check for connections to non-GitHub domains
    if netstat -tunapo 2>/dev/null | grep -v "github.com" | grep -v "127.0.0.1" | grep ESTABLISHED; then
        echo "⚠️  WARNING: Non-GitHub connections detected"
        suspicious_found=true
    fi

    # Check git remotes for unexpected repositories
    cd /home/user/copilot-cli
    if git remote -v | grep -v "AxelJohnson1988/copilot-cli"; then
        echo "⚠️  WARNING: Unexpected git remotes detected"
        suspicious_found=true
    fi

    if [ "$suspicious_found" = false ]; then
        echo "✓ No immediate threats detected"
    fi
    echo ""

} >> "$ALERT_FILE"

echo "✓ Network snapshot captured"
echo "✓ Security scan completed"
echo ""
echo "View logs:"
echo "  cat $LOG_FILE"
echo "  cat $ALERT_FILE"
