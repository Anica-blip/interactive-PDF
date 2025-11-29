# Interactive PDF Builder - UI Fixes Required

## Issues Identified and Solutions

### 1. Settings Panel Scrolling Issue
**Problem:** Settings at the bottom of the left sidebar don't scroll, preventing access to PDF title field.

**Solution:**
- File: `public/index.html`
- The sidebar has CSS: `height: calc(100vh - 70px); overflow-y: auto;`
- Need to ensure the settings section is within the scrollable area
- Check if there's a fixed positioning issue preventing scroll

**Fix Steps:**
1. Verify `.sidebar` class has proper `overflow-y: auto`
2. Ensure PDF settings section is not positioned absolutely
3. Add padding-bottom to sidebar to ensure all content is accessible
4. Test scroll behavior with multiple pages and settings expanded

---

### 2. Media Upload Limitations
**Problem:** Image upload only shows 'background' option. Need upload for all media types (images, videos, GIFs, audio).

**Current State:**
- Only background image upload exists
- URL option works correctly

**Required Changes:**
- File: `public/index.html` and `public/app.js`
- Add media upload section with options for:
  - **Images:** JPG, PNG, GIF, WebP
  - **Videos:** MP4, WebM (with Cloudflare Stream integration)
  - **Audio:** MP3, WAV, OGG
  - **URL:** Keep existing URL input for external media

**Implementation:**
```javascript
// Add to app.js
async function uploadMedia(file, mediaType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', mediaType);
    formData.append('projectId', currentProjectId);
    
    const response = await fetch(`${API_BASE}/api/upload-media`, {
        method: 'POST',
        body: formData
    });
    
    return await response.json();
}
```

**UI Structure:**
```html
<div class="media-upload-section">
    <h3>Add Media</h3>
    
    <!-- URL Input (existing) -->
    <div class="url-input">
        <input type="url" placeholder="Enter media URL" />
        <button>Add URL</button>
    </div>
    
    <!-- File Upload (new) -->
    <div class="file-upload">
        <label>Upload Media:</label>
        <select id="mediaType">
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="gif">GIF</option>
        </select>
        <input type="file" id="mediaFile" accept="image/*,video/*,audio/*" />
        <button onclick="handleMediaUpload()">Upload</button>
    </div>
</div>
```

---

### 3. PDF Generation - No Preview or Download
**Problem:** "Generate PDF" button doesn't show where PDF is saved or provide download option.

**Required Features:**
1. **PDF Preview** - Show generated PDF in an iframe or viewer
2. **Download Button** - Download PDF to local computer
3. **Supabase Storage** - Save PDF metadata to database
4. **Status Indicator** - Show generation progress

**Implementation:**

**File: `public/app.js`**
```javascript
async function generatePDF() {
    try {
        showStatus('Generating PDF...', 'info');
        
        // Prepare PDF data
        const pdfData = {
            title: document.getElementById('pdfTitle').value,
            author: document.getElementById('pdfAuthor').value,
            pages: pages,
            embeddedMode: embeddedMode,
            flipbookMode: flipbookMode,
            createdAt: new Date().toISOString()
        };
        
        // Generate PDF via API
        const response = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pdfData)
        });
        
        if (!response.ok) throw new Error('PDF generation failed');
        
        const result = await response.json();
        
        // Show preview
        showPDFPreview(result.url);
        
        // Enable download
        enablePDFDownload(result.url, result.filename);
        
        // Save to Supabase
        await savePDFToDatabase(result);
        
        showStatus('✅ PDF generated successfully!', 'success');
        
    } catch (error) {
        showStatus('❌ PDF generation failed: ' + error.message, 'error');
        console.error('PDF generation error:', error);
    }
}

function showPDFPreview(pdfUrl) {
    const previewSection = document.getElementById('pdfPreview');
    previewSection.innerHTML = `
        <div class="pdf-preview-container">
            <h3>PDF Preview</h3>
            <iframe src="${pdfUrl}" width="100%" height="600px"></iframe>
        </div>
    `;
    previewSection.style.display = 'block';
}

function enablePDFDownload(pdfUrl, filename) {
    const downloadBtn = document.getElementById('downloadPDF');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = filename;
        a.click();
    };
}

async function savePDFToDatabase(pdfData) {
    const projectData = {
        title: pdfData.title,
        pdf_url: pdfData.url,
        filename: pdfData.filename,
        file_size: pdfData.size,
        page_count: pages.length,
        embedded_mode: embeddedMode,
        flipbook_mode: flipbookMode,
        project_json: JSON.stringify({ pages, settings: { embeddedMode, flipbookMode } }),
        created_at: new Date().toISOString()
    };
    
    await fetch(`${API_BASE}/api/save-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
    });
}
```

**File: `public/index.html` - Add preview section**
```html
<!-- Add after main canvas -->
<div id="pdfPreview" style="display: none;" class="pdf-preview">
    <!-- Preview will be inserted here -->
</div>

<!-- Add download button -->
<button id="downloadPDF" style="display: none;" class="btn-download">
    <i class="fas fa-download"></i> Download PDF
