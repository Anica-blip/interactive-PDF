# 🚀 Cloudflare Pages Deployment Guide
## For: 3C Content Library + Interactive PDF Builder

**Chef's Quick Start Guide - Get Both Projects Live on Cloudflare!**

---

## 📋 Prerequisites (Check You Have These)

- ✅ Cloudflare account (free tier is fine)
- ✅ GitHub repositories:
  - `Anica-blip/3c-content-library`
  - `Anica-blip/interactive-PDF`
- ✅ Custom domain: `3ccontentlibrary.com` (already in Cloudflare)
- ✅ Supabase credentials (URL + Anon Key)
- ✅ Cloudflare R2 credentials (Account ID, Bucket Name, Access Keys)

---

## 🎯 DEPLOYMENT OVERVIEW

We'll deploy TWO separate projects:

```
Project 1: 3C Content Library
└── URL: library.3ccontentlibrary.com (or 3ccontentlibrary.com)

Project 2: Interactive PDF Builder  
└── URL: builder.3ccontentlibrary.com
```

**Time Estimate:** 30-45 minutes total (both projects)

---

## 📦 PROJECT 1: Deploy 3C Content Library

### Step 1: Go to Cloudflare Pages

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com
2. In left sidebar, click **Workers & Pages**
3. Click **Create application** button (blue button, top right)
4. Click **Pages** tab
5. Click **Connect to Git**

### Step 2: Authorize GitHub

1. Click **Connect GitHub** button
2. Authorize Cloudflare to access your GitHub account
3. You may need to select repositories to give access to
4. Select: `Anica-blip/3c-content-library`

### Step 3: Configure Build Settings

**Repository Settings:**
```
Repository: Anica-blip/3c-content-library
Branch: main (or master, whatever your default branch is)
```

**Build Settings:**
```
Framework preset: None (select from dropdown)
Build command: (leave empty)
Build output directory: / (or ./)
Root directory: (leave empty - we want root of repo)
```

**Why empty?** Your project is pure HTML/CSS/JS - no build step needed!

### Step 4: Set Environment Variables

Click **Add environment variable** and add these:

**IMPORTANT: Use "Production" environment for all of these!**

```
Variable Name: SUPABASE_URL
Value: [Your Supabase project URL]
Environment: Production

Variable Name: SUPABASE_ANON_KEY  
Value: [Your Supabase anon key]
Environment: Production

Variable Name: R2_PUBLIC_URL
Value: [Your R2 bucket public URL]
Environment: Production

Variable Name: R2_ACCOUNT_ID
Value: [Your Cloudflare account ID]
Environment: Production
```

**Where to find these:**
- **Supabase URL/Key:** Supabase Dashboard → Project Settings → API
- **R2 Account ID:** Cloudflare Dashboard → R2 → Your bucket → Settings
- **R2 Public URL:** The URL you're already using (check your config.js)

### Step 5: Deploy!

1. Click **Save and Deploy** button
2. Wait 1-2 minutes while Cloudflare builds your site
3. You'll see a URL like: `3c-content-library.pages.dev`
4. Click the URL to test!

### Step 6: Connect Custom Domain

1. In your Pages project, click **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `library.3ccontentlibrary.com` (or just `3ccontentlibrary.com`)
4. Click **Continue**
5. Cloudflare will automatically configure DNS (because your domain is already on Cloudflare!)
6. Wait 5-10 minutes for SSL certificate to activate
7. Done! Your library is now at: `library.3ccontentlibrary.com`

**Note:** If you use just `3ccontentlibrary.com` (no subdomain), that becomes your main site.

---

## 📦 PROJECT 2: Deploy Interactive PDF Builder

### Step 1: Create Another Pages Project

1. Go back to **Workers & Pages**
2. Click **Create application** → **Pages** → **Connect to Git**
3. This time select: `Anica-blip/interactive-PDF`

### Step 2: Configure Build Settings

**Repository Settings:**
```
Repository: Anica-blip/interactive-PDF
Branch: main
```

**Build Settings:**
```
Framework preset: None
Build command: (leave empty)
Build output directory: /
Root directory: (leave empty)
```

### Step 3: Set Environment Variables

**Add these variables (Production environment):**

```
Variable Name: R2_PUBLIC_URL
Value: [Your R2 bucket public URL]

Variable Name: R2_ACCOUNT_ID
Value: [Your Cloudflare account ID]

Variable Name: R2_ACCESS_KEY_ID
Value: [Your R2 access key - from Cloudflare R2 dashboard]

Variable Name: R2_SECRET_ACCESS_KEY
Value: [Your R2 secret key - keep this SECRET!]

Variable Name: R2_BUCKET_NAME
Value: [Your bucket name, e.g., "3c-content-library"]
```

