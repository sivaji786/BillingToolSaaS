#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-tests.sh  —  BillingTool AI Testing Team
#
# Single command that runs ALL tests against a fresh test database.
#
# USAGE
#   bash run-tests.sh              # full suite
#   bash run-tests.sh --unit       # Vitest unit tests only
#   bash run-tests.sh --api        # Playwright API contract tests only
#   bash run-tests.sh --e2e        # All Playwright E2E suites only
#   bash run-tests.sh --suite api  # One named Playwright project
#   bash run-tests.sh --reset-db   # Re-seed DB then run full suite
#   bash run-tests.sh --skip-db    # Skip DB setup (use existing test DB)
#   bash run-tests.sh --headed     # Show browser during E2E tests
#   bash run-tests.sh --report     # Open Playwright HTML report after run
#
# WHAT IT DOES
#   1. Starts Docker (MySQL test DB + Mailpit)
#   2. Seeds the test database with 12 tenants + WorkHub sample data
#   3. Starts the PHP API server (port 8080) against billingtool_test
#   4. Starts the Vite frontend server (port 3000)
#   5. Runs: TypeScript check → PHPUnit → Vitest → Playwright (all projects)
#   6. Prints a colour-coded summary with pass/fail/skip counts
#   7. Stops all background servers and exits with the correct code
#
# AI ANALYSIS
#   After a failing run, the test failures are saved to test-results/failures.txt
#   You can ask Claude to analyse them:
#     cat test-results/failures.txt | claude "analyse these test failures and suggest fixes"
#
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$REPO_ROOT/api"
RESULTS_DIR="$REPO_ROOT/test-results"
COMPOSE_FILE="$REPO_ROOT/docker-compose.test.yml"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
PASS="${GREEN}✔${NC}"; FAIL="${RED}✘${NC}"; SKIP="${YELLOW}–${NC}"

log()     { echo -e "${CYAN}[test]${NC} $*"; }
success() { echo -e "${GREEN}[test]${NC} $*"; }
warn()    { echo -e "${YELLOW}[test]${NC} $*"; }
error()   { echo -e "${RED}[test]${NC} $*" >&2; }
banner()  { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════${NC}"; echo -e "${BOLD}  $*${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${NC}\n"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
RUN_UNIT=true; RUN_API=true; RUN_E2E=true; RUN_PHPUNIT=true
RESET_DB=false; SKIP_DB=false; HEADED=""; OPEN_REPORT=false
SINGLE_SUITE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)       RUN_API=false;  RUN_E2E=false;  RUN_PHPUNIT=false ;;
        --api)        RUN_UNIT=false; RUN_E2E=false;  RUN_PHPUNIT=false; SINGLE_SUITE="api" ;;
        --e2e)        RUN_UNIT=false; RUN_PHPUNIT=false ;;
        --suite)      shift; SINGLE_SUITE="$1"; RUN_UNIT=false; RUN_PHPUNIT=false; RUN_API=false ;;
        --reset-db)   RESET_DB=true ;;
        --skip-db)    SKIP_DB=true ;;
        --headed)     HEADED="--headed" ;;
        --report)     OPEN_REPORT=true ;;
        *) error "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

mkdir -p "$RESULTS_DIR"
START_TIME=$(date +%s)
FAILURES_FILE="$RESULTS_DIR/failures.txt"
> "$FAILURES_FILE"

# ── Process management ────────────────────────────────────────────────────────
API_PID=""; VITE_PID=""

cleanup() {
    log "Stopping background servers..."
    [[ -n "$API_PID" ]]  && kill "$API_PID"  2>/dev/null || true
    [[ -n "$VITE_PID" ]] && kill "$VITE_PID" 2>/dev/null || true
    # Always restore dev .env from permanent .env.local — safe even on crash or repeat runs
    if [[ -f "$API_DIR/.env.local" ]]; then
        cp "$API_DIR/.env.local" "$API_DIR/.env"
        log "Restored api/.env from api/.env.local"
    fi
}
trap cleanup EXIT