</button>
```

---

### 4. Page Flipping Preview
**Problem:** Flipbook mode toggle exists but no preview to see results.

**Solution:**
Add a preview button that opens the flipbook viewer:

**File: `public/app.js`**
```javascript
function previewFlipbook() {
    if (!flipbookMode) {
        showStatus('⚠️ Enable Flipbook Mode first', 'warning');
        return;
    }
    
    // Save current state
    const previewData = {
        pages: pages,
        title: document.getElementById('pdfTitle').value
    };
    
    // Store in sessionStorage
    sessionStorage.setItem('flipbookPreview', JSON.stringify(previewData));
    
    // Open preview in new tab
    window.open('/flipbook.html?preview=true', '_blank');
}
```

**File: `public/index.html` - Add preview button**
```html
<div class="flipbook-controls">
    <label class="flex items-center gap-2">
        <input type="checkbox" id="flipbookMode" onchange="toggleFlipbookMode()" />
        <span>Enable Flipbook Mode</span>
    </label>
    <button onclick="previewFlipbook()" class="btn-preview">
        <i class="fas fa-eye"></i> Preview Flipbook
    </button>
</div>
```

---

### 5. Page Reordering
**Problem:** No way to reorder pages (move up/down).

**Solution:**
Add up/down arrows to page thumbnails:

**File: `public/app.js`**
```javascript
function movePageUp(pageIndex) {
    if (pageIndex === 0) return; // Already at top
    
    // Swap pages
    [pages[pageIndex - 1], pages[pageIndex]] = [pages[pageIndex], pages[pageIndex - 1]];
    
    // Update current page index if needed
    if (currentPageIndex === pageIndex) {
        currentPageIndex = pageIndex - 1;
    } else if (currentPageIndex === pageIndex - 1) {
        currentPageIndex = pageIndex;
    }
    
    renderPages();
    renderPageThumbnails();
    showStatus('Page moved up', 'success');
}

function movePageDown(pageIndex) {
    if (pageIndex === pages.length - 1) return; // Already at bottom
    
    // Swap pages
    [pages[pageIndex], pages[pageIndex + 1]] = [pages[pageIndex + 1], pages[pageIndex]];
    
    // Update current page index if needed
    if (currentPageIndex === pageIndex) {
        currentPageIndex = pageIndex + 1;
    } else if (currentPageIndex === pageIndex + 1) {
        currentPageIndex = pageIndex;
    }
    
    renderPages();
    renderPageThumbnails();
    showStatus('Page moved down', 'success');
}

function renderPageThumbnails() {
    const container = document.getElementById('pageThumbnails');
    container.innerHTML = '';
    
    pages.forEach((page, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail-wrapper';
        thumbnail.innerHTML = `
            <div class="page-thumbnail ${index === currentPageIndex ? 'active' : ''}"
                 onclick="switchToPage(${index})">
                <span>Page ${index + 1}</span>
            </div>
            <div class="page-controls">
                <button onclick="movePageUp(${index})" 
                        ${index === 0 ? 'disabled' : ''}
                        class="btn-page-control">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button onclick="movePageDown(${index})" 
                        ${index === pages.length - 1 ? 'disabled' : ''}
                        class="btn-page-control">
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button onclick="deletePage(${index})" 
                        class="btn-page-control btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(thumbnail);
    });
}
```

**File: `public/index.html` - Add CSS**
```css
.page-thumbnail-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
}

.page-controls {
    display: flex;
    gap: 4px;
    justify-content: center;
}

.btn-page-control {
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid #cbd5e0;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-page-control:hover:not(:disabled) {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

.btn-page-control:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.btn-delete:hover {
    background: #ef4444;
    border-color: #ef4444;
}
```

---

## API Endpoints Required

The worker.js already has these endpoints implemented:

✅ `/api/upload-media` - Upload images, videos, audio
✅ `/api/upload-pdf` - Upload generated PDF
✅ `/api/save-project` - Save project to Supabase
✅ `/api/load-project/:id` - Load project from Supabase
✅ `/api/upload-stream` - Upload video to Cloudflare Stream

**Missing Endpoint:**
- `/api/generate-pdf` - Generate PDF from project data

This needs to be added to `worker.js`:

```javascript
// Add to worker.js
if (path === '/api/generate-pdf' && request.method === 'POST') {
    return await handleGeneratePDF(request, env, corsHeaders);
}

async function handleGeneratePDF(request, env, corsHeaders) {
    try {
        const projectData = await request.json();
        
        // Generate PDF using pdf-lib or similar
        // This would need to be implemented server-side
        // For now, return a placeholder response
        
        return new Response(
            JSON.stringify({
                success: true,
                message: 'PDF generation endpoint - needs implementation',
                // In production, this would return actual PDF URL
                url: 'https://files.3c-public-library.org/interactive-pdfs/sample.pdf',
                filename: 'sample.pdf',
                size: 0
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
```

---

## Testing Checklist

After implementing fixes:

- [ ] Settings panel scrolls to show PDF title field
- [ ] Can upload images via file picker
- [ ] Can upload videos via file picker
- [ ] Can upload audio via file picker
- [ ] Can add media via URL
- [ ] Generate PDF button shows preview
- [ ] Can download PDF to computer
- [ ] PDF saves to Supabase with metadata
- [ ] Flipbook preview opens in new tab
- [ ] Can move pages up
- [ ] Can move pages down
- [ ] Page order persists after reordering
- [ ] All media uploads to R2 bucket correctly
- [ ] Cloudflare worker API responds correctly

---

## Priority Order

1. **High Priority:**
   - Settings panel scrolling (blocks access to title)
   - PDF preview and download (core functionality)
   
2. **Medium Priority:**
   - Media upload for all types (enhances usability)
   - Page reordering (improves workflow)
   
3. **Low Priority:**
   - Flipbook preview (nice to have)

---

## Notes

- All Cloudflare worker configurations are now correct
- GitHub workflows are in place for automated deployment
- The API endpoints in worker.js support most required functionality
- Main work needed is in the frontend (index.html and app.js)
