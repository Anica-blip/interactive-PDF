# 🔗 Integration Guide: Interactive PDF → Dashboard Library

## Overview

You have TWO separate projects that work together:

```
1. interactive-PDF-main/
   → Builder tool (creates interactive PDFs)
   → URL: builder.3c-public-library.org

2. Dashboard-library/
   → Public library (displays PDFs to users)
   → URL: 3c-public-library.org
```

---

## 📁 Files to Copy to Dashboard-Library

### Step 1: Copy Viewer Files

Copy these files from `interactive-PDF-main/public/` to `Dashboard-library/`:

```bash
# From interactive-PDF-main/public/ → To Dashboard-library/

viewer.html          → viewer.html
viewer.js            → viewer.js
flipbook.html        → flipbook.html
flipbook.js          → flipbook.js
manifest-generator.js → manifest-generator.js (optional)
```

### Commands:

```bash
# Navigate to Dashboard-library
cd /home/acer/CascadeProjects/personal-website-2/Dashboard-library

# Copy viewer files
cp /home/acer/CascadeProjects/interactive-PDF-main/public/viewer.html ./
cp /home/acer/CascadeProjects/interactive-PDF-main/public/viewer.js ./
cp /home/acer/CascadeProjects/interactive-PDF-main/public/flipbook.html ./
cp /home/acer/CascadeProjects/interactive-PDF-main/public/flipbook.js ./

# Commit and push
git add viewer.html viewer.js flipbook.html flipbook.js
git commit -m "Add interactive PDF viewers"
git push
```

---

## 🔗 How to Link from Library

### In your library.html or admin.html:

When displaying a PDF, add a link to the interactive viewer:

```html
<!-- Standard Interactive PDF -->
<a href="viewer.html?pdf=https://files.3c-public-library.org/pdfs/document.pdf&manifest=https://files.3c-public-library.org/manifests/document-manifest.json">
  View Interactive PDF
</a>

<!-- Flipbook PDF -->
<a href="flipbook.html?pdf=https://files.3c-public-library.org/pdfs/magazine.pdf&manifest=https://files.3c-public-library.org/manifests/magazine-manifest.json">
  View Magazine Flipbook
</a>
```

---

## 📊 Database Schema Update

Add a column to track if PDF is interactive:

```sql
-- Add to your pdfs table
ALTER TABLE pdfs ADD COLUMN is_interactive BOOLEAN DEFAULT false;
ALTER TABLE pdfs ADD COLUMN manifest_url TEXT;
ALTER TABLE pdfs ADD COLUMN is_flipbook BOOLEAN DEFAULT false;

-- Update existing PDFs
UPDATE pdfs SET is_interactive = false WHERE is_interactive IS NULL;
```

---

## 🎯 Workflow

### Creating Interactive PDF:

```
1. Go to builder.3c-public-library.org
2. Design PDF with videos/audio
3. Toggle flipbook mode (optional)
4. Generate PDF + manifest
5. Download both files
```

### Publishing to Library:

```
1. Upload PDF to R2: /pdfs/filename.pdf
2. Upload manifest to R2: /manifests/filename-manifest.json
3. Add to database:
   - pdf_url: https://files.3c-public-library.org/pdfs/filename.pdf
   - manifest_url: https://files.3c-public-library.org/manifests/filename-manifest.json
   - is_interactive: true
   - is_flipbook: true/false
```

### Displaying in Library:

```javascript
// In library-core.js or admin-core.js

function renderPDF(pdf) {
  if (pdf.is_interactive) {
    const viewerType = pdf.is_flipbook ? 'flipbook' : 'viewer';
    const viewerUrl = `${viewerType}.html?pdf=${pdf.pdf_url}&manifest=${pdf.manifest_url}`;
    
    return `
      <a href="${viewerUrl}" class="interactive-pdf-link">
        <img src="${pdf.thumbnail_url}" alt="${pdf.title}">
        <span class="badge">Interactive</span>
      </a>
    `;
  } else {
    // Regular PDF
    return `<a href="${pdf.pdf_url}" target="_blank">${pdf.title}</a>`;
  }
}
```

---

## 🎨 UI Updates for Dashboard-Library

### Add Interactive Badge:

```css
/* In admin-styles.css or library styles */

.interactive-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.flipbook-badge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}
```

### Update PDF Card Display:

```html
<!-- In library.html -->
<div class="pdf-card">
  <img src="thumbnail.jpg" alt="PDF">
  <h3>Course Title</h3>
  
  <!-- Add badges -->
  <div class="badges">
    <span class="interactive-badge">🎬 Interactive</span>
    <span class="flipbook-badge">📖 Flipbook</span>
  </div>
  
  <!-- View button -->
  <a href="flipbook.html?pdf=...&manifest=..." class="btn">
    View Magazine
  </a>
</div>
```

---

## ✅ Quick Integration Checklist

### One-Time Setup:
- [ ] Copy viewer.html to Dashboard-library
- [ ] Copy viewer.js to Dashboard-library
- [ ] Copy flipbook.html to Dashboard-library
- [ ] Copy flipbook.js to Dashboard-library
- [ ] Update database schema (add columns)
- [ ] Add CSS for interactive badges
- [ ] Update library-core.js to handle interactive PDFs

### For Each Interactive PDF:
- [ ] Create in builder.3c-public-library.org
- [ ] Download PDF + manifest
- [ ] Upload both to R2
- [ ] Add to database with manifest_url
- [ ] Set is_interactive = true
- [ ] Set is_flipbook = true/false

---

## 🚀 Testing

### Test Standard Viewer:
```
https://3c-public-library.org/viewer.html?pdf=YOUR_PDF_URL&manifest=YOUR_MANIFEST_URL
```

### Test Flipbook Viewer:
```
https://3c-public-library.org/flipbook.html?pdf=YOUR_PDF_URL&manifest=YOUR_MANIFEST_URL
```

---

## 📝 Summary

**Two Separate Projects:**
1. **interactive-PDF-main** = Builder tool (create PDFs)
2. **Dashboard-library** = Public library (display PDFs)

**Integration:**
- Copy 4 viewer files to Dashboard-library
- Update database schema
- Link to viewers from library
- Done! ✅

**No other changes needed to Dashboard-library!**
The existing code continues to work for regular PDFs.
Interactive PDFs just use the new viewer files.