# ── Step 1: Test database setup ───────────────────────────────────────────────
if [[ "$SKIP_DB" == false ]]; then
    banner "Step 1 — Test Database"

    if [[ "$RESET_DB" == true ]]; then
        log "Stopping existing test containers..."
        docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    fi

    log "Starting Docker test services (MySQL:3307 + Mailpit:1025)..."
    docker-compose -f "$COMPOSE_FILE" up -d

    log "Waiting for MySQL on port 3307..."
    MAX_WAIT=60; WAITED=0
    until mysql -h 127.0.0.1 -P 3307 -u root -proot billingtool_test \
          -e "SELECT 1" &>/dev/null; do
        if (( WAITED >= MAX_WAIT )); then
            error "MySQL did not become ready after ${MAX_WAIT}s"
            exit 1
        fi
        sleep 2; WAITED=$((WAITED + 2))
    done
    success "MySQL ready"

    # Swap .env → .env.testing for spark commands
    # .env.local is the permanent dev snapshot; cleanup() always restores from it
    if [[ ! -f "$API_DIR/.env.local" ]]; then
        cp "$API_DIR/.env" "$API_DIR/.env.local"
        log "Created api/.env.local (permanent dev config snapshot)"
    fi
    cp "$API_DIR/.env.testing" "$API_DIR/.env"

    log "Running CI4 migrations..."
    (cd "$API_DIR" && php spark migrate --all 2>&1) | grep -E "(RUNNING|MIGRATED|ERROR|error)" || true

    log "Seeding test data..."
    for seeder in MainSeeder BuyerSeeder WorkHubRightsSeeder WorkHubPackagesSeeder WorkHubTestSeeder FullModuleTestSeeder; do
        log "  → $seeder"
        (cd "$API_DIR" && php spark db:seed "$seeder" 2>&1) | grep -E "(Seeding|complete|ERROR)" || true
    done
    success "Test database seeded"
else
    log "Skipping DB setup (--skip-db)"
    if [[ ! -f "$API_DIR/.env.local" ]]; then
        cp "$API_DIR/.env" "$API_DIR/.env.local"
        log "Created api/.env.local (permanent dev config snapshot)"
    fi
    cp "$API_DIR/.env.testing" "$API_DIR/.env"
fi

# ── Step 2: Start API server ──────────────────────────────────────────────────
banner "Step 2 — Start Servers"

log "Starting PHP API server on port 8080..."
(cd "$API_DIR" && php -S 0.0.0.0:8080 -t public/ >> "$RESULTS_DIR/api-server.log" 2>&1) &
API_PID=$!

# Wait for API to respond
WAITED=0
until curl -sf http://localhost:8080/health &>/dev/null || \
      curl -sf http://localhost:8080/auth/ping &>/dev/null || \
      curl -sf http://localhost:8080 &>/dev/null; do
    sleep 1; WAITED=$((WAITED + 1))
    if (( WAITED >= 20 )); then
        warn "API server slow to start — continuing anyway"
        break
    fi
done
success "API server running (PID $API_PID)"

# Start Vite frontend
log "Starting Vite frontend on port 3000..."
(cd "$REPO_ROOT" && npm run dev -- --port 3000 >> "$RESULTS_DIR/vite-server.log" 2>&1) &
VITE_PID=$!

WAITED=0
until curl -sf http://localhost:3000 &>/dev/null; do
    sleep 1; WAITED=$((WAITED + 1))
    if (( WAITED >= 30 )); then
        warn "Vite server slow to start — continuing anyway"
        break
    fi
done
success "Vite frontend running (PID $VITE_PID)"

# ── Step 3–7: Run test suites ─────────────────────────────────────────────────
declare -A SUITE_STATUS
OVERALL_EXIT=0

