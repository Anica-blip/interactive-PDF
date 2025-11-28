# 3C Migration Tool - PDF Migration to R2

**One-click migration tool** to move your PDFs from Supabase base64 storage to Cloudflare R2.

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Create GitHub Repo**

1. Create new repo: `3c-migration-tool` (can be private)
2. Upload these files:
   - `index.html`
   - `functions/api/migrate.js`
   - `wrangler.toml`
   - `README.md`

**Or using command line:**
```bash
git init
git add .
git commit -m "Initial migration tool"
git branch -M main
git remote add origin https://github.com/Anica-blip/3c-migration-tool.git
git push -u origin main
```

### **Step 2: Deploy to Cloudflare Pages**

1. **Go to:** Cloudflare Dashboard → Workers & Pages
2. **Click:** Create Application → Pages → Connect to Git
3. **Select:** `Anica-blip/3c-migration-tool`
4. **Project name:** `3c-migration-tool`
5. **Build settings:**
   - Framework preset: **None**
   - Build command: **(leave empty)**
   - Build output directory: **/** 
6. **Click:** Save and Deploy

### **Step 3: Configure Environment & R2 Binding**

#### **A) Add Environment Variables:**

In your Cloudflare Pages project:
1. Go to: **Settings** → **Environment variables**
2. **Add these variables** (Production):

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_KEY = your-service-role-key
R2_PUBLIC_URL = https://files.3c-public-library.org
```

**Where to find them:**
- **Supabase:** Dashboard → Settings → API
  - Copy `URL` → SUPABASE_URL
  - Copy `service_role` key (NOT anon) → SUPABASE_SERVICE_KEY
- **R2 Public URL:** Already set in your custom domain

#### **B) Configure R2 Binding:**

1. In your Pages project, go to: **Settings** → **Functions**
2. Scroll to: **R2 bucket bindings**
3. **Add binding:**
   - Variable name: `R2_BUCKET`
   - R2 bucket: `3c-library-files`
4. **Click:** Save

#### **C) Redeploy:**

After adding environment variables and R2 binding:
1. Go to: **Deployments** tab
2. Click: **•••** on latest deployment
3. Click: **Retry deployment**

---

## ✅ **Step 4: Run Migration**

### **Visit Your Migration Tool:**

**URL:** `https://3c-migration-tool.pages.dev`

Or add custom domain: `migration.3c-public-library.org`

### **A) Test First (Recommended):**

1. Click **"🧪 Test Run"** button
2. Watch progress (no changes made)
3. Review results

### **B) Run Migration:**

1. Click **"✨ Start Migration"** button
2. Confirm
3. Watch real-time progress
4. Get results report

**Total time: ~15 minutes for 19 PDFs**

---

## 📊 What This Does

### **BEFORE:**
- PDFs: Stored as base64 in Supabase
- Size: ~6.65 MB per 5MB PDF (33% overhead)
- Upload: 30-60 seconds
- Database: ~120 MB used

### **AFTER:**
- PDFs: Stored in R2 at `https://files.3c-public-library.org/pdfs/`
- Size: ~60 bytes per PDF (just URL in database)
- Upload: 3-5 seconds (10-20x faster)
- Database: ~1 KB used
- **Space saved: 99%**

---

## 🎯 Features

✅ **Real-time progress tracking** - See exactly what's happening  
✅ **Test mode** - Dry-run before actual migration  
✅ **Error handling** - Skips broken files, continues migration  
✅ **Streaming updates** - Live logs as it migrates  
✅ **Complete report** - Shows success/failure count, space saved  
✅ **Safe** - Won't break existing apps (Vercel + Cloudflare both work)  

---

## 🛡️ Safety

### **Migration is Safe Because:**

1. **Both apps read from same Supabase**
2. **R2 URLs are public** (no auth needed to view)
3. **Works instantly** after migration
4. **No downtime**
5. **Test mode available**

### **After Migration:**

**Your 3C Content Library (Cloudflare):**
- Reads Supabase → Gets R2 URL → Loads PDF ✅

**Your 3C Content Library (Vercel, if still running):**
- Reads Supabase → Gets R2 URL → Loads PDF ✅

**Both work identically!**

---

## 📁 File Structure

```
3c-migration-tool/
├── index.html                  ← UI with migration button
├── functions/
│   └── api/
│       └── migrate.js          ← Migration logic
├── wrangler.toml               ← Cloudflare config
└── README.md                   ← This file
```

---

## 🔧 Troubleshooting

### **Problem: "Missing environment variables"**

**Solution:**
- Check Settings → Environment variables
- Make sure you added all 3 variables
- Redeploy after adding

### **Problem: "R2_BUCKET is not defined"**

**Solution:**
- Go to Settings → Functions
- Add R2 bucket binding: `R2_BUCKET` → `3c-library-files`
- Redeploy

### **Problem: "Unauthorized" error**

**Solution:**
- You're using the `anon` key instead of `service_role` key
- Get service role key from Supabase Settings → API
- Update SUPABASE_SERVICE_KEY
- Redeploy

### **Problem: Migration is slow**

**Expected:**
- ~2-4 seconds per PDF
- ~15-20 minutes for 19 PDFs

**If much slower:**
- Check internet connection
- Cloudflare has global edge network (very fast)

### **Problem: Test Run works but Live Migration fails**

**Solution:**
- Check R2 binding is configured
- Verify service role key has write permissions
- Check Cloudflare Functions logs in dashboard

---

## 🎉 After Migration

### **Verify Everything Works:**

1. **Check R2 bucket:**
   - Go to R2 dashboard
   - Open `3c-library-files`
   - Should see `pdfs/` and `thumbnails/` folders

2. **Check Supabase:**
   ```sql
   SELECT id, title, url 
   FROM content_public 
   WHERE type = 'pdf' 
   LIMIT 3;
   ```
   - URLs should be: `https://files.3c-public-library.org/pdfs/...`

3. **Test your apps:**
   - Visit `https://3c-public-library.org`
   - Click a PDF
   - Should load instantly from R2

4. **Test Vercel (if still running):**
   - Visit your Vercel URL
   - Click a PDF
   - Should also work from R2

### **Space Freed:**

Check your Supabase dashboard:
- Database size should drop by ~120 MB
- From ~120 MB → ~1 KB for PDF storage

---

## 📋 Custom Domain (Optional)

**Want a custom URL like `migration.3c-public-library.org`?**

1. In your Pages project: Custom domains → Add domain
2. Enter: `migration.3c-public-library.org`
3. Cloudflare auto-configures DNS
4. Wait 5-10 minutes

**Then visit:** `https://migration.3c-public-library.org`

---

## 🗑️ After Migration (Cleanup)

**Optional - You can keep or delete:**

### **Keep It:**
- Useful for future migrations
- Can run again if needed
- Takes minimal resources (just a Pages site)

### **Delete It:**
1. Cloudflare Dashboard → Workers & Pages
2. Find `3c-migration-tool`
3. Settings → Delete
4. Also delete GitHub repo if you want

**Recommendation:** Keep it! Doesn't cost anything and might be useful later.

---

## 🆘 Need Help?

**If migration fails or you see errors:**

1. Check Cloudflare Functions logs:
   - Pages project → Functions → Logs
2. Check browser console (F12)
3. Take screenshot of error
4. Share with Claude

---

## 📈 Expected Results

**For 19 PDFs (~5MB each):**

```
Total Records:     19
Successful:        19 ✅
Failed:            0 ❌
PDFs Migrated:     19
Thumbnails:        19

Storage:
  Old Size:        ~125 MB
  New Size:        ~1 KB
  Space Saved:     124.99 MB (99%)

Duration:          ~15-20 minutes
```

---

## ✅ Deployment Checklist

- [ ] Created GitHub repo `3c-migration-tool`
- [ ] Pushed all files to GitHub
- [ ] Connected to Cloudflare Pages
- [ ] Added environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY, R2_PUBLIC_URL)
- [ ] Configured R2 binding (R2_BUCKET → 3c-library-files)
- [ ] Redeployed after configuration
- [ ] Ran Test Run successfully
- [ ] Ready to run Live Migration

---

## 🎯 Summary

**This tool:**
- ✅ Simple one-click migration
- ✅ Real-time progress tracking
- ✅ Test mode available
- ✅ Safe (doesn't break anything)
- ✅ Fast (15-20 minutes)
- ✅ Saves 99% database space

**Your job:**
1. Push to GitHub
2. Connect to Cloudflare Pages
3. Add environment variables + R2 binding
4. Click button

**That's it!** 🚀

---

**Created by:** The Crazy Chef & Claude  
**Date:** November 27, 2025  
**Version:** 1.0.0
