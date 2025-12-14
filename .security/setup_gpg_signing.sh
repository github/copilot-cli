#!/bin/bash
# GPG Commit Signing Setup Script
# Purpose: Enable cryptographic proof of authorship

echo "=== GPG COMMIT SIGNING SETUP ==="
echo ""

# Check if GPG key exists
if gpg --list-secret-keys JAKOBPAPER@GMAIL.COM &>/dev/null; then
    echo "✓ GPG key already exists for JAKOBPAPER@GMAIL.COM"
    KEY_ID=$(gpg --list-secret-keys --keyid-format LONG JAKOBPAPER@GMAIL.COM | grep sec | awk '{print $2}' | cut -d'/' -f2)
else
    echo "Creating new GPG key for JAKOBPAPER@GMAIL.COM..."

    # Generate GPG key non-interactively
    cat >gpg-key-config <<EOF
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: Jakob Axel Paper
Name-Email: JAKOBPAPER@GMAIL.COM
Expire-Date: 0
%commit
EOF

    gpg --batch --gen-key gpg-key-config
    rm gpg-key-config

    KEY_ID=$(gpg --list-secret-keys --keyid-format LONG JAKOBPAPER@GMAIL.COM | grep sec | awk '{print $2}' | cut -d'/' -f2)
    echo "✓ GPG key created: $KEY_ID"
fi

# Configure git to use GPG signing
git config --global user.signingkey $KEY_ID
git config --global commit.gpgsign true
git config --global gpg.program gpg

echo "✓ Git configured for automatic GPG signing"
echo ""
echo "Key ID: $KEY_ID"
echo ""
echo "To export your public key (for verification):"
echo "  gpg --armor --export $KEY_ID > public_key.asc"
echo ""
echo "All future commits will be automatically signed!"
