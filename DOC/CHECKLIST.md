# ✅ PRE-MIGRATION CHECKLIST

**Complete this checklist BEFORE clicking "Start Migration"**

Print this out or keep it open while deploying!

---

## 📋 **PART 1: GitHub Setup**

- [ ] Created new GitHub repo: `3c-migration-tool`
- [ ] Uploaded all files:
  - [ ] index.html
  - [ ] wrangler.toml
  - [ ] README.md
  - [ ] DEPLOYMENT-GUIDE.md
  - [ ] START-HERE.md
  - [ ] .gitignore
  - [ ] functions/api/migrate.js
- [ ] Repo is accessible at: `https://github.com/Anica-blip/3c-migration-tool`

---

## 📋 **PART 2: Cloudflare Pages Deployment**

- [ ] Connected repo to Cloudflare Pages
- [ ] Project name: `3c-migration-tool`
- [ ] Build settings configured:
  - [ ] Framework preset: None
  - [ ] Build command: (empty)
  - [ ] Build output directory: /
- [ ] Initial deployment successful
- [ ] Got URL: `https://3c-migration-tool.pages.dev`

---

## 📋 **PART 3: Environment Variables**

Go to: Settings → Environment variables

- [ ] **SUPABASE_URL** added
  - Value looks like: `https://abcd1234.supabase.co`
  - Environment: Production ✅
  
- [ ] **SUPABASE_SERVICE_KEY** added
  - Value is the **service_role** key (NOT anon!)
  - Starts with: `eyJhbGci...`
  - Environment: Production ✅
  
- [ ] **R2_PUBLIC_URL** added
  - Value: `https://files.3c-public-library.org`
  - Environment: Production ✅

---

## 📋 **PART 4: R2 Bucket Binding**

Go to: Settings → Functions → R2 bucket bindings

- [ ] R2 binding added:
  - Variable name: `R2_BUCKET`
  - R2 bucket: `3c-library-files`
  - Shows as configured ✅

---

## 📋 **PART 5: Redeployment**

Go to: Deployments tab

- [ ] Redeployed after adding environment variables
- [ ] Latest deployment shows "Success" status
- [ ] Deployment includes all environment variables

---

## 📋 **PART 6: Pre-Flight Test**

Visit: `https://3c-migration-tool.pages.dev`

- [ ] Page loads successfully (purple gradient)
- [ ] Shows title: "3C PDF Migration to R2"
- [ ] Shows info box with 5 checkmarks
- [ ] Two buttons visible:
  - [ ] 🧪 Test Run button
  - [ ] ✨ Start Migration button
- [ ] No error messages showing

---

## 📋 **PART 7: Test Run**

Click: 🧪 Test Run button

- [ ] Progress bar appears
- [ ] Shows: "Connecting to Supabase..."
- [ ] Shows: "Found 19 PDFs to migrate"
- [ ] Progress updates in real-time
- [ ] Shows individual PDF names
- [ ] Completes with 100%
- [ ] Shows results summary:
  - [ ] Total: 19
  - [ ] Successful: 19
  - [ ] Space Saved: ~125 MB

**If Test Run FAILS:**
- Check environment variables are correct
- Verify service_role key (not anon key)
- Check R2 binding is configured
- Look at error messages in the log
- Fix issues before proceeding

**If Test Run SUCCEEDS:**
- ✅ Ready for live migration!

---

## 📋 **PART 8: Supabase Verification**

Before migration, verify your data:

Go to: Supabase → SQL Editor

Run this query:
```sql
SELECT COUNT(*) as total, 
       SUM(LENGTH(url)) as total_size
FROM content_public 
WHERE type = 'pdf';
```

Record the results:
- [ ] Total PDFs: _____ (should be 19)
- [ ] Total size: _____ MB (should be ~125 MB)

---

## 📋 **PART 9: R2 Bucket Verification**

Before migration, check R2:

Go to: Cloudflare Dashboard → R2 → 3c-library-files

- [ ] Bucket exists
- [ ] Bucket is empty (or has previous files)
- [ ] Bucket public URL works: `https://files.3c-public-library.org`

---

## 📋 **PART 10: Final Checks**

- [ ] You have Supabase access (can login)
- [ ] You have Cloudflare access (can login)
- [ ] You're ready to commit to migration
- [ ] You understand migration takes ~15 minutes
- [ ] You're OK with updating 19 PDF URLs in Supabase
- [ ] Both 3c-public-library.org AND Vercel will still work after

---

## 🎯 **ALL CHECKS PASSED?**

### **✅ YES - Ready to Migrate!**

Go to: `https://3c-migration-tool.pages.dev`

1. Click: ✨ Start Migration
2. Confirm: OK
3. Wait: ~15 minutes
4. Celebrate: 🎉

### **❌ NO - Fix Issues First**

**Common issues:**

1. **Environment variables missing**
   - Go back to Part 3
   - Add missing variables
   - Redeploy (Part 5)

2. **R2 binding not configured**
   - Go back to Part 4
   - Add R2 binding
   - Redeploy (Part 5)

3. **Test Run failed**
   - Check error messages
   - Most common: wrong Supabase key
   - Use service_role key, not anon key

4. **Page doesn't load**
   - Check deployment status
   - Look at Functions logs
   - Verify all files uploaded to GitHub

---

## 📞 **NEED HELP?**

**If any checkbox fails:**

1. Read the relevant section in DEPLOYMENT-GUIDE.md
2. Check Troubleshooting section in README.md
3. Take screenshot of error
4. Ask Claude for help

---

## ✅ **AFTER MIGRATION CHECKLIST**

Once migration completes, verify:

- [ ] R2 bucket has `pdfs/` folder (19 files)
- [ ] R2 bucket has `thumbnails/` folder (19 files)
- [ ] Supabase URLs changed to R2 URLs
- [ ] `3c-public-library.org` loads PDFs correctly
- [ ] Vercel site (if running) loads PDFs correctly
- [ ] No broken images or PDFs
- [ ] Database size reduced (check Supabase dashboard)

---

**Print this checklist and check off items as you complete them!**

**Good luck, Chef!** 🚀
