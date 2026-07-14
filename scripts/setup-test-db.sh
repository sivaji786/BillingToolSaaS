#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-test-db.sh
#
# Initialises the test database used by run-tests.sh.
# Idempotent: safe to run multiple times.
#
# What it does:
#   1. Starts Docker test services (MySQL on 3307 + Mailpit on 1025/8025)
#   2. Waits up to 60 s for MySQL to accept connections
#   3. Temporarily swaps api/.env → api/.env.testing
#   4. Runs all CI4 migrations against billingtool_test
#   5. Runs seeders: Main → WorkHubRights → WorkHubPackages → WorkHubTest
#   6. Restores api/.env
#
# Usage:
#   bash scripts/setup-test-db.sh
#   npm run test:setup
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/api"
COMPOSE_FILE="$REPO_ROOT/docker-compose.test.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[setup-db]${NC} $*"; }
success() { echo -e "${GREEN}[setup-db]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup-db]${NC} $*"; }
error()   { echo -e "${RED}[setup-db]${NC} $*" >&2; }

# ── Prereq checks ─────────────────────────────────────────────────────────────
for cmd in docker php mysql; do
    if ! command -v "$cmd" &>/dev/null; then
        error "Required command not found: $cmd"
        exit 1
    fi
done

if [[ ! -f "$API_DIR/.env.testing" ]]; then
    error "api/.env.testing not found. Did you create it?"
    exit 1
fi

# ── 1. Start Docker services ──────────────────────────────────────────────────
info "Starting Docker test services..."
docker-compose -f "$COMPOSE_FILE" up -d

# ── 2. Wait for MySQL ─────────────────────────────────────────────────────────
info "Waiting for MySQL on port 3307..."
MAX_WAIT=60
WAITED=0
until mysql -h 127.0.0.1 -P 3307 -u root -proot billingtool_test \
      -e "SELECT 1" &>/dev/null; do
    if (( WAITED >= MAX_WAIT )); then
        error "MySQL did not become ready after ${MAX_WAIT}s"
        docker-compose -f "$COMPOSE_FILE" logs mysql_test | tail -20
        exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
done
success "MySQL ready (waited ${WAITED}s)"

# ── 3. Swap .env → .env.testing ───────────────────────────────────────────────
ENV_BACKUP=""
restore_env() {
    if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
        cp "$ENV_BACKUP" "$API_DIR/.env"
        rm -f "$ENV_BACKUP"
        info "Restored api/.env"
    fi
}
trap restore_env EXIT

if [[ -f "$API_DIR/.env" ]]; then
    ENV_BACKUP=$(mktemp)
    cp "$API_DIR/.env" "$ENV_BACKUP"
    info "Backed up api/.env"
fi
cp "$API_DIR/.env.testing" "$API_DIR/.env"
info "Activated api/.env.testing"

# ── 4. Reset DB and run migrations ───────────────────────────────────────────
info "Dropping and recreating billingtool_test for a clean migration run..."
mysql -h 127.0.0.1 -P 3307 -u root -proot \
    -e "DROP DATABASE IF EXISTS billingtool_test; CREATE DATABASE billingtool_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
info "Running CI4 migrations..."
(cd "$API_DIR" && php spark migrate --all 2>&1)
success "Migrations complete"

# ── 5. Run seeders ────────────────────────────────────────────────────────────
info "Seeding: MainSeeder (12 tenants + sample data)..."
(cd "$API_DIR" && php spark db:seed MainSeeder 2>&1)

info "Seeding: BuyerSeeder..."
(cd "$API_DIR" && php spark db:seed BuyerSeeder 2>&1)

info "Seeding: WorkHubRightsSeeder..."
(cd "$API_DIR" && php spark db:seed WorkHubRightsSeeder 2>&1)

info "Seeding: WorkHubPackagesSeeder..."
(cd "$API_DIR" && php spark db:seed WorkHubPackagesSeeder 2>&1)

info "Seeding: WorkHubTestSeeder (deterministic E2E workers/tasks)..."
(cd "$API_DIR" && php spark db:seed WorkHubTestSeeder 2>&1)

info "Seeding: FullModuleTestSeeder (invoices/letters/buyers/tickets/workspace/wiki)..."
(cd "$API_DIR" && php spark db:seed FullModuleTestSeeder 2>&1)

success "All seeders complete"
info ""
info "Test DB summary:"
info "  Host:     127.0.0.1:3307"
info "  Database: billingtool_test"
info "  User:     root / root"
info "  Mailpit:  http://localhost:8025"
info ""
success "Test database ready."
