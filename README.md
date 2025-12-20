# Interactive PDF Builder

Web-based PDF builder for creating interactive flipbooks with embedded media, buttons, and hotspots. Built for 3C Public Library to create engaging course materials and training documents.

**Live App:** https://builder.3c-public-library.org

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange)](https://pages.cloudflare.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

---

## 🎯 What It Does

Create interactive PDF flipbooks with:
- **Drag-and-drop interface** - Visual page builder
- **Multiple pages** - Build multi-page documents
- **Interactive elements** - Buttons, hotspots, links
- **Embedded media** - Videos (Cloudflare Stream), images, audio
- **3C Branded assets** - Pre-loaded 3C buttons and emoji badges
- **Version control** - Track versions (v1.0, v1.1, etc.)
- **Cloud storage** - Automatic upload to R2
- **Live preview** - Preview before generating

---

## 🚀 How to Use

### 1. Create Pages
- Click "Add Page" to create a new page
- Upload background images for each page
- Use page thumbnails to navigate between pages

### 2. Add Interactive Elements

**3C Buttons:**
- Generic, ClubHouse, Training, Reframe
- Click button → Enter URL → Button added to library

**3C Emoji Badges:**
- ClubHouse, Training, Diamond
- Decorative or clickable

**Media:**
- Upload videos → Auto-uploaded to Cloudflare Stream
- Upload images → Stored in R2
- Add media URLs directly

**Interactive Elements:**
- Add Button → Visible clickable button
- Add Hotspot → Invisible click area

### 3. Position Elements
- Drag elements anywhere on the page
- Resize using corner handle
- Delete using trash icon
- Elements can be positioned freely in all directions

### 4. Configure Settings
- **Flipbook Title** - Name your project
- **Version Number** - Track versions (auto-increment)
- **Folder Organization** - Organize in R2 folders
- **Page Size** - A4, Letter, Legal
- **Orientation** - Portrait or Landscape

### 5. Generate PDF
- Click "Preview" to review all pages
- Click "Generate PDF" when ready
- Download generated PDF
- View in flipbook viewer

---

## 📁 Projects & Storage

### Save/Load Drafts
- **Save Draft** - Saves to browser localStorage
- **Load Draft** - Restores saved work
- **Auto-save** - Saves every 30 seconds

### My Projects
- View all saved PDFs in Supabase
- Load existing projects to edit
- Track versions and metadata

### R2 Storage Structure
```
/interactive-pdfs/2026/flipbooks/
  /{folder-name}/
    /{subfolder-name}/
      /{title}-v1.0.pdf
      /{title}-v1.0-manifest.json
```

---

## 🎬 Viewing Interactive PDFs

### Flipbook Viewer
**URL:** `https://builder.3c-public-library.org/flipbook.html`

**Features:**
- Magazine-style page turning
- Touch/swipe support
- Fullscreen mode
- Embedded video playback
- Interactive hotspots

**Usage:**
```
https://builder.3c-public-library.org/flipbook.html?pdf=YOUR_PDF_URL
```

### Standard Viewer
**URL:** `https://builder.3c-public-library.org/viewer.html`

**Features:**
- Single-page navigation
- Video overlay player
- Keyboard shortcuts
- Zoom controls
- Hotspot detection

**Usage:**
```
https://builder.3c-public-library.org/viewer.html?pdf=YOUR_PDF_URL&manifest=YOUR_MANIFEST_URL
```

---

## 🛠️ Technical Stack

### Frontend (Cloudflare Pages)
- **Framework:** Vanilla JavaScript
- **UI:** TailwindCSS
- **PDF Library:** pdf-lib
- **Domain:** builder.3c-public-library.org
- **Auto-deploys:** On every push to main branch

### Backend (Cloudflare Workers)
- **Runtime:** Cloudflare Workers
- **Domain:** api.3c-public-library.org/pdf/*
- **Storage:** R2 Bucket (3c-library-files)
- **Video:** Cloudflare Stream integration

### Database (Supabase)
- **Tables:** pdfs, pdf_versions
- **Features:** User projects, version tracking, metadata

---

## 📂 Repository Structure

```
interactive-PDF-main/
├── public/                    # Frontend (Cloudflare Pages)
│   ├── index.html            # Main builder interface
│   ├── app.js                # Builder logic
│   ├── viewer.html           # PDF viewer
│   ├── flipbook.html         # Flipbook viewer
│   └── 3C Buttons/           # Brand assets
│
├── worker.js                 # Cloudflare Worker (API)
├── wrangler.toml             # Worker config
├── supabase-schema.sql       # Database schema
│
├── .github/workflows/
│   └── cloudflare-worker.yml # Worker deployment
│
├── README.md                  # This file
└── SETUP.md                   # Infrastructure & deployment guide
```

---

## 🎨 Latest Updates

**December 2, 2025:**
- ✅ Fixed element dragging - elements can now move freely in all directions
- ✅ Reduced page spacing from 10px to 5px for tighter layout
- ✅ Fixed preview modal overflow issue
- ✅ Deployment verified working correctly (both Worker and Pages)

---

## 📚 Documentation

- **SETUP.md** - Infrastructure, Cloudflare, Supabase setup
- **supabase-schema.sql** - Database schema
- **DOC/** - Older reference docs (archived)

---

## 🔗 Links

- **Live App:** https://builder.3c-public-library.org
- **API:** https://api.3c-public-library.org/pdf/
- **Files:** https://files.3c-public-library.org
- **Viewer:** https://builder.3c-public-library.org/viewer.html
- **Flipbook:** https://builder.3c-public-library.org/flipbook.html

---

## 📝 License

MIT License - See LICENSE file for details

---

**Built for 3C Public Library**  
**Deployed on Cloudflare**  
**Last Updated:** December 2, 2025