**Where to get R2 Access Keys:**
1. Cloudflare Dashboard → R2 → Overview
2. Click **Manage R2 API Tokens** 
3. Create API Token → Give it a name → Create
4. Copy the Access Key ID and Secret Access Key
5. **IMPORTANT:** Save these somewhere safe! You can't see the secret again!

### Step 4: Deploy!

1. Click **Save and Deploy**
2. Wait for deployment (1-2 minutes)
3. Test at: `interactive-pdf.pages.dev`

### Step 5: Connect Custom Domain

1. Click **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `builder.3ccontentlibrary.com`
4. Click **Continue**
5. DNS configured automatically
6. Wait for SSL (5-10 minutes)
7. Done! Builder is at: `builder.3ccontentlibrary.com`

---

## 🔧 UPDATE YOUR CONFIG FILES

### For 3C Content Library

Update `config.js` in your repo:

```javascript
const CONFIG = {
    supabase: {
        // These will come from environment variables
        url: import.meta.env.SUPABASE_URL || 'YOUR-FALLBACK-URL',
        anonKey: import.meta.env.SUPABASE_ANON_KEY || 'YOUR-FALLBACK-KEY',
    },
    r2: {
        publicUrl: import.meta.env.R2_PUBLIC_URL || 'https://files.3c-public-library.org',
        accountId: import.meta.env.R2_ACCOUNT_ID,
    },
    // Keep everything else the same
};
```

**Then push to GitHub:**
```bash
git add config.js
git commit -m "Updated config for Cloudflare environment variables"
git push
```

Cloudflare will auto-deploy in 30 seconds!

---

## 🔄 AUTO-DEPLOYMENT (How It Works)

**Every time you push to GitHub:**

```
You: git push
  ↓
GitHub: Receives the push
  ↓
Cloudflare: Detects the push (via webhook)
  ↓
Cloudflare: Builds your site (30-60 seconds)
  ↓
Your site: LIVE with new changes!
```

**You can watch deployments:**
- Go to your Pages project
- Click **Deployments** tab
- See real-time build logs
- See success/failure status

---

## 🎯 TESTING CHECKLIST

### Test 3C Content Library:

- [ ] Navigate to `library.3ccontentlibrary.com`
- [ ] Admin page loads: `/admin.html`
- [ ] Can connect to Supabase
- [ ] Can view existing folders
- [ ] Can view existing content
- [ ] PDF viewer works
- [ ] Images load from R2

### Test Interactive PDF Builder:

- [ ] Navigate to `builder.3ccontentlibrary.com`
- [ ] Interface loads properly
- [ ] Can upload background image
- [ ] Drag & drop works
- [ ] Can export JSON
- [ ] Health check passes

---

## 🐛 TROUBLESHOOTING

### "Site not loading" / "404 Error"

**Solution:**
1. Check Deployments tab - did it build successfully?
2. Look for error messages in build logs
3. Verify branch name is correct (main vs master)

### "Supabase won't connect"

**Solution:**
1. Check environment variables are set correctly
2. Go to Pages project → Settings → Environment variables
3. Make sure they're set for "Production" environment
4. Redeploy: Deployments → three dots → Retry deployment

### "R2 images not loading"

**Solution:**
1. Check R2_PUBLIC_URL is correct
2. Verify R2 bucket is public (or has correct CORS settings)
3. Test URL directly in browser

### "Custom domain not working"

**Solution:**
1. Wait 10-15 minutes for SSL certificate
2. Check DNS settings in Cloudflare → DNS
3. Make sure there's a CNAME record pointing to your Pages project
4. Clear browser cache and try again

### "Changes not showing up"

**Solution:**
1. Make sure you pushed to GitHub: `git push`
2. Check Deployments tab - new deployment should appear
3. Wait 30-60 seconds for build
4. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## 📱 MANAGING DEPLOYMENTS

### View Deployment Status

1. Go to Pages project
2. Click **Deployments** tab
3. See list of all deployments
4. Click any deployment to see:
   - Build logs
   - Deployment time
   - Git commit that triggered it
   - Preview URL

### Rollback to Previous Version

1. Go to **Deployments** tab
2. Find the working deployment
3. Click three dots (⋮) → **Rollback to this deployment**
4. Confirm
5. Site instantly reverts to that version!

### Preview Deployments (Branches)

Cloudflare automatically creates preview URLs for all branches:

```
main branch → library.3ccontentlibrary.com (production)
dev branch → dev.3c-content-library.pages.dev (preview)
feature-xyz → feature-xyz.3c-content-library.pages.dev (preview)
```

