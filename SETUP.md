# Setup Guide - Interactive PDF Builder

## 🌐 Infrastructure Overview

### Deployment Architecture

This app uses **two-part deployment** to Cloudflare:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE INFRASTRUCTURE                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. WORKER (Backend API)                                    │
│     • Domain: api.3c-public-library.org/pdf/*               │
│     • Deploys: worker.js                                     │
│     • Method: GitHub Actions                                 │
│     • Bindings: R2 Bucket, Environment Variables            │
│                                                              │
│  2. PAGES (Frontend)                                         │
│     • Domain: builder.3c-public-library.org                 │
│     • Deploys: public/ folder                                │
│     • Method: Cloudflare Direct Git                          │
│     • Auto-deploys on every push to main                     │
│                                                              │
│  3. R2 STORAGE                                               │
│     • Domain: files.3c-public-library.org                   │
│     • Stores: PDFs, media files, user uploads               │
│     • Bucket: 3c-library-files                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Cloudflare Setup

### Worker Deployment (Backend API)

**Deploys via:** GitHub Actions (`.github/workflows/cloudflare-worker.yml`)

**Configuration:**
- File: `wrangler.toml`
- Route: `api.3c-public-library.org/pdf/*`
- Bindings: R2 bucket (`3c-library-files`), environment variables

**GitHub Secrets Required:**
```
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

**How it works:**
```
git push → GitHub Actions → wrangler deploy → Cloudflare Worker
```

---

### Pages Deployment (Frontend)

**⚠️ IMPORTANT: Cloudflare Direct Git auto-deployment is UNRELIABLE**

**Use Wrangler CLI for deployment instead:**

```bash
npx wrangler pages deploy public --project-name=interactive-pdf
```

**Why CLI deployment:**
- Cloudflare's GitHub auto-deployment often fails to pick up changes
- Direct CLI deployment ensures immediate updates
- Same method used successfully for 3c-content-library project

**Configuration:**
- **Project name:** `interactive-pdf` (NOT "builder")
- **Production branch:** `main`
- **Build directory:** `public`
- **Build command:** (empty)
- **Framework:** None

**Custom Domain:**
- Domain: `builder.3c-public-library.org`
- Cloudflare handles SSL automatically

**Deployment workflow:**
```bash
# 1. Make code changes
# 2. Deploy directly via Wrangler CLI
npx wrangler pages deploy public --project-name=interactive-pdf

# 3. Verify deployment
curl -s "https://builder.3c-public-library.org/flipbook.js" | head -n 5

# 4. Hard refresh browser (Ctrl+Shift+R)
```

**To check existing projects:**
```bash
npx wrangler pages project list
```

---

### R2 Storage Setup

**Bucket Configuration:**
- **Bucket name:** `3c-library-files`
- **Public access:** Enabled via custom domain
- **Domain:** `files.3c-public-library.org`

**Folder Structure:**
```
3c-library-files/
├── interactive-pdfs/
│   ├── flipbooks/
│   │   ├── [project-name]/
│   │   │   ├── [pdf-name]-v1.0.pdf
│   │   │   ├── [pdf-name]-v1.1.pdf
│   │   │   └── manifest.json
│   └── media/
│       ├── images/
│       ├── videos/
│       └── audio/
```

**Worker Bindings:**
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "3c-library-files"
```

---

## 💾 Supabase Setup

### Database Connection

**Project:** 3C Public Library Interactive PDFs

**Tables:**
```sql
-- Main table for storing PDF projects
pdfs (
  id, user_id, title, status, pdf_url, 
  manifest_url, created_at, updated_at
)

-- Table for tracking versions
pdf_versions (
  id, pdf_id, version, pdf_url, 
  manifest_url, created_at
)
```

**Environment Variables:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Schema File:** `supabase-schema.sql`

**How to Apply:**
1. Supabase Dashboard → SQL Editor
2. Paste contents of `supabase-schema.sql`
3. Run query

---

## 🔗 Domain Structure

### Production URLs

| Service | Domain | Purpose |
|---------|--------|---------|
| **Frontend (Pages)** | `builder.3c-public-library.org` | PDF builder interface |
| **Backend (Worker)** | `api.3c-public-library.org/pdf/*` | API endpoints |
| **Storage (R2)** | `files.3c-public-library.org` | File storage & delivery |
| **Viewer** | `builder.3c-public-library.org/viewer.html` | PDF viewer with hotspots |

### API Endpoints

**Base URL:** `https://api.3c-public-library.org/pdf`

```
GET  /api/health                    - Health check
POST /api/generate-pdf-multipage    - Generate PDF
POST /api/upload-media              - Upload to R2
POST /api/upload-stream             - Upload video to Cloudflare Stream
GET  /api/pdfs                      - List PDFs (Supabase)
POST /api/pdfs                      - Create PDF record (Supabase)
```

---

## 🚀 Making Changes & Deployment

### Standard Workflow

```bash
# 1. Make changes to code
vim public/app.js

# 2. Commit changes
git add .
git commit -m "Description of changes"

# 3. Push to GitHub
git push origin main

# 4. Wait 1-3 minutes for deployment
# - Worker: GitHub Actions deploys automatically
# - Pages: Cloudflare auto-deploys public/ folder

# 5. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# 6. Test changes on live site
```

### Deployment Status

**Check Worker Deployment:**
- GitHub → Actions tab → Latest workflow run
- Look for: "Deployed interactive-pdf-api triggers"

**Check Pages Deployment:**
- Cloudflare Dashboard → Workers & Pages → builder → Deployments
- Look for: "Success: Your site was deployed!"

---

## ⚠️ Important Notes

### Latest Update (January 5, 2026)

**Fixed: Custom 3C Button/Emoji Image Display**
- **Issue:** Custom uploaded buttons/emojis (via "Upload Custom 3C Assets") were not displaying images in editor or flipbook viewer
- **Root Cause:** Element rendering code only checked for predefined types (`'3c-button'`, `'3c-emoji'`, `'3c-emoji-decoration'`) but not custom types (`'3c-custom'`, `'3c-custom-decoration'`)
- **Solution:** Added support for custom 3C types in:
  - `app.js` - Editor element rendering (`createElementDiv` function)
  - `app.js` - Asset library rendering
  - `app.js` - Type labels and icons mapping
  - `flipbook.js` - Viewer element rendering
- **Result:** Custom uploaded images now display correctly with full functionality (image display, URL linking, hover effects)

**How it works:**
- Upload custom button/emoji → Creates asset with type `'3c-custom'` or `'3c-custom-decoration'`
- Asset stores image as base64 data URL in `imagePath` property
- Rendering code now checks for both predefined AND custom types
- Images display in editor, asset library, and flipbook viewer
- URL functionality works identically to predefined 3C buttons

### Previous Update (December 2, 2025)

**Fixed:**
- Element dragging now works in all directions (removed constraints)
- Reduced page spacing from 10px to 5px
- Fixed preview modal overflow issue

**Deployment is working correctly:**
- Both Worker and Pages deploy automatically on push
- If logs say "Success" → deployment is fine
- If feature doesn't work → it's a code bug, not deployment

### Don't Touch These (They Work)

✅ Cloudflare Pages Direct Git connection  
✅ GitHub Actions worker deployment  
✅ Wrangler configuration files  
✅ GitHub Secrets  
✅ Build settings (empty for Pages)  

### Troubleshooting

**"My changes aren't showing up":**
1. Check Cloudflare deployment logs - says "Success"?
2. Hard refresh browser (Ctrl+Shift+R)
3. Test in incognito/private window
4. Check browser console for errors

**"Something doesn't work":**
1. If deployment succeeded → it's a code bug
2. Check browser console for JavaScript errors
3. Fix the code, commit, and push again
4. Don't waste time troubleshooting deployment

---

## 📝 Configuration Files

### wrangler.toml (Worker)
```toml
name = "interactive-pdf-api"
main = "worker.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "3c-library-files"

[vars]
R2_PUBLIC_URL = "https://files.3c-public-library.org"
ENVIRONMENT = "production"
```

### wrangler-pages.toml (Pages)
```toml
name = "interactive-pdf"
pages_build_output_dir = "public"
compatibility_date = "2024-01-01"

[vars]
R2_PUBLIC_URL = "https://files.3c-public-library.org"
```

---

## 🎯 Quick Reference

**To deploy changes:**
```bash
git push origin main
```

**To check deployment:**
- Worker: GitHub Actions tab
- Pages: Cloudflare Dashboard

**To test:**
- Clear cache and hard refresh
- Test in incognito window

**Deployment takes:** 1-3 minutes

---

**Last Updated:** January 5, 2026
