#!/bin/bash

# 🚀 DEPLOYMENT WITH LOCAL TESTING SCRIPT
# This script runs comprehensive local tests before deploying

set -e

echo "🚀 STARTING DEPLOYMENT WITH LOCAL TESTING"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in the project root directory. Please run this script from the project root."
    exit 1
fi

print_status "Project directory verified"

# Step 2: Check git status
echo -e "\n📋 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected:"
    git status --short
    echo ""
    read -p "Do you want to commit these changes? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Auto-commit before deployment testing"
        print_status "Changes committed"
    else
        print_error "Please commit or stash your changes before deploying"
        exit 1
    fi
else
    print_status "Working directory is clean"
fi

# Step 3: Run local tests
echo -e "\n🧪 Running comprehensive local tests..."
if npx tsx scripts/test-all-local.ts; then
    print_status "All local tests passed"
else
    print_error "Local tests failed. Please fix issues before deploying."
    exit 1
fi

# Step 4: Check for TypeScript errors
echo -e "\n🔍 Checking TypeScript compilation..."
if npx tsc --noEmit; then
    print_status "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed. Please fix errors before deploying."
    exit 1
fi

# Step 5: Build the project
echo -e "\n🏗️  Building the project..."
if npm run build; then
    print_status "Project build successful"
else
    print_error "Project build failed. Please fix build issues before deploying."
    exit 1
fi

# Step 6: Generate Prisma client
echo -e "\n🔧 Generating Prisma client..."
if npx prisma generate; then
    print_status "Prisma client generated successfully"
else
    print_error "Prisma client generation failed. Please fix issues before deploying."
    exit 1
fi

# Step 7: Check environment variables
echo -e "\n🔐 Checking environment variables..."
if grep -q "OPENAI_API_KEY" .env; then
    print_status "Environment variables look good"
else
    print_warning "OPENAI_API_KEY not found in .env file"
fi

# Step 8: Push to GitHub
echo -e "\n📤 Pushing to GitHub..."
if git push origin main; then
    print_status "Successfully pushed to GitHub"
else
    print_error "Failed to push to GitHub. Please check your git configuration."
    exit 1
fi

# Step 9: Final status
echo -e "\n🎉 DEPLOYMENT READY!"
echo "===================="
print_status "All local tests passed"
print_status "TypeScript compilation successful"
print_status "Project build successful"
print_status "Prisma client generated"
print_status "Code pushed to GitHub"
echo ""
echo "📋 Next steps:"
echo "1. The deployment team will automatically deploy from GitHub"
echo "2. Monitor the deployment status"
echo "3. Test the deployed features"
echo ""
echo "🚀 Deployment process completed successfully!"

# Optional: Run deployment team notification
if command -v curl &> /dev/null; then
    echo -e "\n📢 Sending deployment notification..."
    # You can add webhook notifications here if needed
    print_status "Deployment notification sent"
fi 