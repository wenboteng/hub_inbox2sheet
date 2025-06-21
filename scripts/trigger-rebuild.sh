#!/bin/bash

# Script to trigger a rebuild by updating the VERSION file
echo "🔄 Triggering rebuild..."

# Update VERSION file with current timestamp
echo "$(date +%Y%m%d-%H%M%S)" > VERSION
echo "# Rebuild triggered at $(date)" >> VERSION

# Commit and push
git add VERSION
git commit -m "Trigger rebuild: Update VERSION timestamp"
git push origin main

echo "✅ Rebuild triggered! Check Render dashboard for deployment status."
echo "📊 You can monitor the deployment at: https://dashboard.render.com" 