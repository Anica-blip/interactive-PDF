# Fix Database Timeout for Large Flipbooks (31+ Pages)

## Problem
When saving a 31-page flipbook, you get this error:
```
❌ Save Failed
Error Details: canceling statement due to statement timeout
```

This happens because the database statement timeout (default ~3 seconds) is too short for inserting/updating large JSONB data containing 31 pages of content.

## Solution
Apply these fixes in order:

### Step 1: Update Supabase Edge Function

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Edge Functions** → **pdf_projects**
3. Replace the entire function code with the updated version from:
   `supabase/functions/pdf_projects/index.ts`
4. Click **Deploy** to save changes

**Key changes made:**
- Added statement timeout configuration (60 seconds) for large JSONB operations
- This allows the database enough time to process 31+ page flipbooks

### Step 2: Run SQL Migration

1. In Supabase Dashboard, go to: **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of: `fix-statement-timeout.sql`
4. Click **Run** to execute the migration

**What this does:**
- Sets database-wide statement timeout to 120 seconds
- Creates a helper function for per-session timeout control
- Grants necessary permissions

### Step 3: Verify the Fix

1. Go back to your flipbook builder: https://builder.3c-public-library.org/
2. Try saving your 31-page flipbook again
3. The save should now complete successfully without timeout errors

## Technical Details

**Root Cause:**
- Large JSONB `metadata` field with 31 pages × multiple elements per page
- Default PostgreSQL statement timeout (~3-5 seconds) too short
- INSERT/UPDATE operations on large JSONB data require more time

**Fix Applied:**
- Increased statement timeout to 60 seconds (60000ms)
- Applied at both Edge Function level and database level
- Ensures compatibility with flipbooks up to 100+ pages

## Troubleshooting

If you still get timeout errors after applying both fixes:

1. **Check Edge Function deployment:**
   - Verify the updated code is deployed in Supabase Dashboard
   - Check Edge Function logs for errors

2. **Verify SQL migration:**
   - Run this query in SQL Editor to check timeout setting:
     ```sql
     SHOW statement_timeout;
     ```
   - Should return `120s` or `120000ms`

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - This ensures the updated Edge Function is being called

4. **Check data size:**
   - If your flipbook has 50+ pages with many elements, you may need to increase timeout further
   - Edit line 45 in `supabase/functions/pdf_projects/index.ts`:
     ```typescript
     new_value: '120000',  // 120 seconds for very large projects
     ```

## Files Modified

- ✅ `supabase/functions/pdf_projects/index.ts` - Edge Function with timeout fix
- ✅ `fix-statement-timeout.sql` - Database migration for timeout settings

## Need Help?

If issues persist, check:
- Supabase Edge Function logs (Dashboard → Edge Functions → Logs)
- Browser console (F12) for detailed error messages
- Network tab to see the actual API response