run_suite() {
    local name="$1"; local cmd="$2"
    banner "Running: $name"
    local log_file="$RESULTS_DIR/${name// /-}.log"
    if eval "$cmd" 2>&1 | tee "$log_file"; then
        SUITE_STATUS["$name"]="pass"
        success "$name PASSED"
    else
        SUITE_STATUS["$name"]="fail"
        OVERALL_EXIT=1
        error "$name FAILED — see $log_file"
        {
            echo ""
            echo "════════════════════════════════"
            echo "SUITE: $name"
            echo "════════════════════════════════"
            grep -E "(FAIL|Error|×|✘|failed|not passed)" "$log_file" | head -40 || \
                tail -30 "$log_file"
        } >> "$FAILURES_FILE"
    fi
}

# ── TypeScript check ──────────────────────────────────────────────────────────
if [[ "$RUN_UNIT" == true ]]; then
    run_suite "TypeScript" "cd '$REPO_ROOT' && npx tsc --noEmit"
fi

# ── PHPUnit (backend unit tests) ──────────────────────────────────────────────
if [[ "$RUN_PHPUNIT" == true ]]; then
    run_suite "PHPUnit" "cd '$API_DIR' && php vendor/bin/phpunit --testdox 2>&1"
fi

# ── Vitest (frontend unit + component tests) ──────────────────────────────────
if [[ "$RUN_UNIT" == true ]]; then
    run_suite "Vitest" "cd '$REPO_ROOT' && npx vitest run --reporter=verbose"
fi

# ── Playwright suites ─────────────────────────────────────────────────────────
pw_env="API_URL=http://localhost:8080 FRONTEND_URL=http://localhost:3000"

if [[ -n "$SINGLE_SUITE" ]]; then
    run_suite "Playwright:$SINGLE_SUITE" \
        "cd '$REPO_ROOT' && $pw_env npx playwright test --project='$SINGLE_SUITE' $HEADED"
elif [[ "$RUN_E2E" == true || "$RUN_API" == true ]]; then
    # Run Playwright projects in logical order
    for suite in api smoke billing workhub a11y visual; do
        if [[ "$RUN_API" == true && "$suite" == "api" ]] || \
           [[ "$RUN_E2E" == true && "$suite" != "api" ]]; then
            run_suite "Playwright:$suite" \
                "cd '$REPO_ROOT' && $pw_env npx playwright test --project='$suite' $HEADED 2>&1"
        fi
    done
fi

# ── Step 8: Summary report ────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINS=$((ELAPSED / 60)); SECS=$((ELAPSED % 60))

banner "Test Results Summary"

PASSED=0; FAILED=0
for suite in "${!SUITE_STATUS[@]}"; do
    status="${SUITE_STATUS[$suite]}"
    if [[ "$status" == "pass" ]]; then
        echo -e "  ${PASS} $suite"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${FAIL} $suite"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo -e "  Suites: ${GREEN}${PASSED} passed${NC}  ${RED}${FAILED} failed${NC}"
echo -e "  Time:   ${MINS}m ${SECS}s"
echo -e "  DB:     billingtool_test @ 127.0.0.1:3307"
echo -e "  Mail:   http://localhost:8025  (Mailpit)"

if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo -e "${RED}${BOLD}  ✘ ${FAILED} suite(s) failed.${NC}"
    echo -e "  Failures logged to: ${RESULTS_DIR}/failures.txt"
    echo ""
    echo -e "${YELLOW}${BOLD}  AI Analysis:${NC}"
    echo -e "  Ask Claude to analyse the failures:"
    echo -e "  ${CYAN}cat test-results/failures.txt | claude \"analyse these test failures, explain root causes and suggest fixes\"${NC}"
    echo ""
    echo -e "  Or open the Playwright HTML report:"
    echo -e "  ${CYAN}npm run test:e2e:report${NC}"
else
    echo ""
    echo -e "${GREEN}${BOLD}  ✔ All suites passed!${NC}"
fi

echo ""

if [[ "$OPEN_REPORT" == true ]]; then
    log "Opening Playwright report..."
    (cd "$REPO_ROOT" && npx playwright show-report) &
fi

exit $OVERALL_EXIT
