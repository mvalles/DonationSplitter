#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { printf "\n[init] %s\n" "$*"; }
skip() { printf "[init] (skip) %s\n" "$*"; }

# Environment toggles (optional)
: "${SKIP_BACKEND:=0}"  # set to 1 to skip backend setup
: "${SKIP_FRONTEND:=0}" # set to 1 to skip frontend setup

# ---------------- Backend (Hardhat) ----------------
if [ "$SKIP_BACKEND" = "1" ]; then
  skip "Backend setup skipped via SKIP_BACKEND=1"
else
  if [ ! -d backend ]; then
    log "Creating backend directory"
    mkdir -p backend
  fi
  cd backend
  if [ ! -f package.json ]; then
    log "Initializing backend (Hardhat)"
    npm init -y >/dev/null 2>&1 || npm init -y
  else
    skip "package.json exists"
  fi

  # Install dev deps only if not present
  if ! npx --yes --no-install hardhat --version >/dev/null 2>&1; then
    log "Installing Hardhat & dotenv dev dependencies"
    npm install --save-dev hardhat@latest dotenv@latest --no-fund --no-audit
  else
    skip "Hardhat already installed"
  fi

  # Ensure .env exists
  if [ ! -f .env ]; then
    log "Creating backend/.env placeholder"
    cat > .env <<'EOF'
# Copy or set secrets here locally (never commit real secrets)
# PRIVATE_KEY="0x..."
# ALCHEMY_API_KEY="..."
EOF
  else
    skip ".env exists"
  fi
  cd ..
fi

# ---------------- Frontend (Vite + React + wagmi + viem) ----------------
if [ "$SKIP_FRONTEND" = "1" ]; then
  skip "Frontend setup skipped via SKIP_FRONTEND=1"
else
  if [ ! -d frontend ]; then
    log "Creating frontend directory"
    mkdir -p frontend
  fi
  cd frontend
  if [ ! -f package.json ]; then
    log "Scaffolding frontend (Vite + React + TS) non-interactively"
    # Force specific version for reproducibility and auto-answer 'No' to experimental prompt
    export CI=1
    npx create-vite@8.0.2 . --template react-ts <<<'n' || true
  else
    skip "package.json exists"
  fi

  # Only install extra libs if not already present
  NEED_WEB3=0
  for pkg in viem wagmi @tanstack/react-query; do
    if ! npm ls "$pkg" >/dev/null 2>&1; then NEED_WEB3=1; break; fi
  done
  if [ $NEED_WEB3 -eq 1 ]; then
    log "Installing web3/data libs (viem, wagmi, @tanstack/react-query)"
    npm install viem@latest wagmi@latest @tanstack/react-query@latest --no-fund --no-audit
  else
    skip "web3/data libs already installed"
  fi
  cd ..
fi

log "Initialization finished successfully."