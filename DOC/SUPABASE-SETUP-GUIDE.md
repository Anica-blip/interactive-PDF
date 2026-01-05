# Supabase Setup Guide - Interactive PDF Builder

## 🎯 Overview

This guide will help you connect your Interactive PDF Builder to Supabase for saving drafts, managing projects, and storing PDF metadata.

---

## 📋 Prerequisites

1. A Supabase account (free tier works fine)
2. Access to `builder.3c-public-library.org` (your deployed app)
3. Basic understanding of SQL (for running setup scripts)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `3C Interactive PDF Builder` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

---

### Step 2: Run SQL Setup Script

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase-owner-access.sql` from your project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see: `Success. No rows returned`

**What this script does:**
- Creates the `pdf_projects` table
- Sets up Row Level Security (RLS) policies
- Ensures you (the owner) can NEVER be locked out
- Allows access from `builder.3c-public-library.org` domain
- Creates automatic `updated_at` timestamp trigger

---

### Step 3: Deploy Edge Function

1. In Supabase Dashboard, go to **Edge Functions** (left sidebar)
2. Click **"Create a new function"**
3. Name it: `pdf_projects`
4. Copy the contents from `supabase functions/index.ts`
5. Paste into the editor
6. Click **"Deploy"**

**What this Edge Function does:**
- Handles CRUD operations (Create, Read, Update, Delete)
- Manages CORS for browser access
- Uses service role key for bypassing RLS when needed

---

### Step 4: Get Your API Keys

1. In Supabase Dashboard, go to **Settings** → **API**
2. Find these values:

   **Project URL:**
   ```
   https://xxxxx.supabase.co
   ```

   **anon/public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **service_role key (optional but recommended):**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Copy these values** - you'll need them in the next step

---

### Step 5: Configure Your App

#### Option A: Using the Browser (Recommended)

1. Open your app: `https://builder.3c-public-library.org`
2. Look at the top-right corner - you'll see a **yellow dot** with "Not Configured"
3. **Click on the yellow dot** - a modal will open
4. Fill in the form:
   - **Supabase URL**: Paste your Project URL
   - **Anon Key**: Paste your anon/public key
   - **Service Key**: Paste your service_role key (optional)
5. Click **"Test"** to verify connection
6. If test succeeds, click **"Save & Download"**
7. A file named `config.js` will download
8. **Replace** your existing `public/config.js` with the downloaded file
9. **Commit and push** to GitHub:
   ```bash
   git add public/config.js
   git commit -m "Update Supabase credentials"
   git push origin main
   ```
10. Wait 2-3 minutes for Cloudflare to deploy
11. **Hard refresh** your browser (Ctrl+Shift+R)
12. The dot should now be **green** with "Connected"

#### Option B: Manual Configuration

1. Open `public/config.js` in your code editor
2. Find the `supabase` section:
   ```javascript
   supabase: {
     url: 'https://xxxxx.supabase.co',
     anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
     serviceKey: ''
   }
   ```
3. Replace with your actual values
4. Save the file
5. Commit and push to GitHub
6. Wait for deployment

---

## ✅ Verification

### Test Connection

1. Open your app: `https://builder.3c-public-library.org`
2. Check the **Supabase status indicator** (top-right):
   - 🟢 **Green dot** = Connected ✅
   - 🟡 **Yellow dot** = Not configured
   - 🔴 **Red dot** = Error

### Test Functionality

1. Create a simple PDF project
2. Click **"Save"** button
3. Check browser console (F12) - should see: `Draft saved to Supabase`
4. Go to Supabase Dashboard → **Table Editor** → `pdf_projects`
5. You should see your saved project!

---

## 🔒 Security Features

### Owner Access Protection

The SQL script includes special policies to ensure you NEVER get locked out:

1. **Domain-based access**: Any request from `builder.3c-public-library.org` has full access
2. **Service role bypass**: Service key bypasses all RLS policies
3. **Authenticated fallback**: Logged-in users can access (for team members)
4. **Public read**: Published PDFs are publicly viewable

### How It Works

```sql
-- You can ALWAYS access from your domain
current_setting('request.headers')::json->>'origin' 
  LIKE '%builder.3c-public-library.org%'

-- OR using service role key
current_setting('request.jwt.claims')::json->>'role' = 'service_role'
```

This means:
- ✅ You can use anon key from your domain (most common)
- ✅ You can use service key for backend operations
- ✅ You can add team members via Supabase Auth
- ✅ You'll never be locked out

---

## 🛠️ Troubleshooting

### Yellow Dot - "Not Configured"

**Problem**: App can't find Supabase credentials

**Solution**:
1. Check if `config.js` exists in `public/` folder
2. Open `config.js` and verify `supabase.url` and `supabase.anonKey` are filled
3. Make sure you committed and pushed the changes
4. Wait for Cloudflare deployment (2-3 minutes)
5. Hard refresh browser (Ctrl+Shift+R)

