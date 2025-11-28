# 🚀 Vercel to Cloudflare R2 Migration Guide

## Problem
- Old PDFs hosted on Vercel: `https://your-app.vercel.app/pdfs/file.pdf`
- New PDFs on Cloudflare R2: `https://files.3c-public-library.org/pdfs/file.pdf`
- Database has old Vercel URLs
- Need seamless transition without breaking links

## ✅ Solution: Automatic Redirects

### Option 1: Vercel Redirects (RECOMMENDED - Zero Database Changes)

**What it does:**
- Old Vercel URLs automatically redirect to Cloudflare
- No database updates needed
- No broken links
- Works immediately

**Setup:**

1. **Deploy `vercel.json` to your Vercel project**
   ```bash
   # Already created in your repo
   git add vercel.json
   git commit -m "Add Vercel to Cloudflare redirects"
   git push
   ```

2. **Vercel will automatically apply redirects**
   - All `/pdfs/*` → Cloudflare R2
   - All `/thumbnails/*` → Cloudflare R2
   - All `/media/*` → Cloudflare R2
   - Permanent 301 redirects (SEO-friendly)

3. **Test it:**
   ```
   Old URL: https://your-app.vercel.app/pdfs/document.pdf
   → Automatically redirects to →
   New URL: https://files.3c-public-library.org/pdfs/document.pdf
   ```

**Benefits:**
✅ No database changes needed
✅ Old links keep working
✅ Gradual migration possible
✅ Zero downtime
✅ SEO-friendly (301 redirects)

---

### Option 2: Database URL Replacement (If you want clean URLs)

**When to use:**
- After redirects are working
- When you have time
- For cleaner database

**SQL Script:**

```sql
-- Update PDFs table
UPDATE pdfs 
SET url = REPLACE(url, 'https://your-app.vercel.app', 'https://files.3c-public-library.org')
WHERE url LIKE 'https://your-app.vercel.app%';

-- Update thumbnails
UPDATE pdfs 
SET thumbnail_url = REPLACE(thumbnail_url, 'https://your-app.vercel.app', 'https://files.3c-public-library.org')
WHERE thumbnail_url LIKE 'https://your-app.vercel.app%';

-- Update any other tables with file URLs
UPDATE media_files 
SET file_url = REPLACE(file_url, 'https://your-app.vercel.app', 'https://files.3c-public-library.org')
WHERE file_url LIKE 'https://your-app.vercel.app%';

-- Verify changes
SELECT url FROM pdfs WHERE url LIKE '%vercel.app%';
-- Should return 0 rows
```

---

## 🎯 Migration Strategy

### Phase 1: Setup Redirects (NOW - 5 minutes)

```bash
1. Deploy vercel.json
2. Test old URLs
3. Confirm redirects work
```

**Result:** All old links work immediately via redirect

---

### Phase 2: Upload Remaining Files (Your current work)

```bash
1. Upload remaining 4 PDFs to Cloudflare R2
2. Upload thumbnails
3. Test new URLs
```

**Result:** All files on Cloudflare R2

---

### Phase 3: Update Database (OPTIONAL - Later)

```bash
1. Run SQL replacement script
2. Verify all URLs updated
3. Test application
```

**Result:** Clean URLs in database

---

### Phase 4: Cleanup (OPTIONAL - Much later)

```bash
1. Remove old files from Vercel
2. Keep vercel.json for safety
```

**Result:** Only Cloudflare R2 in use

---

## 🔧 Supabase Upload Speed Fix

### Problem: Supabase uploader too slow

### Solution: Upload directly to Cloudflare R2

**Use the Worker API instead:**

```javascript
// Instead of uploading through Supabase
// Upload directly to Worker → R2

async function uploadToR2(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'pdfs');
  
  const response = await fetch('https://builder.3c-public-library.org/api/upload-media', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.url; // Cloudflare R2 URL
}
```

**Benefits:**
✅ Direct to R2 (fast!)
✅ No Supabase bottleneck
✅ Uses your Worker
✅ Automatic public URL

---

## 📊 Migration Checklist

### Immediate (5 minutes):
- [ ] Deploy `vercel.json` to Vercel
- [ ] Test old URL redirects
- [ ] Confirm redirects work

### This Week:
- [ ] Upload remaining 4 PDFs to R2
- [ ] Upload all thumbnails to R2
- [ ] Test new URLs in application

### Optional (When you have time):
- [ ] Run database URL replacement
- [ ] Verify all URLs updated
- [ ] Remove old Vercel files

---

## 🎯 Quick Commands

### Deploy Redirects:
```bash
cd /home/acer/CascadeProjects/interactive-PDF-main
git add vercel.json
git commit -m "Add Vercel to Cloudflare redirects"
git push

# Vercel auto-deploys
# Redirects active in ~2 minutes
```

### Test Redirects:
```bash
# Try an old URL in browser
# Should redirect to Cloudflare R2
```

### Upload to R2 via Worker:
```bash
# Use the upload form at:
# https://builder.3c-public-library.org

# Or use API:
curl -X POST https://builder.3c-public-library.org/api/upload-media \
  -F "file=@document.pdf" \
  -F "folder=pdfs"
```

---

## 💡 Pro Tips

1. **Keep Vercel redirects forever**
   - They're free
   - Ensure old links never break
   - Good for SEO

2. **Upload new files directly to R2**
   - Faster
   - No Supabase bottleneck
   - Use Worker API

3. **Update database gradually**
   - No rush
   - Redirects handle old URLs
   - Do it when convenient

4. **Test before cleanup**
   - Verify all redirects work
   - Check all pages load
   - Confirm no broken links

---

## 🚨 Troubleshooting

### Redirect not working?
```bash
# Check vercel.json deployed
# Check Vercel dashboard → Settings → Redirects
# Clear browser cache
# Try incognito mode
```

### Upload still slow?
```bash
# Use Worker API directly
# Don't go through Supabase
# Upload to R2 via Worker
```

### Old URLs in database?
```bash
# Don't worry!
# Redirects handle them
# Update database later
```

---

## ✅ Summary

**Immediate Fix:**
- Deploy `vercel.json` → Old URLs redirect automatically
- No database changes needed
- Zero downtime

**Long-term:**
- Upload directly to R2 (faster)
- Update database URLs (optional)
- Remove old Vercel files (optional)

**Result:**
- All links work
- Fast uploads
- Clean migration
- Happy users! 🎉
