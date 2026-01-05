# Supabase Quick Start - 5 Minutes Setup

## 🚀 Fast Track Setup

### 1️⃣ Create Supabase Project (2 min)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `Interactive PDF Builder`
3. Choose region → **Create**
4. Wait for setup to complete

### 2️⃣ Run SQL Setup (1 min)

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy entire contents of `supabase-owner-access.sql`
3. Paste and click **Run**
4. Should see: `Success. No rows returned`

### 3️⃣ Deploy Edge Function (1 min)

1. Supabase Dashboard → **Edge Functions** → **Create new function**
2. Name: `pdf_projects`
3. Copy contents from `supabase functions/index.ts`
4. Paste and click **Deploy**

### 4️⃣ Configure App (1 min)

1. Open: `https://builder.3c-public-library.org`
2. Click the **yellow dot** (top-right)
3. Get your keys from Supabase Dashboard → **Settings** → **API**:
   - Copy **Project URL**
   - Copy **anon public** key
   - Copy **service_role** key (optional)
4. Paste into the modal form
5. Click **Test** → Should show ✅ Connection successful
6. Click **Save & Download**
7. Replace `public/config.js` with downloaded file
8. Commit and push:
   ```bash
   git add public/config.js
   git commit -m "Configure Supabase connection"
   git push origin main
   ```
9. Wait 2-3 minutes for Cloudflare deployment
10. Hard refresh (Ctrl+Shift+R)
11. Yellow dot should turn **green** ✅

---

## ✅ Verification

**Check Status Indicator:**
- 🟢 Green = Connected (you're done!)
- 🟡 Yellow = Not configured (follow step 4 again)
- 🔴 Red = Error (see troubleshooting below)

**Test Functionality:**
1. Create a simple page
2. Click **Save** button
3. Check browser console (F12) - should see: `Draft saved to Supabase`
4. Go to Supabase Dashboard → **Table Editor** → `pdf_projects`
5. Your project should be there!

---

## 🔧 Troubleshooting

### Yellow Dot Won't Turn Green

1. Check `public/config.js` has your actual keys (not placeholders)
2. Make sure you pushed to GitHub
3. Wait full 3 minutes for Cloudflare deployment
4. Hard refresh browser (Ctrl+Shift+R)
5. Check browser console for errors

### Red Dot - Connection Error

1. Verify API keys are correct (no extra spaces)
2. Check Supabase project is active (not paused)
3. Re-run `supabase-owner-access.sql` script
4. Check Edge Function is deployed
5. Try using service_role key instead of anon key

### "Failed to save draft"

1. Check RLS policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'pdf_projects';
   ```
   Should show 3 policies

2. Check table exists:
   ```sql
   SELECT * FROM pdf_projects LIMIT 1;
   ```

3. Check browser console for detailed error

---

## 📚 Full Documentation

For detailed setup, troubleshooting, and advanced features:
- **`SUPABASE-SETUP-GUIDE.md`** - Complete guide with explanations
- **`supabase-owner-access.sql`** - SQL script with comments
- **`SETUP.md`** - Overall project setup

---

## 🎯 What You Get

✅ **Auto-save** - Drafts saved every 15 seconds  
✅ **Manual save** - Click "Save" button anytime  
✅ **Project management** - All projects stored in Supabase  
✅ **Version control** - Track PDF versions  
✅ **Never locked out** - Domain-based access guaranteed  
✅ **Secure** - RLS policies protect your data  
✅ **Export** - Download JSON for 3C Library  

---

## 💡 Pro Tips

1. **Use anon key for daily work** - It's safe and works great
2. **Keep service key secret** - Only use for admin operations
3. **Export JSON regularly** - Backup your work
4. **Check Supabase Dashboard** - Monitor usage and data
5. **Hard refresh after changes** - Ctrl+Shift+R to clear cache

---

## 🆘 Need Help?

1. Check browser console (F12) for errors
2. Check Supabase Dashboard logs
3. Review `SUPABASE-SETUP-GUIDE.md` for detailed troubleshooting
4. Verify all 4 setup steps completed successfully

---

**Setup Time:** ~5 minutes  
**Difficulty:** Easy  
**Cost:** Free (Supabase free tier)  

🎉 **You're all set! Start building interactive PDFs!**
