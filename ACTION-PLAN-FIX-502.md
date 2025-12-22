# Action Plan: Fix 502/504 Error - Professional Solution

## 🎯 What You Need To Do

### Step 1: Run the SQL Fix (2 minutes)

1. Open your browser and go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `cgxjqsbrditbteqhdyus`
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Open the file: `/home/acer/CascadeProjects/interactive-pdf/fix-rls-policies-all-domains.sql`
6. Copy the **entire contents** of that file
7. Paste into the SQL Editor
8. Click **"Run"** (or press Ctrl+Enter)
9. You should see: **"Success. No rows returned"** and a table showing 3 policies

**What this does:**
- Adds RLS policies to allow `builder.3c-public-library.org` access
- Adds RLS policies to allow `public-library.org` access (admin and library)
- Allows Edge Function to bypass RLS with service role key

---

### Step 2: Verify Edge Function is Deployed (1 minute)

1. In Supabase Dashboard, click **Edge Functions** in the left sidebar
2. Look for a function named `pdf_projects`

**If you see it:**
- Check the status - should show "Active" or a green indicator
- Click on it and check the **Logs** tab for any errors
- If you see errors about "SUPABASE_SERVICE_ROLE_KEY", go to Step 3

**If you DON'T see it:**
- Click **"Create a new function"**
- Name: `pdf_projects`
- Copy the code from `/home/acer/CascadeProjects/interactive-pdf/supabase functions/index.ts`
- Paste into the editor
- Click **"Deploy function"**
- Wait 30-60 seconds for deployment

---

### Step 3: Verify Environment Variables (30 seconds)

1. In **Edge Functions** → `pdf_projects` → Click the function
2. Look for **Settings** or **Secrets** tab
3. Verify these exist (Supabase usually auto-injects them):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

**If they're missing:**
- Go to **Settings** → **API** (in the main sidebar)
- Copy your **service_role key** (the long one, keep it secret)
- Go back to **Edge Functions** → `pdf_projects` → **Secrets**
- Add: `SUPABASE_SERVICE_ROLE_KEY` = `paste-your-service-role-key`
- Redeploy the function

---

### Step 4: Test the Fix (1 minute)

1. Open `https://builder.3c-public-library.org`
2. Press F12 to open browser console
3. Create a simple PDF project (add one page)
4. Click **"Save"** button
5. Check the console:
   - ✅ Should see: "Draft saved to Supabase"
   - ✅ No 502/504 errors
   - ✅ No CORS errors

6. Verify in Supabase:
   - Go to **Table Editor** → `pdf_projects`
   - You should see your saved project

---

## 🔍 If Still Getting 502/504

### Check Edge Function Logs

1. **Edge Functions** → `pdf_projects` → **Logs** tab
2. Try to save again from the builder
3. Watch the logs in real-time
4. Look for error messages:

**Common errors and fixes:**

| Error Message | Fix |
|--------------|-----|
| `permission denied for table pdf_projects` | Re-run the SQL from Step 1 |
| `SUPABASE_SERVICE_ROLE_KEY not set` | Add the secret in Step 3 |
| `relation "pdf_projects" does not exist` | Run `supabase-owner-access.sql` to create table |
| `timeout` or `execution time exceeded` | Edge Function is timing out - check for slow queries |

### Test Edge Function Directly

Open browser console (F12) and run:

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

**Expected result:**
```
Status: 200
Response: {data: [...], error: null}
```

**If you get:**
- `404` → Edge Function not deployed (go back to Step 2)
- `502/504` → Edge Function is crashing (check logs)
- `CORS error` → Should be fixed by the SQL in Step 1

---

## ✅ Success Indicators

After completing all steps, you should have:

- [ ] 3 RLS policies on `pdf_projects` table
- [ ] Edge Function `pdf_projects` deployed and active
- [ ] Environment variables set in Edge Function
- [ ] No 502/504 errors when saving
- [ ] Data appears in Supabase Table Editor
- [ ] Console shows "Draft saved to Supabase"

---

## 📋 Files Created

1. **fix-rls-policies-all-domains.sql** - The SQL fix to run in Supabase
2. **FIX-EDGE-FUNCTION-PROPERLY.md** - Detailed troubleshooting guide
3. **ACTION-PLAN-FIX-502.md** - This file (quick action steps)

---

## 💡 Summary

The 502/504 error is caused by:
1. **RLS policies blocking the Edge Function** from accessing `pdf_projects` table
2. **Edge Function not deployed** or missing environment variables

The fix:
1. **Run the SQL** to update RLS policies
2. **Verify Edge Function** is deployed
3. **Test** to confirm it works

No workarounds, no band-aids - just proper engineering.
