#!/bin/bash

# BillingTool - Deployment Package Creator (IMPROVED)
# This script builds the frontend, installs backend dependencies, and creates a deployment-ready zip file

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
echo -e "${YELLOW}[1/7]${NC} Cleaning previous builds..."
if [ -f "$OUTPUT_ZIP" ]; then
    rm "$OUTPUT_ZIP"
    echo -e "${GREEN}✓${NC} Removed old billingtool.zip"
fi

if [ -d "$PROJECT_DIR/build" ]; then
    rm -rf "$PROJECT_DIR/build"
    echo -e "${GREEN}✓${NC} Removed old build folder"
fi

# Step 2: Install frontend dependencies
echo -e "\n${YELLOW}[2/7]${NC} Installing frontend dependencies..."
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

# Step 3: Build frontend for production
echo -e "\n${YELLOW}[3/7]${NC} Building frontend for production..."
npm run build
if [ -d "$PROJECT_DIR/build" ]; then
    echo -e "${GREEN}✓${NC} Frontend built successfully"
else
    echo -e "${RED}✗${NC} Frontend build failed!"
    exit 1
fi

# Step 4: Install backend dependencies
echo -e "\n${YELLOW}[4/7]${NC} Installing backend dependencies..."
cd "$PROJECT_DIR/api"
if command -v composer &> /dev/null; then
    composer install --no-dev --optimize-autoloader
    echo -e "${GREEN}✓${NC} Composer dependencies installed"
else
    echo -e "${RED}✗${NC} Composer not found! Please install Composer first."
    exit 1
fi
cd "$PROJECT_DIR"

# Step 5: Create temporary package directory
echo -e "\n${YELLOW}[5/7]${NC} Creating deployment package..."
mkdir -p "$TEMP_DIR"

# Copy built frontend files
echo "  → Copying frontend files..."
cp -r "$PROJECT_DIR/build/"* "$TEMP_DIR/"

# Copy API folder (selective copy)
echo "  → Copying API backend..."
mkdir -p "$TEMP_DIR/api"

# Copy essential API directories
cp -r "$PROJECT_DIR/api/app" "$TEMP_DIR/api/"
cp -r "$PROJECT_DIR/api/public" "$TEMP_DIR/api/"
cp -r "$PROJECT_DIR/api/vendor" "$TEMP_DIR/api/"
cp -r "$PROJECT_DIR/api/writable" "$TEMP_DIR/api/"

# Copy essential API files
cp "$PROJECT_DIR/api/.htaccess" "$TEMP_DIR/api/" 2>/dev/null || true
cp "$PROJECT_DIR/api/composer.json" "$TEMP_DIR/api/"
cp "$PROJECT_DIR/api/composer.lock" "$TEMP_DIR/api/"
cp "$PROJECT_DIR/api/spark" "$TEMP_DIR/api/"
cp "$PROJECT_DIR/api/preload.php" "$TEMP_DIR/api/"

# Copy .env.production.example as .env.example
if [ -f "$PROJECT_DIR/api/.env.production.example" ]; then
    cp "$PROJECT_DIR/api/.env.production.example" "$TEMP_DIR/api/.env.example"
    echo -e "${GREEN}✓${NC} Copied .env.example for production"
fi

# Copy database schema
echo "  → Copying database schema..."
mkdir -p "$TEMP_DIR/database"
if [ -f "$PROJECT_DIR/database/schema.sql" ]; then
    cp "$PROJECT_DIR/database/schema.sql" "$TEMP_DIR/database/"
fi
if [ -f "$PROJECT_DIR/database/README.md" ]; then
    cp "$PROJECT_DIR/database/README.md" "$TEMP_DIR/database/"
fi

# Copy installer (DISABLED - upload separately)
# echo "  → Copying installer..."
# if [ -f "$PROJECT_DIR/installer.php" ]; then
#     cp "$PROJECT_DIR/installer.php" "$TEMP_DIR/"
#     echo -e "${GREEN}✓${NC} Installer included"
# else
#     echo -e "${YELLOW}⚠${NC} installer.php not found"
# fi

# Copy deployment documentation
if [ -f "$PROJECT_DIR/README.md" ]; then
    cp "$PROJECT_DIR/README.md" "$TEMP_DIR/DEPLOYMENT_README.md"
fi

# Clean up writable directory (remove cache, logs, but keep structure)
echo "  → Cleaning writable directories..."
rm -rf "$TEMP_DIR/api/writable/cache/"* 2>/dev/null || true
rm -rf "$TEMP_DIR/api/writable/logs/"* 2>/dev/null || true
rm -rf "$TEMP_DIR/api/writable/session/"* 2>/dev/null || true
rm -rf "$TEMP_DIR/api/writable/uploads/"* 2>/dev/null || true
rm -rf "$TEMP_DIR/api/writable/debugbar/"* 2>/dev/null || true

# Create necessary directories and .gitkeep files
echo "  → Creating required directories..."
mkdir -p "$TEMP_DIR/api/writable/cache"
mkdir -p "$TEMP_DIR/api/writable/logs"
mkdir -p "$TEMP_DIR/api/writable/session"
mkdir -p "$TEMP_DIR/api/writable/uploads"
mkdir -p "$TEMP_DIR/api/public/uploads"

touch "$TEMP_DIR/api/writable/cache/.gitkeep"
touch "$TEMP_DIR/api/writable/logs/.gitkeep"
touch "$TEMP_DIR/api/writable/session/.gitkeep"
touch "$TEMP_DIR/api/writable/uploads/.gitkeep"
touch "$TEMP_DIR/api/public/uploads/.gitkeep"

# Remove any accidentally included .env files
echo "  → Removing development files..."
rm -f "$TEMP_DIR/api/.env" 2>/dev/null || true
rm -f "$TEMP_DIR/.env" 2>/dev/null || true

# Remove development scripts and test files
rm -rf "$TEMP_DIR/api/tests" 2>/dev/null || true
rm -f "$TEMP_DIR/api/dev.sh" 2>/dev/null || true
rm -f "$TEMP_DIR/api/dev-server.sh" 2>/dev/null || true
rm -f "$TEMP_DIR/api/run_server.sh" 2>/dev/null || true
rm -f "$TEMP_DIR/api/phpunit.xml" 2>/dev/null || true
rm -f "$TEMP_DIR/api/phpunit.xml.dist" 2>/dev/null || true
rm -f "$TEMP_DIR/api/env" 2>/dev/null || true
rm -f "$TEMP_DIR/api/build" 2>/dev/null || true

echo -e "${GREEN}✓${NC} Package prepared"

# Step 6: Create zip file
echo -e "\n${YELLOW}[6/7]${NC} Creating zip archive..."
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

# Step 7: Cleanup
echo -e "\n${YELLOW}[7/7]${NC} Cleaning up temporary files..."
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
echo -e "${BLUE}Package Contents:${NC}"
echo "  ✓ Frontend build (optimized)"
echo "  ✓ Backend API with Composer dependencies"
echo "  ✓ Database schema"
echo "  ✓ Installer script"
echo "  ✓ Configuration examples"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload billingtool.zip to your hosting"
echo "2. Extract the zip file in your web root"
echo "3. Navigate to https://yourdomain.com/installer.php"
echo "4. Follow the installation wizard"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see:${NC} DEPLOYMENT_README.md (in package)"
echo ""
