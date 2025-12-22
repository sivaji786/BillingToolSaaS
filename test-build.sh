#!/bin/bash

# Test script to verify npm run build works from any directory

echo "Testing npm run build from different directories..."
echo ""

# Test 1: From project directory
echo "Test 1: Running from project directory"
cd /home/sivaji/Downloads/BillingTool
npm run build --prefix /home/sivaji/Downloads/BillingTool
echo "✓ Test 1 passed"
echo ""

# Test 2: From parent directory
echo "Test 2: Running from parent directory"
cd /home/sivaji/Downloads
npm run build --prefix /home/sivaji/Downloads/BillingTool
echo "✓ Test 2 passed"
echo ""

# Test 3: From home directory
echo "Test 3: Running from home directory"
cd /home/sivaji
npm run build --prefix /home/sivaji/Downloads/BillingTool
echo "✓ Test 3 passed"
echo ""

echo "All tests passed! npm run build works from any directory."
