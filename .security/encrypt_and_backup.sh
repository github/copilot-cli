#!/bin/bash
# Encrypted Backup System for Intellectual Property
# Purpose: Create timestamped, encrypted backups with cryptographic proofs

set -e

BACKUP_DIR="/home/user/copilot-cli/.security/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GPG_KEY="FF7D0BB6EF152C83"

echo "=== ENCRYPTED BACKUP SYSTEM ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Files to backup and protect
FILES=(
    "Phoenix_Protocol_Super_Agent_Architecture.ipynb"
    ".security/EVIDENCE_REPORT.md"
    ".security/ip_manifest.json"
    "README.md"
)

echo "Creating encrypted backup archive..."

# Create tar archive
tar -czf "$BACKUP_DIR/ip_backup_${TIMESTAMP}.tar.gz" "${FILES[@]}" 2>/dev/null || true

# Create SHA256 manifest before encryption
echo "Generating cryptographic hashes..."
{
    echo "=== CRYPTOGRAPHIC HASH MANIFEST ==="
    echo "Generated: $(date -Iseconds)"
    echo "Backup ID: ${TIMESTAMP}"
    echo ""

    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            hash=$(sha256sum "$file" | awk '{print $1}')
            size=$(stat -f "%z" "$file" 2>/dev/null || stat -c "%s" "$file")
            echo "FILE: $file"
            echo "  SHA256: $hash"
            echo "  Size: $size bytes"
            echo "  Timestamp: $(date -Iseconds -r "$file" 2>/dev/null || date -Iseconds)"
            echo ""
        fi
    done
} > "$BACKUP_DIR/manifest_${TIMESTAMP}.txt"

# Encrypt the backup with GPG
echo "Encrypting backup..."
gpg --encrypt --recipient $GPG_KEY --output "$BACKUP_DIR/ip_backup_${TIMESTAMP}.tar.gz.gpg" "$BACKUP_DIR/ip_backup_${TIMESTAMP}.tar.gz"

# Sign the manifest
gpg --clearsign --local-user $GPG_KEY --output "$BACKUP_DIR/manifest_${TIMESTAMP}.txt.asc" "$BACKUP_DIR/manifest_${TIMESTAMP}.txt"

# Remove unencrypted archive
rm "$BACKUP_DIR/ip_backup_${TIMESTAMP}.tar.gz"

echo "✓ Encrypted backup created: ip_backup_${TIMESTAMP}.tar.gz.gpg"
echo "✓ Signed manifest created: manifest_${TIMESTAMP}.txt.asc"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""

# Create index of all backups
{
    echo "=== BACKUP INDEX ==="
    echo "Updated: $(date -Iseconds)"
    echo ""
    ls -lh "$BACKUP_DIR"/*.gpg 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No backups yet"
} > "$BACKUP_DIR/INDEX.txt"

echo "To decrypt a backup:"
echo "  gpg --decrypt ip_backup_${TIMESTAMP}.tar.gz.gpg > ip_backup_${TIMESTAMP}.tar.gz"
echo "  tar -xzf ip_backup_${TIMESTAMP}.tar.gz"
