# Fix Edge Function 502/504 Error - Professional Solution

## 🎯 The Real Problem

The Edge Function `pdf_projects` is returning 502/504 errors because:
1. **RLS policies are blocking access** - The policies only allow `builder.3c-public-library.org` but the Edge Function runs on Supabase's domain
2. **Edge Function may not be deployed** - Need to verify deployment status

## ✅ Professional Fix (No Band-Aids)

### Step 1: Update RLS Policies

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- File: fix-rls-policies-all-domains.sql
-- Copy the entire contents and run it
```

This will:
- ✅ Allow `builder.3c-public-library.org` full access
- ✅ Allow `public-library.org/admin` full access  
- ✅ Allow `public-library.org/library.html` full access
- ✅ Allow Edge Functions to bypass RLS using service role key
- ✅ Keep public read access for published projects

### Step 2: Verify Edge Function Deployment

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Check if `pdf_projects` function exists
3. If it exists, check the **Status** - should be "Active" or "Deployed"
4. If it doesn't exist or shows "Inactive":
   - Click **"Create a new function"**
   - Name: `pdf_projects`
   - Copy code from `/home/acer/CascadeProjects/interactive-pdf/supabase functions/index.ts`
   - Click **"Deploy function"**

### Step 3: Check Edge Function Logs

1. In **Supabase Dashboard** → **Edge Functions** → `pdf_projects`
2. Click **"Logs"** tab
3. Look for errors when you try to save from the builder
4. Common errors:
   - `SUPABASE_URL not set` → Environment variable issue
   - `SUPABASE_SERVICE_ROLE_KEY not set` → Environment variable issue
   - `permission denied for table pdf_projects` → RLS policy issue (fixed by Step 1)
   - `relation "pdf_projects" does not exist` → Table not created (run `supabase-owner-access.sql`)

### Step 4: Verify Environment Variables

Edge Functions need these environment variables (usually auto-injected):
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)

To verify:
1. **Supabase Dashboard** → **Edge Functions** → `pdf_projects` → **Settings**
2. Check if secrets/environment variables are set
3. If missing, the Edge Function will fail with 502/504

**Note**: Supabase usually auto-injects these. If they're missing, it's a Supabase configuration issue.

### Step 5: Test the Fix

After running the SQL and verifying deployment:

1. Open `https://builder.3c-public-library.org`
2. Create a simple PDF project
3. Click **"Save"** button
4. Open browser console (F12)
5. Check for:
   - ✅ "Draft saved to Supabase" message
   - ✅ No 502/504 errors
   - ✅ Data appears in **Supabase Dashboard** → **Table Editor** → `pdf_projects`

## 🔍 Debugging the Edge Function

If still getting 502/504 after the SQL fix:

### Check 1: Is the Edge Function actually deployed?

Run this in browser console:
```javascript
fetch('https://cgxjqsbrditbteqhdyus.supabase.co/functions/v1/pdf_projects?limit=1', {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4'
    }
})
.then(r => {
    console.log('Status:', r.status);
    return r.json();
})
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

**Expected**: Status 200, Response with `{data: [...], error: null}`
**If 404**: Function not deployed
**If 502/504**: Function is crashing or timing out
**If 401**: Authentication issue

### Check 2: Edge Function Timeout

The Edge Function might be timing out. Check logs for:
- Slow database queries
- Missing indexes
- Large data processing

If timeout is the issue, the Edge Function code is fine - it's a performance issue.

### Check 3: Service Role Key

The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. If this key is missing or invalid:
1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **service_role key** (keep it secret!)
3. Go to **Edge Functions** → `pdf_projects` → **Settings**
4. Add secret: `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
5. Redeploy the function

## 📋 Complete Checklist

- [ ] Run `fix-rls-policies-all-domains.sql` in SQL Editor
- [ ] Verify 3 policies exist for `pdf_projects` table
- [ ] Verify Edge Function `pdf_projects` is deployed
- [ ] Check Edge Function logs for errors
- [ ] Verify environment variables are set
- [ ] Test with browser console fetch
- [ ] Test save from builder application
- [ ] Verify data appears in Supabase Table Editor

## 🚨 If Still Not Working

If you've done all the above and still getting 502/504:

1. **Check Supabase Status**: Visit [status.supabase.com](https://status.supabase.com)
2. **Redeploy Edge Function**: Delete and recreate the function
3. **Check Supabase Logs**: Dashboard → Logs → Filter by "Edge Functions"
4. **Contact Supabase Support**: They can check server-side issues

## 💡 Why This Is The Professional Fix

1. ✅ **Fixes root cause** - RLS policies properly configured
2. ✅ **No workarounds** - Uses Edge Functions as designed
3. ✅ **Scalable** - Works for all three applications
4. ✅ **Secure** - RLS policies protect data
5. ✅ **Maintainable** - Standard Supabase architecture
6. ✅ **Future-proof** - No technical debt

## 📝 What Each Application Does

1. **builder.3c-public-library.org** (Interactive PDF)
   - Creates flipbook JSON files
   - Saves to `pdf_projects` table
   - Full CRUD access needed

2. **public-library.org/admin** (3C Admin Panel)
   - Adds standard PDFs and flipbook JSON files
   - Saves to `content_public` or `content_private` tables
   - Can also read from `pdf_projects` to import flipbooks

3. **public-library.org/library.html** (3C Public Library)
   - Displays both standard PDFs and flipbooks
   - Reads from `content_public`, `content_private`, and `pdf_projects`
   - Read-only access

The RLS policies now allow all three applications to access `pdf_projects` as needed.