**Test features safely before merging to main!**

---

## 🔐 SECURITY BEST PRACTICES

### Environment Variables

- ✅ DO: Store sensitive keys in Cloudflare environment variables
- ❌ DON'T: Commit API keys to GitHub
- ✅ DO: Use `import.meta.env.VARIABLE_NAME` in code
- ❌ DON'T: Hardcode credentials in config.js

### API Keys

- ✅ DO: Keep R2 secret access key in environment variables only
- ❌ DON'T: Share secret keys in public repos
- ✅ DO: Use different keys for dev/production
- ❌ DON'T: Use production keys in test environments

### CORS Settings

If you have CORS issues with R2:

1. Go to Cloudflare R2 → Your bucket → Settings
2. Add CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "https://library.3ccontentlibrary.com",
      "https://builder.3ccontentlibrary.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 🎉 SUCCESS CHECKLIST

After deployment, you should have:

- ✅ 3C Content Library live at custom domain
- ✅ Interactive PDF Builder live at custom domain  
- ✅ Both connected to Supabase
- ✅ Both connected to Cloudflare R2
- ✅ Auto-deployment from GitHub working
- ✅ SSL certificates active (green padlock in browser)
- ✅ Can create folders and content
- ✅ Can view PDFs
- ✅ Can build interactive PDFs

---

## 🚨 MIGRATING FROM VERCEL

### Step 1: Verify Everything Works on Cloudflare

Before deleting Vercel:
1. Test ALL functionality on Cloudflare
2. Make sure existing PDFs load
3. Verify admin functions work
4. Test PDF viewer

### Step 2: Update Shared Links (The 18 PDFs)

**Option A: Use Custom Domain (Recommended)**

Your PDFs are at: `library.3ccontentlibrary.com/view/[id]`

Since you're using a custom domain, URLs can stay the same! Just:
1. Keep old Vercel URL format
2. Point DNS to Cloudflare instead of Vercel
3. URLs never break! ✅

**Option B: Redirect from Vercel**

1. Keep Vercel project active for 30 days
2. Add `vercel.json` redirect rules:

```json
{
  "redirects": [
    {
      "source": "/view/:id",
      "destination": "https://library.3ccontentlibrary.com/view/:id",
      "permanent": true
    }
  ]
}
```

3. Old links auto-redirect to new Cloudflare URLs
4. After 30 days, delete Vercel

### Step 3: Delete Vercel Project

Once confident everything works:

1. Go to Vercel Dashboard
2. Select your project
3. Settings → General → Delete Project
4. Confirm deletion
5. **Save $20/month!** 💰

---

## 📊 MONITORING & ANALYTICS

### Cloudflare Web Analytics (Free!)

1. Go to **Analytics & Logs** in Cloudflare
2. Enable Web Analytics for your Pages projects
3. Get insights on:
   - Page views
   - Visitor locations
   - Performance metrics
   - Bandwidth usage

### Custom Domain Analytics

For more detailed analytics:
1. Add Google Analytics
2. Or use Cloudflare's built-in analytics
3. Track user behavior, popular content, etc.

---

## 🆘 NEED HELP?

### Where to Look:

1. **Build Logs:** Pages project → Deployments → Click deployment → View logs
2. **Browser Console:** F12 → Console tab (see JavaScript errors)
3. **Network Tab:** F12 → Network tab (see failed requests)
4. **Cloudflare Status:** https://www.cloudflarestatus.com/

### Common Issues & Solutions:

| Issue | Solution |
|-------|----------|
| 404 on custom domain | Wait 15 min for DNS propagation |
| Environment vars not working | Set for "Production", then redeploy |
| CORS errors | Check R2 bucket CORS settings |
| Build failing | Check build logs for error messages |
| Supabase timeout | Verify URL/key are correct |

---

## 🎯 NEXT STEPS

After successful deployment:

1. ✅ Update any hardcoded URLs in your code
2. ✅ Test all features thoroughly
3. ✅ Update shared PDF links (if needed)
4. ✅ Delete Vercel project (after testing period)
5. ✅ Celebrate! You're on Cloudflare! 🎉

---

## 📞 SUPPORT CONTACTS

- **Cloudflare Community:** https://community.cloudflare.com/
- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **GitHub Actions:** For auto-deployment issues

---

**Built with ❤️ for Chef Anabela's Cooking Lab** 🧪👨‍🍳

**Ready to deploy? Start with Project 1 (3C Content Library) and work through the steps!**

**Each deployment takes about 15 minutes. You'll be live in under an hour!** 🚀
