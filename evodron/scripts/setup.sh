#!/usr/bin/env bash
# EVODRON Setup Script
# Sets up the EVODRON platform for development.
# Usage: bash scripts/setup.sh

set -e

cd "$(dirname "$0")/.."

echo ""
echo "  ███████╗██╗   ██╗ ██████╗ ██████╗ ██████╗  ██████╗ ███╗   ██╗"
echo "  ██╔════╝██║   ██║██╔═══██╗██╔══██╗██╔══██╗██╔═══██╗████╗  ██║"
echo "  █████╗  ██║   ██║██║   ██║██║  ██║██████╔╝██║   ██║██╔██╗ ██║"
echo "  ██╔══╝  ╚██╗ ██╔╝██║   ██║██║  ██║██╔══██╗██║   ██║██║╚██╗██║"
echo "  ███████╗ ╚████╔╝ ╚██████╔╝██████╔╝██║  ██║╚██████╔╝██║ ╚████║"
echo "  ╚══════╝  ╚═══╝   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝"
echo ""
echo "  EVODRON Setup"
echo "  ─────────────────────────────────────────────────────────────────"
echo ""

# 1. Check Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required (>= 18). Please install it first."
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js >= 18 required. Found: $(node --version)"
  exit 1
fi

echo "✅ Node.js $(node --version) found"

# 2. Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env created from .env.example"
  echo "⚠️  Edit .env and set a secure EVODRON_JWT_SECRET before starting the API."
else
  echo "✅ .env already exists"
fi

# 3. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# 4. Run database migrations
echo ""
echo "🗄️  Running database migrations..."
npm run db:migrate

# 5. Seed default reward rules
echo ""
echo "🌱 Seeding default reward rules..."
npm run db:seed

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "✅ EVODRON setup complete!"
echo ""
echo "  To start the API:"
echo "    npm run dev:api"
echo ""
echo "  To use the CLI (after build):"
echo "    npm run build"
echo "    node packages/cli/dist/bin/evodron.js auth register"
echo ""
echo "  ⚠️  Remember to set a secure EVODRON_JWT_SECRET in .env!"
echo "─────────────────────────────────────────────────────────────────"
echo ""
