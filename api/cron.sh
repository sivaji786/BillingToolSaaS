#!/bin/bash
# Run via crontab once a day, e.g.:
#   0 3 * * * /path/to/api/cron.sh >> /var/log/billing-cron.log 2>&1

cd "$(dirname "$0")"

echo "[$(date)] Running log cleanup..."
php spark cleanup:logs

echo "[$(date)] Running usage limit checks..."
php spark usage:check 2>/dev/null || true

echo "[$(date)] Marking overdue invoices..."
php spark invoices:mark-overdue