### Red Dot - "Error"

**Problem**: Connection failed

**Solutions**:

1. **Check API keys**:
   - Open browser console (F12)
   - Look for error messages
   - Verify keys are correct in `config.js`

2. **Check RLS policies**:
   - Go to Supabase Dashboard → Authentication → Policies
   - Make sure `pdf_projects` table has policies enabled
   - Re-run `supabase-owner-access.sql` if needed

3. **Check Edge Function**:
   - Go to Supabase Dashboard → Edge Functions
   - Check if `pdf_projects` function is deployed
   - Look at function logs for errors

4. **Check CORS**:
   - Edge Function should have CORS headers
   - Verify `Access-Control-Allow-Origin: *` is set

### "Failed to save draft"

**Problem**: Can't save to database

**Solutions**:

1. **Check table exists**:
   ```sql
   SELECT * FROM pdf_projects LIMIT 1;
   ```

2. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'pdf_projects';
   ```
   Should show 3 policies

3. **Test with service key**:
   - Add service key to `config.js`
   - Service key bypasses RLS

4. **Check browser console**:
   - Look for detailed error messages
   - Check network tab for failed requests

---

## 📊 Database Schema

### `pdf_projects` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `project_json` | JSONB | Complete project data (pages, assets, settings) |
| `pdf_url` | TEXT | URL to generated PDF (null for drafts) |
| `status` | TEXT | `'draft'` or `'published'` |
| `created_at` | TIMESTAMPTZ | Auto-set on creation |
| `updated_at` | TIMESTAMPTZ | Auto-updated on changes |

### Example Data

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "project_json": {
    "pages": [...],
    "assets": [...],
    "settings": {...}
  },
  "pdf_url": "https://files.3c-public-library.org/interactive/2026/flipbook/my-pdf-v1.0.pdf",
  "status": "published",
  "created_at": "2024-12-20T01:00:00Z",
  "updated_at": "2024-12-20T02:30:00Z"
}
```

---

## 🔄 Workflow

### Typical Usage Flow

1. **Create Project**: User creates PDF in builder
2. **Auto-save**: App auto-saves every 15 seconds (silent)
3. **Manual Save**: User clicks "Save" button
4. **Generate PDF**: User clicks "Generate PDF"
5. **Publish**: App updates record with PDF URL and sets status to `'published'`
6. **Export JSON**: User exports project JSON for 3C Library

### API Calls

```javascript
// Create new project
POST /functions/v1/pdf_projects
Body: { action: 'create', data: { project_json: {...}, status: 'draft' } }

// Update existing project
POST /functions/v1/pdf_projects
Body: { action: 'update', id: 'uuid', data: { project_json: {...} } }

// Get project
GET /functions/v1/pdf_projects?id=uuid

// List all projects
GET /functions/v1/pdf_projects?limit=100&status=draft

// Delete project
POST /functions/v1/pdf_projects
Body: { action: 'delete', id: 'uuid' }
```

---

## 🎨 UI Features

### Status Indicator

Located in top-right corner of the app:

- **🟡 Yellow dot + "Not Configured"**: Click to open setup modal
- **🟢 Green dot + "Connected"**: Click to view/edit credentials
- **🔴 Red dot + "Error"**: Click to troubleshoot

### Configuration Modal

- Modern dark theme with gradient design
- Real-time connection testing
- One-click config file download
- Clear setup instructions
- Auto-closes after successful save

---

## 📝 Best Practices

1. **Never commit API keys to GitHub**:
   - Add `config.js` to `.gitignore` (already done)
   - Use the browser modal to configure
   - Keep service key secret

2. **Use anon key for most operations**:
   - Anon key is safe for browser use
   - RLS policies protect your data
   - Service key only needed for admin operations

3. **Regular backups**:
   - Export JSON regularly
   - Supabase has automatic backups
   - Consider exporting database periodically

4. **Monitor usage**:
   - Check Supabase Dashboard for usage stats
   - Free tier: 500MB database, 2GB bandwidth
   - Upgrade if needed

---

## 🆘 Support

### Resources

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Edge Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **RLS Policies**: [supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security)

### Common Issues

1. **"No rows returned" error**: RLS blocking access - check policies
2. **CORS errors**: Edge Function missing CORS headers
3. **401 Unauthorized**: Invalid API key
4. **404 Not Found**: Edge Function not deployed or wrong URL

---

## ✨ Summary

You now have:
- ✅ Supabase database configured
- ✅ RLS policies protecting your data
- ✅ Owner access guaranteed (never locked out)
- ✅ Edge Function for API operations
- ✅ Browser-based configuration
- ✅ Auto-save functionality
- ✅ Project management system

**Next Steps**:
1. Test saving a draft
2. Generate a PDF
3. Check the data in Supabase Dashboard
4. Enjoy your fully connected PDF builder! 🎉
