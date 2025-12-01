# Infrastructure Setup - Interactive PDF Creator
## Using Existing 3C Resources - No Duplication

---

## ✅ Current Infrastructure (What You Already Have)

### **1. Cloudflare Workers (3 Total)**

| Worker Name | Domain | Purpose | Status |
|------------|---------|---------|--------|
| `3c-url-redirector` | `go.3c-public-library.org` | Short URL redirects | ✅ Active |
| `3c-library-upload` | `api.3c-public-library.org` | Library file uploads | ✅ Active |
| `interactive-pdf-api` | `api.3c-public-library.org/pdf/*` | PDF creation & management | ⚙️ Needs deployment |

### **2. Cloudflare R2 Bucket (Shared)**

- **Bucket Name**: `3c-library-files`
- **Public URL**: `https://files.3c-public-library.org`
- **Used By**: All projects (library, PDFs, flipbooks)

### **3. URL Standards (Now Consistent)**

| Type | URL Pattern | Purpose |
|------|-------------|---------|
| **API Calls** | `api.3c-public-library.org/*` | All API endpoints |
| **File Access** | `files.3c-public-library.org/*` | All public files from R2 |
| **Short URLs** | `go.3c-public-library.org/*` | Branded redirects |

---

## 📦 R2 Bucket Structure (Single Bucket for Everything)

```
3c-library-files/
├── library/                          # Your existing library files
│   ├── pdfs/
│   ├── videos/
│   ├── images/
│   └── thumbnails/
│
├── interactive-pdfs/                 # NEW - PDF Creator files
│   ├── static/                       # Normal PDFs
│   │   ├── {uuid}.pdf
│   │   └── thumbnails/
│   │       └── {uuid}.jpg
│   │
│   ├── flipbooks/                    # Magazine-style flipbooks
│   │   ├── {uuid}.pdf
│   │   ├── {uuid}.json              # Flipbook manifest
│   │   └── thumbnails/
│   │       └── {uuid}.jpg
│   │
│   └── media/                        # Media assets for PDFs
│       ├── images/
│       ├── videos/
│       └── audio/
│
└── redirects/                        # Your URL redirector data
```

**No new buckets needed!** Everything uses: `3c-library-files`

---

## 🗄️ Supabase Database Tables

### **Two Separate Tables (As You Requested)**

#### **1. `pdf_projects` - Static PDFs**
- Purpose: Normal interactive PDFs
- Fields: title, author, page_count, pdf_url, settings, pages_data, etc.
- Used when: flipbook_mode is OFF

#### **2. `flipbook_projects` - Magazine-Style Flipbooks**
- Purpose: PDFs with page-turning effect
- Fields: title, author, page_count, pdf_url, manifest_url, flipbook_config, media_assets, etc.
- Used when: flipbook_mode is ON

**Run this**: `/home/acer/CascadeProjects/interactive-PDF-main/SUPABASE-TABLES-SCHEMA.sql`

---

## 🔧 Deployment Steps

### **Step 1: Set Up Supabase Tables**

1. Go to your Supabase project dashboard
2. Click "SQL Editor"
3. Copy and paste entire `SUPABASE-TABLES-SCHEMA.sql` file
4. Click "Run"
5. Verify both tables created: `pdf_projects` and `flipbook_projects`

### **Step 2: Add Cloudflare Worker Secrets**

```bash
cd /home/acer/CascadeProjects/interactive-PDF-main

# Supabase credentials
npx wrangler secret put SUPABASE_URL
# Enter: https://your-project-id.supabase.co

npx wrangler secret put SUPABASE_SERVICE_KEY
# Enter: your service role key (from Supabase Settings → API)

# Cloudflare Stream (for video uploads)
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Enter: your Cloudflare account ID

npx wrangler secret put CLOUDFLARE_STREAM_TOKEN
# Enter: your Stream API token

npx wrangler secret put CLOUDFLARE_STREAM_SUBDOMAIN
# Enter: your Stream subdomain (from Stream settings)
```

### **Step 3: Deploy Worker**

```bash
cd /home/acer/CascadeProjects/interactive-PDF-main
npx wrangler deploy
```

**This deploys to**: `api.3c-public-library.org/pdf/*`

### **Step 4: Update Cloudflare Routes**

In Cloudflare Dashboard → Workers & Pages → Routes:

Add route:
- Pattern: `api.3c-public-library.org/pdf/*`
- Worker: `interactive-pdf-api`
- Zone: `3c-public-library.org`

---

## 🔗 API Endpoints (After Deployment)

Base URL: `https://api.3c-public-library.org/pdf`

### **PDF Management**
- `POST /api/upload-pdf` - Upload generated PDF to R2
- `POST /api/save-project` - Save project to Supabase
- `POST /api/update-project` - Update existing project
- `GET /api/list-projects` - List all projects (both tables)
- `GET /api/load-project/{id}` - Load specific project
- `DELETE /api/delete-project/{id}` - Delete project

