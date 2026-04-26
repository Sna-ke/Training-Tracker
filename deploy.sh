#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — Training Tracker deployment script
#
#  Copies all deployable files from the working directory to a target
#  directory. config.php is never overwritten.
#
#  Usage:
#    ./deploy.sh [target_dir]
#
#  Examples:
#    ./deploy.sh                        # deploys to /htdocs/exercise/
#    ./deploy.sh /var/www/html/tracker  # deploys to a custom path
#
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────
DEFAULT_TARGET="/Applications/MAMP/htdocs/exercise"
TARGET="${1:-$DEFAULT_TARGET}"
SOURCE="$(cd "$(dirname "$0")" && pwd)"   # directory this script lives in

# ── Colours ───────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]  ${NC} $*"; }
error()   { echo -e "${RED}[error] ${NC} $*"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────
info "Source : $SOURCE"
info "Target : $TARGET"
echo ""

[[ "$SOURCE" == "$TARGET" ]] && error "Source and target are the same directory."

# ── Angular build ──────────────────────────────────────────────
info "Building Angular frontend..."
(cd "$SOURCE/frontend" && npm run build) || error "Angular build failed."
echo ""

# Create target if it doesn't exist
if [[ ! -d "$TARGET" ]]; then
  warn "Target directory does not exist — creating $TARGET"
  mkdir -p "$TARGET"
fi

# ── PHP application files ──────────────────────────────────────
info "Copying PHP application classes..."
rsync -a --delete \
  "$SOURCE/app/" \
  "$TARGET/app/"

# ── Public assets ──────────────────────────────────────────────
info "Copying public assets..."
rsync -a --delete \
  "$SOURCE/public/" \
  "$TARGET/public/"

# ── Layout templates ───────────────────────────────────────────
info "Copying layout templates..."
rsync -a --delete \
  "$SOURCE/layout/" \
  "$TARGET/layout/"

# ── Admin pages ────────────────────────────────────────────────
info "Copying admin pages..."
rsync -a --delete \
  "$SOURCE/admin/" \
  "$TARGET/admin/"

# ── User pages ────────────────────────────────────────────────
info "Copying admin pages..."
rsync -a --delete \
  "$SOURCE/user/" \
  "$TARGET/user/"

# ── PHP pages (root level) ─────────────────────────────────────
info "Copying root PHP pages..."
rsync -a \
  --exclude="config.php" \
  --exclude="config.example.php" \
  --include="*.php" \
  --exclude="*" \
  "$SOURCE/" \
  "$TARGET/"

# ── Schema files ───────────────────────────────────────────────
info "Copying schema files..."
rsync -a \
  --include="*.sql" \
  --exclude="*" \
  "$SOURCE/" \
  "$TARGET/"

# ── config.php guard ──────────────────────────────────────────
# Ensure config.php was never touched. If it doesn't exist in the
# target yet, copy the example so the app at least boots with a
# clear message about what to configure.
if [[ -f "$TARGET/config.php" ]]; then
  info "config.php already exists in target — skipping (credentials preserved)."
else
  if [[ -f "$SOURCE/config.example.php" ]]; then
    cp "$SOURCE/config.example.php" "$TARGET/config.php"
    warn "config.php did not exist — copied config.example.php as a starting point."
    warn "Edit $TARGET/config.php with your database credentials before use."
  else
    warn "config.php does not exist in target and no config.example.php found."
    warn "You must create $TARGET/config.php manually before the app will work."
  fi
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
info "Deployment complete."
echo ""
echo "  Target : $TARGET"
if [[ -f "$TARGET/config.php" ]]; then
  echo "  Config : preserved (not overwritten)"
fi
echo ""
