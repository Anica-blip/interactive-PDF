#!/bin/bash

# Complete Supabase Integration - Quick Deployment Script
# Run this from your interactive-PDF repository root

echo "🚀 Deploying Complete Supabase Integration..."
echo ""

# Step 1: Deploy Worker (Backend)
echo "📦 Step 1: Deploying Worker..."
git add worker.js
git commit -m "Fix: Complete Worker API with draft system, JSON export, and connection test"

# Step 2: Deploy Frontend (Public Files)
echo "📦 Step 2: Deploying Frontend Files..."
git add public/index.html public/app.js public/projects.html public/viewer.html public/flipbook.html public/manifest-generator.js

git commit -m "Fix: Complete Supabase integration - drafts, navigation, export, connection indicator"

# Step 3: Push Everything
echo "📤 Step 3: Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "⏳ Wait 1-3 minutes for:"
echo "   - GitHub Actions to deploy Worker → api.3c-public-library.org/pdf"
echo "   - Cloudflare Pages to deploy Frontend → builder.3c-public-library.org"
echo ""
echo "🧪 Then test:"
echo "   1. Open: https://builder.3c-public-library.org"
echo "   2. Check Supabase indicator (should be green ✅)"
echo "   3. Create a draft → Save Draft button"
echo "   4. Generate PDF → Generate PDF button"
echo "   5. Export JSON → Export JSON button"
echo "   6. Check projects → My Projects button"
echo ""
echo "📖 Full guide: COMPLETE_INTEGRATION_GUIDE.md"