### **Media Uploads**
- `POST /api/upload-media` - Upload images/audio to R2
- `POST /api/upload-stream` - Upload videos to Cloudflare Stream

### **Utility**
- `GET /api/health` - Check system status
- `GET /api/list` - List R2 files
- `DELETE /api/delete` - Delete from R2

---

## 📊 How Data Flows

### **Draft Mode (localStorage)**
```
User creates pages → Auto-saves to browser → Can reload anytime
```

### **Generate PDF (Static)**
```
1. User clicks "Generate PDF"
2. Frontend sends pages data to: api.3c-public-library.org/pdf/api/upload-pdf
3. Worker generates PDF with pdf-lib
4. Uploads to R2: files.3c-public-library.org/interactive-pdfs/static/{uuid}.pdf
5. Saves metadata to Supabase: pdf_projects table
6. Returns public URL
7. User sees in "My Projects"
```

### **Generate Flipbook (Magazine-Style)**
```
1. User toggles "Magazine Flipbook" ON
2. Clicks "Generate PDF"
3. Frontend sends pages data to: api.3c-public-library.org/pdf/api/upload-pdf
4. Worker generates PDF + flipbook manifest JSON
5. Uploads both to R2: files.3c-public-library.org/interactive-pdfs/flipbooks/
6. Saves metadata to Supabase: flipbook_projects table
7. Returns public URL with page-turning viewer
8. User sees in "My Projects" with flipbook badge
```

---

## 🎯 Distinction: Draft vs Published

| Feature | Draft (localStorage) | Published PDF (Cloud) |
|---------|---------------------|----------------------|
| **Storage** | Browser only | R2 + Supabase |
| **Persistence** | Until browser clears | Permanent |
| **Shareable** | No | Yes - public URL |
| **Searchable** | No | Yes - in database |
| **Accessible** | Same computer only | Anywhere |
| **Professional** | Work in progress | Final deliverable |

---

## 🔐 Environment Variables Summary

### **In `wrangler.toml` (Public)**
```toml
R2_PUBLIC_URL = "https://files.3c-public-library.org"
ENVIRONMENT = "production"
```

### **Via Secrets (Private)**
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_TOKEN
CLOUDFLARE_STREAM_SUBDOMAIN
```

### **R2 Binding (Automatic)**
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "3c-library-files"
```

---

## ✅ Checklist Before Going Live

- [ ] Supabase tables created (`pdf_projects` and `flipbook_projects`)
- [ ] Worker secrets added (5 total)
- [ ] Worker deployed (`npx wrangler deploy`)
- [ ] Route configured in Cloudflare dashboard
- [ ] Test health check: `https://api.3c-public-library.org/pdf/api/health`
- [ ] Test PDF generation from frontend
- [ ] Verify files appear in R2 bucket
- [ ] Verify projects appear in Supabase tables
- [ ] Test flipbook mode vs static mode

---

## 🧪 Testing Commands

### **Health Check**
```bash
curl https://api.3c-public-library.org/pdf/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T...",
  "services": {
    "api": "operational",
    "r2": "connected",
    "supabase": "connected"
  }
}
```

### **List Projects**
```bash
curl https://api.3c-public-library.org/pdf/api/list-projects
```

---

## 📝 Notes

### **Why Separate Tables?**
- **Cleaner Organization**: Static PDFs have different needs than flipbooks
- **Better Queries**: Can filter by type easily
- **Different Schemas**: Flipbooks need manifest_url, flipbook_config, media_assets
- **Future Scalability**: Can optimize each table independently

### **Why Same Bucket?**
- **Cost Efficient**: One bucket = one set of egress costs
- **Easier Management**: Single public URL domain
- **Consistent Access**: All files from files.3c-public-library.org

### **Why Consistent URLs?**
- **Professional**: api.* for APIs, files.* for files
- **Predictable**: Developers know where to look
- **SEO Friendly**: Clear domain purposes
- **Secure**: Can apply different security rules per subdomain

---

## 🚀 What Changed from Before

### **Before (Band-Aid)**
- ❌ localStorage only (even for "generated" PDFs)
- ❌ No backend connection
- ❌ Flipbook removed entirely
- ❌ No cloud storage
- ❌ NetworkError hidden

### **Now (Professional)**
- ✅ localStorage for drafts ONLY
- ✅ Real cloud storage (R2) for generated PDFs
- ✅ Flipbook toggle restored (Preview button still removed as requested)
- ✅ Supabase database for project management
- ✅ Separate tables for static vs flipbooks
- ✅ Uses existing infrastructure (no duplication)
- ✅ Consistent URL patterns across all services

---

## 🎯 Next Actions for You

1. **Run the SQL**: Create Supabase tables
2. **Add Secrets**: Configure worker environment
3. **Deploy**: `npx wrangler deploy`
4. **Test**: Generate a PDF and verify it saves to cloud
5. **Use**: Start creating professional PDFs and flipbooks!

---

**All systems using SAME bucket, SAME URL patterns, SEPARATE tables for organization. Professional setup, no duplication.** 🎉
