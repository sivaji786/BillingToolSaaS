#!/bin/bash

# BillingTool - Deployment Package Creator
# This script builds the frontend and creates a deployment-ready zip file

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="/tmp/billingtool-package-$(date +%s)"
OUTPUT_ZIP="$PROJECT_DIR/billingtool.zip"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BillingTool - Deployment Package Creator        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}[1/6]${NC} Cleaning previous builds..."
if [ -f "$OUTPUT_ZIP" ]; then
    rm "$OUTPUT_ZIP"
    echo -e "${GREEN}✓${NC} Removed old billingtool.zip"
fi

if [ -d "$PROJECT_DIR/build" ]; then
    rm -rf "$PROJECT_DIR/build"
    echo -e "${GREEN}✓${NC} Removed old build folder"
fi

# Step 2: Install frontend dependencies
echo -e "\n${YELLOW}[2/6]${NC} Installing frontend dependencies..."
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

# Step 3: Build frontend for production
echo -e "\n${YELLOW}[3/6]${NC} Building frontend for production..."
npm run build
if [ -d "$PROJECT_DIR/build" ]; then
    echo -e "${GREEN}✓${NC} Frontend built successfully"
else
    echo -e "${RED}✗${NC} Frontend build failed!"
    exit 1
fi

# Step 4: Create temporary package directory
echo -e "\n${YELLOW}[4/6]${NC} Creating deployment package..."
mkdir -p "$TEMP_DIR"

# Copy built frontend files
echo "  → Copying frontend files..."
cp -r "$PROJECT_DIR/build/"* "$TEMP_DIR/"

# Copy API folder
echo "  → Copying API backend..."
cp -r "$PROJECT_DIR/api" "$TEMP_DIR/"

# Copy database schema
echo "  → Copying database schema..."
mkdir -p "$TEMP_DIR/database"
cp "$PROJECT_DIR/database/schema.sql" "$TEMP_DIR/database/"
cp "$PROJECT_DIR/database/README.md" "$TEMP_DIR/database/"

# Copy environment example
if [ -f "$PROJECT_DIR/.env.production" ]; then
    cp "$PROJECT_DIR/.env.production" "$TEMP_DIR/"
fi

# Remove unnecessary files from API
echo "  → Cleaning up API folder..."
rm -rf "$TEMP_DIR/api/.env" 2>/dev/null || true
rm -rf "$TEMP_DIR/api/.git" 2>/dev/null || true
rm -rf "$TEMP_DIR/api/tests" 2>/dev/null || true
rm -rf "$TEMP_DIR/api/api.zip" 2>/dev/null || true
rm -rf "$TEMP_DIR/api/dev.sh" 2>/dev/null || true
rm -rf "$TEMP_DIR/api/run_server.sh" 2>/dev/null || true

# Create necessary directories
echo "  → Creating required directories..."
mkdir -p "$TEMP_DIR/api/writable/cache"
mkdir -p "$TEMP_DIR/api/writable/logs"
mkdir -p "$TEMP_DIR/api/writable/session"
mkdir -p "$TEMP_DIR/api/writable/uploads"
mkdir -p "$TEMP_DIR/api/public/uploads"

# Create .gitkeep files
touch "$TEMP_DIR/api/writable/cache/.gitkeep"
touch "$TEMP_DIR/api/writable/logs/.gitkeep"
touch "$TEMP_DIR/api/writable/session/.gitkeep"
touch "$TEMP_DIR/api/writable/uploads/.gitkeep"
touch "$TEMP_DIR/api/public/uploads/.gitkeep"

echo -e "${GREEN}✓${NC} Package prepared"

# Step 5: Create zip file
echo -e "\n${YELLOW}[5/6]${NC} Creating zip archive..."
cd "$TEMP_DIR"
zip -r -q "$OUTPUT_ZIP" .
cd "$PROJECT_DIR"

if [ -f "$OUTPUT_ZIP" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
    echo -e "${GREEN}✓${NC} Zip file created: billingtool.zip (${FILE_SIZE})"
else
    echo -e "${RED}✗${NC} Failed to create zip file!"
    exit 1
fi

# Step 6: Cleanup
echo -e "\n${YELLOW}[6/6]${NC} Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✓${NC} Cleanup complete"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Package Created Successfully!         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📦 Package:${NC} billingtool.zip"
echo -e "${GREEN}📁 Location:${NC} $OUTPUT_ZIP"
echo -e "${GREEN}📏 Size:${NC} $(du -h "$OUTPUT_ZIP" | cut -f1)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload billingtool.zip to your hosting"
echo "2. Upload installer.php to your hosting"
echo "3. Navigate to https://yourdomain.com/installer.php"
echo "4. Follow the installation wizard"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see:${NC} SHARED_HOSTING_DEPLOYMENT.md"
echo ""
