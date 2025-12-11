#!/bin/bash

# API Routing Fix - Deploy Script
# Fixes app.js to point to correct Worker domain

echo "🔧 Deploying API Routing Fix..."
echo ""

# Deploy the fixed app.js
echo "📦 Deploying app.js with correct API domain..."
git add public/app.js
git commit -m "Fix: Point API_BASE to correct Worker domain (api.3c-public-library.org/pdf)"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "⏳ Wait 1-2 minutes for Cloudflare Pages deployment"
echo ""
echo "🧪 Then test:"
echo "   1. Open: https://builder.3c-public-library.org"
echo "   2. Hard refresh: Ctrl+Shift+R"
echo "   3. Open browser console (F12)"
echo "   4. Click 'Save Draft'"
echo "   5. Check Network tab - should call: api.3c-public-library.org/pdf/api/save-project"
echo "   6. Check Supabase Table Editor → pdf_projects → Should see new row"
echo ""
echo "📖 Full explanation: API_ROUTING_FIX.md"
