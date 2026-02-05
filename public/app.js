// Interactive PDF Creator v2.2 - Fixed copiedElement redeclaration (2024-12-30)
// Global state
let pages = [];
let currentPageIndex = 0;
let assets = [];
let draggedElement = null;
let dragOffset = { x: 0, y: 0 };
let resizing = false;
let embeddedMode = false; // Toggle between embedded and link mode
let flipbookMode = true; // Toggle for magazine-style flipbook (DEFAULT: ON)
let presentationMode = false; // Toggle for presentation mode (DEFAULT: OFF - saves as flipbook)
let currentProjectId = null; // Track current project for updates
let currentPdfUrl = null; // Track current PDF URL
let copiedElement = null; // Store copied element for paste
let selectedElementId = null; // Track currently selected element

// Cloudflare Configuration - For R2 bucket (images/media) and PDF generation ONLY
const API_BASE = 'https://api.3c-public-library.org/pdf';

// Supabase functions are loaded from supabaseAPI.js
// - saveProjectDraft() - Direct API save (no timeout)
// - updateProjectDB() - Direct API update (no timeout)
// - publishProjectDB() - Edge Function (for final publish only)
// - testSupabaseConnectionDB() - Connection test

// Export JSON
async function exportProjectJSON() {
    if (!currentProjectId) {
        showStatus('⚠️ Save project first', 'warning');
        return;
    }
    
    const data = {
        id: currentProjectId,
        title: document.getElementById('pdfTitle').value || 'Untitled',
        pages: pages,
        assets: assets,
        settings: {
            author: document.getElementById('pdfAuthor').value,
            pageSize: document.getElementById('pageSize').value,
            orientation: document.getElementById('orientation').value,
            embeddedMode: embeddedMode,
            flipbookMode: flipbookMode,
            presentationMode: presentationMode,
            versionNumber: document.getElementById('versionNumber')?.value || 'v1.0',
            partNumber: document.getElementById('partNumber')?.value || '',
            folderName: document.getElementById('folderName')?.value || '',
            subfolderName: document.getElementById('subfolderName')?.value || ''
        },
        exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/[^a-z0-9]/gi, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('✅ JSON exported! Upload to 3C Content Library.', 'success');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Interactive PDF Creator v2 initialized');
    document.getElementById('pdfTitle').value = 'My Interactive PDF';
    document.getElementById('pdfAuthor').value = 'PDF Creator';
    
    // Add keyboard shortcuts for copy/paste
    setupCopyPasteShortcuts();
    
    // Set up folder path preview listeners
    document.getElementById('pdfTitle')?.addEventListener('input', updateFolderPathPreview);
    document.getElementById('folderName')?.addEventListener('input', updateFolderPathPreview);
    document.getElementById('subfolderName')?.addEventListener('input', updateFolderPathPreview);
    updateFolderPathPreview(); // Initial update
    
    // Check if loading draft from projects page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('loadDraft') === 'true') {
        loadDraft();
    } else {
        // Add first page automatically
        addNewPage();
        
        // Check if loading existing project
        loadProjectFromURL();
    }
});

// Health check (if button exists)
const healthCheckBtn = document.getElementById('healthCheck');
if (healthCheckBtn) {
    healthCheckBtn.addEventListener('click', async () => {
        try {
            showStatus('Checking API health...', 'info');
            const response = await fetch(`${API_BASE}/api/health`);
            const data = await response.json();
            
            if (data.status === 'healthy') {
                showStatus('✅ API is healthy!', 'success');
            } else {
            showStatus('⚠️ API health check returned: ' + data.status, 'warning');
        }
        console.log('Health check:', data);
    } catch (error) {
        showStatus('❌ Failed to connect to API: ' + error.message, 'error');
        console.error('Health check failed:', error);
    }
    });
}

// Toggle embedded mode
function toggleEmbeddedMode() {
    embeddedMode = document.getElementById('embeddedMode').checked;
    const description = document.getElementById('modeDescription');
    
    if (embeddedMode) {
        description.textContent = 'Plays in Adobe Acrobat (free)';
        description.classList.add('text-purple-600', 'font-medium');
    } else {
        description.textContent = 'Links work everywhere';
        description.classList.remove('text-purple-600', 'font-medium');
    }
    
    showStatus(embeddedMode ? 
        '🎬 Embedded mode: Media plays in Adobe Acrobat' : 
        '🔗 Link mode: Works in all viewers', 
        'info'
    );
}

// Toggle flipbook mode
function toggleFlipbookMode() {
    flipbookMode = document.getElementById('flipbookMode')?.checked || false;
    const description = document.getElementById('flipbookDescription');
    
    if (flipbookMode) {
        description.textContent = '📖 Flipbook mode ON - Will generate with page-turning effect';
        description.classList.add('text-purple-700', 'font-semibold');
        showStatus('📖 Flipbook mode enabled: Your PDF will have magazine-style page turning!', 'success');
    } else {
        description.textContent = '📖 Enable for magazine-style page turning';
        description.classList.remove('text-purple-700', 'font-semibold');
        showStatus('📄 Standard PDF mode: Normal page viewing', 'info');
    }
}

// Toggle presentation mode
function togglePresentationMode() {
    presentationMode = document.getElementById('presentationMode')?.checked || false;
    const description = document.getElementById('presentationDescription');
    
    if (presentationMode) {
        description.textContent = '📊 Presentation mode ON - Will save as PRESENTATION type';
        description.classList.add('text-orange-700', 'font-semibold');
        showStatus('📊 Presentation mode enabled: JSON will be saved as presentation type!', 'success');
    } else {
        description.textContent = '📊 Enable to save as presentation instead of flipbook';
        description.classList.remove('text-orange-700', 'font-semibold');
        showStatus('📖 Flipbook type: JSON will be saved as flipbook type', 'info');
    }
}

// Increment version number
function incrementVersion() {
    const versionInput = document.getElementById('versionNumber');
    const currentVersion = versionInput.value;
    
    // Parse version (e.g., "v1.0" -> [1, 0])
    const match = currentVersion.match(/v(\d+)\.(\d+)/);
    if (!match) {
        versionInput.value = 'v1.0';
        return;
    }
    
    let major = parseInt(match[1]);
    let minor = parseInt(match[2]);
    
    // Increment minor version
    minor++;
    
    // If minor reaches 10, increment major and reset minor
    if (minor >= 10) {
        major++;
        minor = 0;
    }
    
    const newVersion = `v${major}.${minor}`;
    versionInput.value = newVersion;
    
    showStatus(`📌 Version updated to ${newVersion}. Click "Save Draft" to save changes.`, 'success');
}

// Update folder path preview
function updateFolderPathPreview() {
    const folderName = document.getElementById('folderName')?.value.trim() || '';
    const subfolderName = document.getElementById('subfolderName')?.value.trim() || '';
    const versionNumber = document.getElementById('versionNumber')?.value || 'v1.0';
    const pdfTitle = document.getElementById('pdfTitle')?.value.trim() || 'untitled';
    
    // Clean up folder names (remove special chars, spaces to dashes)
    const cleanFolder = folderName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const cleanSubfolder = subfolderName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const cleanTitle = pdfTitle.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    
    // Build path
    let path = '/interactive-pdf/2026/flipbook/';
    
    if (cleanFolder) {
        path += cleanFolder + '/';
    }
    
    if (cleanSubfolder) {
        path += cleanSubfolder + '/';
    }
    
    path += `${cleanTitle}-${versionNumber}.pdf`;
    
    // Update preview
    const preview = document.getElementById('folderPathPreview');
    if (preview) {
        preview.textContent = path;
    }
}

// ============================================
// SAVE/LOAD DRAFT FUNCTIONALITY
// ============================================

async function saveDraft(silent = false) {
    // Renumber all pages to ensure correct order before saving
    pages.forEach((page, index) => {
        page.pageNumber = index + 1;
    });
    
    // 1. Validate Project Settings
    const title = document.getElementById('pdfTitle').value.trim();
    const author = document.getElementById('pdfAuthor').value.trim();
    const folderName = document.getElementById('folderName')?.value.trim() || '';
    
    if (!title || !author || !folderName) {
        alert('To save your document, please add name and directory details in the Project Settings.');
        return;
    }
    
    if (pages.length === 0) {
        alert('⚠️ Please add at least one page before saving.');
        return;
    }
    
    // 4. Confirm if updating existing project
    if (currentProjectId && !silent) {
        const confirmUpdate = confirm(
            '📝 Update Existing Draft?\n\n' +
            'This will update your current draft:\n' +
            `"${title}"\n\n` +
            'Click OK to update, or Cancel to create a new draft.'
        );
        
        if (!confirmUpdate) {
            // User wants to create new draft instead
            currentProjectId = null;
        }
    }
    
    // Build description from folder + subfolder
    const subfolderName = document.getElementById('subfolderName')?.value.trim() || '';
    const description = subfolderName ? `${folderName}/${subfolderName}` : folderName;
    
    // Debug logging
    console.log('Saving description:', description);
    console.log('Folder:', folderName, 'Subfolder:', subfolderName);
    
    const projectData = {
        pages: pages,
        assets: assets,
        currentPageIndex: currentPageIndex,
        settings: {
            title: title,
            description: description,
            author: author,
            pageSize: document.getElementById('pageSize').value,
            orientation: document.getElementById('orientation').value,
            embeddedMode: embeddedMode,
            flipbookMode: flipbookMode,
            presentationMode: presentationMode,
            versionNumber: document.getElementById('versionNumber')?.value || 'v1.0',
            partNumber: document.getElementById('partNumber')?.value || '',
            folderName: folderName,
            subfolderName: subfolderName
        }
    };
    
    try {
        if (!silent) showStatus('💾 Saving to Supabase...', 'info');
        
        let savedProject;
        
        if (currentProjectId) {
            // UPDATE existing project via Edge Function
            savedProject = await updateProjectDB(currentProjectId, projectData);
        } else {
            // CREATE new project via Edge Function
            savedProject = await saveProjectDraft(projectData);
        }
        
        // Store project ID for future updates
        currentProjectId = savedProject.id;
        
        // Update URL with project ID
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('project', currentProjectId);
        window.history.replaceState({}, '', newUrl);
        
        // 2. Success message
        if (!silent) {
            showStatus('✅ Draft saved successfully!', 'success');
            alert('✅ Draft Saved Successfully!\n\n' +
                  `Project: "${title}"\n` +
                  `Pages: ${pages.length}\n` +
                  `Status: Saved to Supabase`);
        }
        console.log('Draft saved directly to Supabase (bypassing Edge Function):', savedProject);
    } catch (error) {
        // 3. Explicit error message
        console.error('Failed to save draft:', error);
        const errorMsg = error.message || 'Unknown error occurred';
        showStatus('❌ Failed to save: ' + errorMsg, 'error');
        alert('❌ Save Failed\n\n' +
              'Error Details:\n' + errorMsg + '\n\n' +
              'Possible causes:\n' +
              '• Database connection issue\n' +
              '• Invalid data format\n' +
              '• Permission denied\n\n' +
              'Please check the console (F12) for more details.');
    }
}

async function savePublishedProject(pdfUrl) {
    if (!currentProjectId) {
        console.warn('No project ID to update with PDF URL');
        return;
    }
    
    const projectData = {
        pages: pages,
        assets: assets,
        currentPageIndex: currentPageIndex,
        settings: {
            title: document.getElementById('pdfTitle').value,
            author: document.getElementById('pdfAuthor').value,
            pageSize: document.getElementById('pageSize').value,
            orientation: document.getElementById('orientation').value,
            embeddedMode: embeddedMode,
            flipbookMode: flipbookMode,
            presentationMode: presentationMode,
            versionNumber: document.getElementById('versionNumber')?.value || 'v1.0',
            partNumber: document.getElementById('partNumber')?.value || '',
            folderName: document.getElementById('folderName')?.value || '',
            subfolderName: document.getElementById('subfolderName')?.value || ''
        }
    };
    
    try {
        // Publish via Supabase Edge Function
        const published = await publishProjectDB(currentProjectId, pdfUrl, projectData);
        console.log('Project published via Edge Function:', published);
    } catch (error) {
        console.error('Failed to save published project:', error);
    }
}

function loadDraft() {
    // DISABLED - Load button removed from header
    // Users should load projects from "My Projects" dashboard instead
    showStatus('⚠️ Load disabled - Use "My Projects" to open saved projects', 'info');
    return;
}

// Auto-save DISABLED - Manual save only via "Save Draft" button
// This prevents timeout errors when working with large documents (31+ pages)
// The database timeout (120s) is not sufficient for auto-saving large JSONB data every 15 seconds
// Users should click "Save Draft" button manually when ready to save

// ============================================
// PAGE MANAGEMENT
// ============================================

function addNewPage() {
    const pageId = Date.now();
    const page = {
        id: pageId,
        pageNumber: pages.length + 1,
        background: null,
        backgroundData: null,
        elements: []
    };
    
    pages.push(page);
    currentPageIndex = pages.length - 1;
    
    renderPages();
    renderPageThumbnails();
    renderPageElements();
    updatePageCounter();
    
    showStatus(`✅ Page ${pages.length} added`, 'success');
}

function switchToPage(index) {
    if (index < 0 || index >= pages.length) return;
    currentPageIndex = index;
    renderPages();
    renderPageThumbnails();
    renderPageElements();
    updatePageCounter();
    
    // Scroll to active page in right-side canvas
    setTimeout(() => {
        const activePage = document.querySelector('.pdf-page.active');
        if (activePage) {
            activePage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function deletePage(index) {
    if (pages.length === 1) {
        showStatus('⚠️ Cannot delete the last page', 'warning');
        return;
    }
    
    if (confirm(`Delete page ${index + 1}?`)) {
        pages.splice(index, 1);
        if (currentPageIndex >= pages.length) {
            currentPageIndex = pages.length - 1;
        }
        renderPages();
        renderPageThumbnails();
        renderPageElements();
        updatePageCounter();
        showStatus(`Page deleted`, 'info');
    }
}

function renderPages() {
    const container = document.getElementById('pagesContainer');
    container.innerHTML = '';
    
    pages.forEach((page, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = `pdf-page ${index === currentPageIndex ? 'active' : ''}`;
        pageDiv.id = `page-${page.id}`;
        // Only switch page when clicking on empty space, not on elements
        pageDiv.onclick = (e) => {
            if (e.target === pageDiv || e.target.classList.contains('page-background')) {
                switchToPage(index);
            }
        };
        
        // Apply orientation
        const orientation = document.getElementById('orientation').value;
        if (orientation === 'landscape') {
            pageDiv.classList.add('landscape');
        }
        
        // Background image
        if (page.backgroundData) {
            const bg = document.createElement('img');
            bg.src = page.backgroundData;
            bg.className = 'page-background';
            pageDiv.appendChild(bg);
        }
        
        // Page number label
        const label = document.createElement('div');
        label.className = 'absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold';
        label.textContent = `Page ${index + 1}`;
        pageDiv.appendChild(label);
        
        // Delete button
        if (pages.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deletePage(index);
            };
            pageDiv.appendChild(deleteBtn);
        }
        
        // Render elements on this page
        if (index === currentPageIndex) {
            page.elements.forEach(element => {
                const elementDiv = createElementDiv(element);
                pageDiv.appendChild(elementDiv);
            });
        }
        
        container.appendChild(pageDiv);
    });
}

function renderPageThumbnails() {
    const container = document.getElementById('pageThumbnails');
    container.innerHTML = '';
    
    // Always show 2 thumbnails: Page 1 + Current Page
    const thumbnailsToShow = [
        { page: pages[0], index: 0, label: 'Page 1' },
        { page: pages[currentPageIndex], index: currentPageIndex, label: `Page ${currentPageIndex + 1}` }
    ];
    
    thumbnailsToShow.forEach((item, thumbIndex) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'page-thumbnail-wrapper';
        
        const thumb = document.createElement('div');
        thumb.className = `page-thumbnail ${item.index === currentPageIndex ? 'active' : ''}`;
        thumb.onclick = () => switchToPage(item.index);
        thumb.textContent = item.index + 1;
        
        if (item.page.backgroundData) {
            thumb.style.backgroundImage = `url(${item.page.backgroundData})`;
            thumb.style.backgroundSize = 'cover';
            thumb.style.backgroundPosition = 'center';
            thumb.textContent = '';
        }
        
        // Dropdown menu (... button)
        const dropdown = document.createElement('div');
        dropdown.className = 'thumb-dropdown';
        dropdown.innerHTML = `
            <div class="thumb-dropdown-btn" onclick="event.stopPropagation(); toggleThumbDropdown(${item.index})">
                <i class="fas fa-ellipsis-h"></i>
            </div>
            <div class="thumb-dropdown-menu" id="dropdown-${item.index}">
                <button onclick="duplicatePage(${item.index})">
                    <i class="fas fa-copy mr-1"></i>Duplicate
                </button>
                ${pages.length > 1 ? `
                <button class="delete-option" onclick="deletePage(${item.index})">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
                ` : ''}
            </div>
        `;
        thumb.appendChild(dropdown);
        
        wrapper.appendChild(thumb);
        
        // Add controls (up/down arrows) ONLY on 2nd thumbnail (current page)
        if (thumbIndex === 1) {
            const controls = document.createElement('div');
            controls.className = 'thumb-controls';
            controls.innerHTML = `
                <button onclick="movePageUp(${item.index})" 
                        ${item.index === 0 ? 'disabled' : ''}
                        class="thumb-control-btn" title="Move Up">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button onclick="movePageDown(${item.index})" 
                        ${item.index === pages.length - 1 ? 'disabled' : ''}
                        class="thumb-control-btn" title="Move Down">
                    <i class="fas fa-arrow-down"></i>
                </button>
            `;
            wrapper.appendChild(controls);
        }
        
        container.appendChild(wrapper);
    });
    
    // Render page navigation (< 1 - 50 >)
    renderPageNavigation();
}

function renderPageNavigation() {
    const nav = document.getElementById('pageNavigation');
    if (!nav) return;
    
    nav.innerHTML = '';
    
    if (pages.length <= 1) {
        return;
    }
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-nav-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPageIndex === 0;
    prevBtn.onclick = () => switchToPage(currentPageIndex - 1);
    nav.appendChild(prevBtn);
    
    // Page range display
    const rangeSpan = document.createElement('span');
    rangeSpan.className = 'page-nav-btn active';
    rangeSpan.textContent = `1 - ${pages.length}`;
    rangeSpan.style.cursor = 'default';
    nav.appendChild(rangeSpan);
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-nav-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPageIndex === pages.length - 1;
    nextBtn.onclick = () => switchToPage(currentPageIndex + 1);
    nav.appendChild(nextBtn);
}

function renderPageElements() {
    const container = document.getElementById('pageElementsContainer');
    const pageNumSpan = document.getElementById('elementsPageNum');
    
    if (!container || !pageNumSpan) return;
    
    pageNumSpan.textContent = currentPageIndex + 1;
    container.innerHTML = '';
    
    const currentPage = pages[currentPageIndex];
    
    if (!currentPage.elements || currentPage.elements.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 text-xs py-4">No elements on this page</div>';
        return;
    }
    
    // Type labels mapping
    const typeLabels = {
        'video': 'Video',
        'audio': 'Audio',
        'image': 'Image',
        'gif': 'GIF',
        'link': 'Link',
        '3c-button': '3C Button',
        '3c-emoji': '3C Emoji',
        '3c-emoji-decoration': '3C Decoration',
        'button': 'Button',
        'hotspot': 'Hotspot'
    };
    
    const icons = {
        'video': 'fas fa-video text-red-500',
        'audio': 'fas fa-music text-blue-500',
        'image': 'fas fa-image text-purple-500',
        'gif': 'fas fa-image text-purple-500',
        'link': 'fas fa-link text-green-500',
        '3c-button': 'fas fa-star text-blue-500',
        '3c-emoji': 'fas fa-smile text-purple-500',
        '3c-emoji-decoration': 'fas fa-smile text-purple-500',
        'button': 'fas fa-hand-pointer text-indigo-500',
        'hotspot': 'fas fa-mouse-pointer text-orange-500'
    };
    
    currentPage.elements.forEach((element, index) => {
        const item = document.createElement('div');
        item.className = 'page-element-item';
        item.dataset.elementId = element.id;
        
        const typeLabel = typeLabels[element.type] || element.type.toUpperCase();
        const icon = icons[element.type] || 'fas fa-file';
        
        // Create clean display name (NO URLs or filenames)
        let displayName = typeLabel;
        
        if (element.type === 'button' && element.text && !element.text.includes('http')) {
            // Button with custom text
            displayName = element.text;
        } else if (element.type === 'hotspot' && element.text && !element.text.includes('http')) {
            // Hotspot with custom label
            displayName = element.text;
        } else if (element.type === '3c-button' || element.type === '3c-emoji') {
            // 3C assets - use their name if available
            displayName = element.text || typeLabel;
        } else {
            // For media (video, audio, image, etc.) - show type + number
            const sameTypeElements = currentPage.elements.slice(0, index).filter(el => el.type === element.type);
            const number = sameTypeElements.length + 1;
            displayName = `${typeLabel} ${number}`;
        }
        
        item.innerHTML = `
            <div class="page-element-icon">
                <i class="${icon}"></i>
            </div>
            <div class="page-element-info">
                <div class="page-element-label">${displayName}</div>
                <div class="page-element-type">${typeLabel}</div>
            </div>
        `;
        
        // Click to select element
        item.onclick = () => {
            selectElement(element.id);
            const canvasElement = document.getElementById(`element-${element.id}`);
            if (canvasElement) {
                canvasElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        
        container.appendChild(item);
    });
}

function updatePageCounter() {
    document.getElementById('currentPageNum').textContent = currentPageIndex + 1;
    document.getElementById('totalPages').textContent = pages.length;
}

function updateAllPageSizes() {
    renderPages();
}

// ============================================
// THUMBNAIL DROPDOWN & PAGE ACTIONS
// ============================================

function toggleThumbDropdown(pageIndex) {
    const dropdown = document.getElementById(`dropdown-${pageIndex}`);
    if (!dropdown) return;
    
    // Close all other dropdowns
    document.querySelectorAll('.thumb-dropdown-menu').forEach(menu => {
        if (menu !== dropdown) {
            menu.classList.remove('active');
        }
    });
    
    dropdown.classList.toggle('active');
    
    // Close dropdown when clicking outside
    if (dropdown.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!e.target.closest('.thumb-dropdown')) {
                    dropdown.classList.remove('active');
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 10);
    }
}

function duplicatePage(pageIndex) {
    const originalPage = pages[pageIndex];
    const newPage = {
        id: Date.now(),
        pageNumber: pageIndex + 2,
        background: originalPage.background,
        backgroundData: originalPage.backgroundData,
        elements: originalPage.elements.map(el => ({
            ...el,
            id: Date.now() + Math.random()
        }))
    };
    
    pages.splice(pageIndex + 1, 0, newPage);
    
    // Renumber all pages after insertion
    for (let i = pageIndex + 2; i < pages.length; i++) {
        pages[i].pageNumber = i + 1;
    }
    
    currentPageIndex = pageIndex + 1;
    
    renderPages();
    renderPageThumbnails();
    renderPageElements();
    updatePageCounter();
    
    showStatus(`✅ Page ${pageIndex + 1} duplicated`, 'success');
    
    // Close dropdown
    document.querySelectorAll('.thumb-dropdown-menu').forEach(menu => {
        menu.classList.remove('active');
    });
}

// ============================================
// SETTINGS SIDEBAR
// ============================================

function openSettingsSidebar() {
    document.getElementById('settingsSidebar').classList.add('active');
    document.getElementById('settingsOverlay').classList.add('active');
}

function closeSettingsSidebar() {
    document.getElementById('settingsSidebar').classList.remove('active');
    document.getElementById('settingsOverlay').classList.remove('active');
}

// ============================================
// PAGE REORDERING
// ============================================

function movePageUp(pageIndex) {
    if (pageIndex === 0) return; // Already at top
    
    // Swap pages
    [pages[pageIndex - 1], pages[pageIndex]] = [pages[pageIndex], pages[pageIndex - 1]];
    
    // Update pageNumber for both swapped pages
    pages[pageIndex - 1].pageNumber = pageIndex;
    pages[pageIndex].pageNumber = pageIndex + 1;
    
    // Update current page index if needed
    if (currentPageIndex === pageIndex) {
        currentPageIndex = pageIndex - 1;
    } else if (currentPageIndex === pageIndex - 1) {
        currentPageIndex = pageIndex;
    }
    
    renderPages();
    renderPageThumbnails();
    renderPageElements();
    showStatus('✅ Page moved up', 'success');
}

function movePageDown(pageIndex) {
    if (pageIndex === pages.length - 1) return; // Already at bottom
    
    // Swap pages
    [pages[pageIndex], pages[pageIndex + 1]] = [pages[pageIndex + 1], pages[pageIndex]];
    
    // Update pageNumber for both swapped pages
    pages[pageIndex].pageNumber = pageIndex + 1;
    pages[pageIndex + 1].pageNumber = pageIndex + 2;
    
    // Update current page index if needed
    if (currentPageIndex === pageIndex) {
        currentPageIndex = pageIndex + 1;
    } else if (currentPageIndex === pageIndex + 1) {
        currentPageIndex = pageIndex;
    }
    
    renderPages();
    renderPageThumbnails();
    renderPageElements();
    showStatus('✅ Page moved down', 'success');
}

// ============================================
// BACKGROUND UPLOAD
// ============================================

async function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image/(png|jpeg|jpg)')) {
        showStatus('⚠️ Please upload a PNG or JPG image', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const currentPage = pages[currentPageIndex];
        currentPage.background = file.name;
        currentPage.backgroundData = e.target.result;
        
        renderPages();
        renderPageThumbnails();
        
        document.getElementById('backgroundInfo').classList.remove('hidden');
        showStatus(`✅ Background set for page ${currentPageIndex + 1}`, 'success');
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
}

// ============================================
// ASSET LIBRARY
// ============================================

// Add media from URL
function addMediaFromURL() {
    const urlInput = document.getElementById('mediaUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        showStatus('⚠️ Please enter a URL', 'warning');
        return;
    }
    
    // Detect media type from URL
    let type = 'link';
    let iframeUrl = null;
    let videoId = null;
    
    // Check for YouTube URLs
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
        type = 'video';
        videoId = youtubeMatch[1];
        iframeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    // Check for Vimeo URLs
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        type = 'video';
        videoId = vimeoMatch[1];
        iframeUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    
    // Check for file extensions
    if (!iframeUrl) {
        if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            type = 'image';
        } else if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
            type = 'video';
        } else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            type = 'audio';
        }
    }
    
    const fileName = url.split('/').pop().split('?')[0] || (iframeUrl ? `${type.charAt(0).toUpperCase() + type.slice(1)} from URL` : 'Media');
    
    const asset = {
        id: Date.now(),
        type: type,
        url: url,
        iframeUrl: iframeUrl, // For YouTube/Vimeo embeds
        videoId: videoId,
        name: fileName,
        thumbnail: type === 'image' ? url : getAssetThumbnail(type, url),
        embedded: embeddedMode || !!iframeUrl // YouTube/Vimeo are always embedded in popup
    };
    
    assets.push(asset);
    renderAssetLibrary();
    urlInput.value = ''; // Clear input
    
    const modeText = iframeUrl ? ' (will play in popup)' : (embeddedMode ? ' (embedded)' : ' (link)');
    showStatus(`✅ ${type} added from URL${modeText}`, 'success');
}

// Upload media file
function uploadMediaFile(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getAcceptType(type);
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showStatus(`📤 Uploading ${file.name} to Cloudflare...`, 'info');
        
        try {
            // Upload video to Cloudflare Stream
            if (type === 'video') {
                const streamData = await uploadToStream(file);
                const asset = {
                    id: Date.now(),
                    type: 'video',
                    streamId: streamData.videoId,
                    url: streamData.iframeUrl,
                    thumbnailUrl: streamData.thumbnailUrl,
                    name: file.name,
                    thumbnail: streamData.thumbnailUrl,
                    embedded: true // Stream videos are always embedded
                };
                
                assets.push(asset);
                renderAssetLibrary();
                showStatus(`✅ ${file.name} uploaded to Cloudflare Stream!`, 'success');
            } else {
                // For images and audio, upload to R2
                const r2Data = await uploadToR2(file, type);
                const asset = {
                    id: Date.now(),
                    type: type,
                    url: r2Data.url,
                    name: file.name,
                    thumbnail: type === 'image' ? r2Data.url : getAssetThumbnail(type),
                    embedded: embeddedMode
                };
                
                assets.push(asset);
                renderAssetLibrary();
                showStatus(`✅ ${file.name} uploaded to R2!`, 'success');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            showStatus(`❌ Upload failed: ${error.message}`, 'error');
        }
    };
    input.click();
}

// Add 3C button (branded button with image)
function add3CButton(buttonType) {
    let url = prompt('Enter URL for this 3C button:');
    if (!url) return;
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Map button types to their image files
    const buttonImages = {
        'generic': '/3C Buttons/3C Web Buttons - Generic.png',
        'clubhouse': '/3C Buttons/3C Web Buttons - Clubhouse.png',
        'training': '/3C Buttons/3C Web Buttons - Training.png',
        'reframe': '/3C Buttons/3C Web Buttons - Reframe.png'
    };
    
    const buttonNames = {
        'generic': '3C Generic',
        'clubhouse': '3C ClubHouse',
        'training': '3C Training',
        'reframe': '3C Reframe'
    };
    
    const imagePath = buttonImages[buttonType];
    const buttonName = buttonNames[buttonType];
    
    const asset = {
        id: Date.now(),
        type: '3c-button',
        url: url,
        imagePath: imagePath,
        name: buttonName,
        thumbnail: imagePath,
        embedded: false
    };
    
    assets.push(asset);
    renderAssetLibrary();
    showStatus(`✅ ${buttonName} added with URL`, 'success');
}

// Add 3C emoji badge (circular emoji badges)
function add3CEmoji(emojiType) {
    let url = prompt('Enter URL for this 3C emoji badge (optional - leave empty for decoration only):');
    
    // Ensure URL has protocol if provided
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Map emoji types to their image files
    const emojiImages = {
        'clubhouse': '/3C Buttons/Emojis/3C Emoji - Clubhouse.png',
        'training': '/3C Buttons/Emojis/3C Emoji - Training.png',
        'diamond': '/3C Buttons/Emojis/3C Emoji - Diamond.png',
        'generic': '/3C Buttons/Emojis/3C Emoji - Generic.png',
        'reframe': '/3C Buttons/Emojis/3C Emoji - Reframe.png'
    };
    
    const emojiNames = {
        'clubhouse': '3C ClubHouse Badge',
        'training': '3C Training Badge',
        'diamond': '3C Diamond Badge',
        'generic': '3C Generic Badge',
        'reframe': '3C Reframe Badge'
    };
    
    const imagePath = emojiImages[emojiType];
    const emojiName = emojiNames[emojiType];
    
    const asset = {
        id: Date.now(),
        type: url ? '3c-emoji' : '3c-emoji-decoration',
        url: url || null,
        imagePath: imagePath,
        name: emojiName,
        thumbnail: imagePath,
        embedded: false
    };
    
    assets.push(asset);
    renderAssetLibrary();
    showStatus(`✅ ${emojiName} added${url ? ' with URL' : ' as decoration'}`, 'success');
}

/**
 * Add custom emoji from General folder
 * User provides filename (e.g., "Windsurf Link.png") and it loads from /3C Buttons/Emojis/General/
 */
function addCustomEmoji() {
    const filename = prompt('Enter the filename of your custom emoji (e.g., "Windsurf Link.png"):\n\nPlace your image in: /3C Buttons/Emojis/General/');
    if (!filename) return;
    
    let url = prompt('Enter URL for this custom emoji (optional - leave empty for decoration only):');
    
    // Ensure URL has protocol if provided
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Build path to General folder
    const imagePath = '/3C Buttons/Emojis/General/' + filename;
    
    // Extract name from filename (remove extension)
    const emojiName = filename.replace(/\.[^/.]+$/, '');
    
    const asset = {
        id: Date.now(),
        type: url ? '3c-emoji' : '3c-emoji-decoration',
        url: url || null,
        imagePath: imagePath,
        name: emojiName,
        thumbnail: imagePath,
        embedded: false
    };
    
    assets.push(asset);
    renderAssetLibrary();
    showStatus(`✅ Custom emoji "${emojiName}" added${url ? ' with URL' : ' as decoration'}`, 'success');
}

// Add button (interactive element)
function addButton() {
    const url = prompt('Enter URL for button:');
    if (!url) return;
    
    const text = prompt('Enter button text:') || 'Click Here';
    
    const asset = {
        id: Date.now(),
        type: 'button',
        url: url,
        name: text,
        thumbnail: getAssetThumbnail('button', url),
        embedded: false // Buttons are always links
    };
    
    assets.push(asset);
    renderAssetLibrary();
    showStatus(`✅ Button added`, 'success');
}

// Add hotspot (interactive element)
function addHotspot() {
    const url = prompt('Enter URL for hotspot:');
    if (!url) return;
    
    const text = prompt('Enter hotspot name (for reference):') || 'Hotspot';
    
    const asset = {
        id: Date.now(),
        type: 'hotspot',
        url: url,
        name: text,
        thumbnail: getAssetThumbnail('hotspot', url),
        embedded: false // Hotspots are always links
    };
    
    assets.push(asset);
    renderAssetLibrary();
    showStatus(`✅ Hotspot added`, 'success');
}

function getAcceptType(type) {
    const accepts = {
        video: 'video/*',
        audio: 'audio/*',
        image: 'image/*',
        gif: 'image/gif,image/*',
        link: '*'
    };
    return accepts[type] || '*';
}

function getAssetThumbnail(type, url) {
    // For URLs, we'll show icons. For uploaded files, we'll show the actual file
    const icons = {
        button: 'fas fa-hand-pointer text-indigo-500',
        hotspot: 'fas fa-mouse-pointer text-orange-500',
        video: 'fas fa-video text-red-500',
        audio: 'fas fa-music text-blue-500',
        gif: 'fas fa-image text-purple-500',
        link: 'fas fa-link text-green-500'
    };
    return icons[type] || 'fas fa-file';
}

function renderAssetLibrary() {
    const grid = document.getElementById('assetGrid');
    
    if (assets.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center text-gray-400 text-xs py-4">No assets yet. Add some above!</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    // Type labels mapping
    const typeLabels = {
        'video': 'Video',
        'audio': 'Audio',
        'image': 'Image',
        'gif': 'GIF',
        'link': 'Link',
        '3c-button': '3C Button',
        '3c-emoji': '3C Emoji',
        '3c-emoji-decoration': '3C Decoration',
        'button': 'Button',
        'hotspot': 'Hotspot'
    };
    
    assets.forEach(asset => {
        const assetDiv = document.createElement('div');
        assetDiv.className = 'asset-item bg-gray-50 border-2 border-gray-200 rounded p-2 text-center hover:border-purple-400';
        assetDiv.draggable = true;
        assetDiv.ondragstart = (e) => startAssetDrag(e, asset);
        assetDiv.onclick = () => addAssetToPage(asset);
        
        const typeLabel = typeLabels[asset.type] || asset.type.toUpperCase();
        
        // Show image thumbnail for 3C buttons, emojis, and images
        if (asset.type === '3c-button') {
            // Convert relative button paths to full GitHub Pages URLs
            let buttonImgSrc = asset.imagePath;
            if (buttonImgSrc && !buttonImgSrc.startsWith('http')) {
                buttonImgSrc = 'https://anica-blip.github.io/interactive-PDF/public' + (buttonImgSrc.startsWith('/') ? buttonImgSrc : '/' + buttonImgSrc);
            }
            assetDiv.innerHTML = `
                <img src="${buttonImgSrc}" class="w-full h-16 object-contain rounded mb-1">
                <p class="text-xs font-medium text-blue-700 truncate">${asset.name}</p>
                <p class="text-xs text-gray-500">${typeLabel}</p>
            `;
        } else if (asset.type === '3c-emoji' || asset.type === '3c-emoji-decoration') {
            // Convert relative emoji paths to full GitHub Pages URLs
            let emojiImgSrc = asset.imagePath;
            if (emojiImgSrc && !emojiImgSrc.startsWith('http')) {
                emojiImgSrc = 'https://anica-blip.github.io/interactive-PDF/public' + (emojiImgSrc.startsWith('/') ? emojiImgSrc : '/' + emojiImgSrc);
            }
            assetDiv.innerHTML = `
                <img src="${emojiImgSrc}" class="w-full h-16 object-contain rounded-full mb-1" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22%3E😊%3C/text%3E%3C/svg%3E'">
                <p class="text-xs font-medium text-purple-700 truncate">${asset.name || 'Custom Emoji'}</p>
                <p class="text-xs text-gray-500">${typeLabel}</p>
            `;
        } else if (asset.type === 'image' || asset.thumbnail.startsWith('http') || (asset.url && asset.url.startsWith('data:image'))) {
            const imgSrc = asset.thumbnail.startsWith('http') ? asset.thumbnail : asset.url;
            assetDiv.innerHTML = `
                <img src="${imgSrc}" class="w-full h-16 object-cover rounded mb-1">
                <p class="text-xs font-medium text-gray-700 truncate">${asset.name}</p>
                <p class="text-xs text-gray-500">${typeLabel}</p>
            `;
        } else {
            // Show icon for other media types
            const icon = getAssetThumbnail(asset.type, asset.url);
            assetDiv.innerHTML = `
                <div class="flex items-center justify-center h-16">
                    <i class="${icon} text-3xl"></i>
                </div>
                <p class="text-xs font-medium text-gray-700 truncate">${asset.name}</p>
                <p class="text-xs text-gray-500">${typeLabel}</p>
            `;
        }
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteAsset(asset.id);
        };
        assetDiv.style.position = 'relative';
        assetDiv.appendChild(deleteBtn);
        
        grid.appendChild(assetDiv);
    });
}

function deleteAsset(assetId) {
    assets = assets.filter(a => a.id !== assetId);
    renderAssetLibrary();
    showStatus('Asset deleted', 'info');
}

function startAssetDrag(e, asset) {
    e.dataTransfer.setData('asset', JSON.stringify(asset));
}

function addAssetToPage(asset) {
    let width, height;
    
    // Set default sizes based on type
    if (asset.type === '3c-button') {
        width = 200;
        height = 80;
    } else if (asset.type === '3c-emoji' || asset.type === '3c-emoji-decoration') {
        width = 120;
        height = 120;
    } else if (asset.type === 'button') {
        width = 150;
        height = 50;
    } else if (asset.type === 'hotspot') {
        width = 200;
        height = 150;
    } else if (asset.type === 'audio') {
        width = 300;
        height = 60;
    } else {
        width = 200;
        height = 150;
    }
    
    const element = {
        id: Date.now(),
        type: asset.type,
        url: asset.url,
        text: asset.name,
        x: 100,
        y: 100,
        width: width,
        height: height,
        embedded: asset.embedded || false,
        imagePath: asset.imagePath || null
    };
    
    pages[currentPageIndex].elements.push(element);
    renderPages();
    renderPageElements();
    const modeText = asset.embedded ? ' (embedded)' : '';
    showStatus(`✅ ${asset.name} added to page ${currentPageIndex + 1}${modeText}`, 'success');
}

// ============================================
// ELEMENT MANAGEMENT
// ============================================

// Keyboard shortcuts for copy/paste
document.addEventListener('keydown', (e) => {
    // Ctrl+C or Cmd+C - Copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Try canvas element first
        let selectedEl = document.querySelector('.draggable-element.selected');
        let elementId = null;
        
        if (selectedEl) {
            elementId = parseInt(selectedEl.id.replace('element-', ''));
        } else {
            // Try element container
            const selectedContainerItem = document.querySelector('.page-element-item.selected');
            if (selectedContainerItem) {
                elementId = parseInt(selectedContainerItem.dataset.elementId);
            }
        }
        
        if (elementId) {
            const element = pages[currentPageIndex].elements.find(el => el.id === elementId);
            if (element) {
                copiedElement = JSON.parse(JSON.stringify(element)); // Deep copy
                showStatus('✅ Element copied', 'success');
                e.preventDefault();
            }
        }
    }
    
    // Ctrl+V or Cmd+V - Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedElement) {
            const newElement = {
                ...copiedElement,
                id: Date.now() + Math.random(),
                x: copiedElement.x + 20, // Offset slightly
                y: copiedElement.y + 20
            };
            
            pages[currentPageIndex].elements.push(newElement);
            renderPages();
            renderPageElements();
            showStatus('✅ Element pasted', 'success');
            e.preventDefault();
        }
    }
});

// Click element to select for copy
document.addEventListener('click', (e) => {
    const element = e.target.closest('.draggable-element');
    if (element) {
        document.querySelectorAll('.draggable-element').forEach(el => {
            el.classList.remove('selected');
        });
        element.classList.add('selected');
    }
});

function createElementDiv(element) {
    const div = document.createElement('div');
    div.className = 'draggable-element';
    div.id = `element-${element.id}`;
    div.style.left = element.x + 'px';
    div.style.top = element.y + 'px';
    div.style.width = element.width + 'px';
    div.style.height = element.height + 'px';
    
    // Element content
    const icon = getAssetThumbnail(element.type, element.url);
    
    if (element.type === '3c-button') {
        // 3C Button with image
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <img src="${element.imagePath}" class="w-full h-full object-contain cursor-pointer" title="${element.text} → ${element.url}">
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    } else if (element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
        // 3C Emoji Badge (circular)
        const title = element.url ? `${element.text} → ${element.url}` : element.text;
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <img src="${element.imagePath}" class="w-full h-full object-contain rounded-full cursor-pointer" title="${title}">
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    } else if (element.type === 'button') {
        // Visible button with styling
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="w-full h-full bg-indigo-500 hover:bg-indigo-600 text-white rounded flex items-center justify-center font-bold cursor-pointer">
                ${element.text}
            </div>
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    } else if (element.type === 'hotspot') {
        // Invisible/transparent hotspot
        div.style.background = 'rgba(255, 165, 0, 0.2)';
        div.style.border = '2px dashed orange';
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="text-center">
                <i class="fas fa-mouse-pointer text-orange-500 text-xl mb-1"></i>
                <p class="text-xs font-medium text-gray-700">${element.text}</p>
                <p class="text-xs text-gray-500">Invisible in PDF</p>
            </div>
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    } else if (element.type === 'video' || element.type === 'cloudflare-stream') {
        // Video element with thumbnail and play button overlay
        const thumbnailUrl = element.thumbnailUrl || element.poster || 'https://via.placeholder.com/400x300/667eea/ffffff?text=Video';
        const videoUrl = element.url || element.videoUrl || element.mediaUrl || element.streamId || 'No URL';
        const videoTitle = element.text || element.title || 'Video';
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="relative w-full h-full cursor-pointer" title="${videoTitle} → ${videoUrl}">
                <img src="${thumbnailUrl}" class="w-full h-full object-cover rounded">
                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded pointer-events-none">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <i class="fas fa-play text-purple-600 text-2xl ml-1"></i>
                    </div>
                </div>
            </div>
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    } else if (element.type === 'image' || (element.url && (element.url.startsWith('data:image') || element.url.startsWith('http')))) {
        // Show actual image for image elements
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <img src="${element.url}" class="w-full h-full object-contain">
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    } else {
        const embeddedBadge = element.embedded ? '<span class="text-xs bg-purple-500 text-white px-1 rounded">▶</span>' : '';
        const lockIcon = element.locked ? 'fa-lock' : 'fa-lock-open';
        const lockColor = element.locked ? 'bg-yellow-500' : 'bg-gray-500';
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="toggleLockElement(${element.id})" class="${lockColor} text-white px-2 py-1 rounded text-xs" title="${element.locked ? 'Unlock' : 'Lock'} element">
                    <i class="fas ${lockIcon}"></i>
                </button>
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="text-center">
                <i class="${icon} text-2xl mb-1"></i>
                <p class="text-xs font-medium">${element.text} ${embeddedBadge}</p>
                <p class="text-xs text-gray-500">${element.width}x${element.height}</p>
            </div>
            <div class="resize-handle"></div>
        `;
        if (element.locked) {
            div.classList.add('locked');
            div.style.cursor = 'not-allowed';
        }
    }
    
    // Make draggable
    div.addEventListener('mousedown', startDrag);
    
    // Make resizable
    const resizeHandle = div.querySelector('.resize-handle');
    resizeHandle.addEventListener('mousedown', startResize);
    
    return div;
}

function startDrag(e) {
    // Prevent dragging if clicking on controls, buttons, or resize handle
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.closest('.element-controls')) return;
    
    // Select the element when clicked
    const element = e.target.closest('.draggable-element');
    if (element) {
        const elementId = parseInt(element.id.replace('element-', ''));
        selectElement(elementId);
        
        // Check if element is locked
        const currentPage = pages[currentPageIndex];
        const elementData = currentPage.elements.find(el => el.id === elementId);
        if (elementData && elementData.locked) {
            showStatus('🔒 Element is locked. Unlock it first to move or resize.', 'warning');
            return;
        }
    }
    if (e.target.closest('button')) return;
    if (e.target.tagName === 'BUTTON') return;
    if (e.target.tagName === 'I' && e.target.closest('button')) return;
    
    draggedElement = e.currentTarget;
    const rect = draggedElement.getBoundingClientRect();
    const pageDiv = draggedElement.closest('.pdf-page');
    if (!pageDiv) return;
    
    const pageRect = pageDiv.getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    draggedElement.classList.add('selected');
    draggedElement.style.zIndex = '100'; // Bring to front while dragging
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
    e.stopPropagation();
}

function drag(e) {
    if (!draggedElement || resizing) return;
    
    const pageDiv = draggedElement.closest('.pdf-page');
    if (!pageDiv) return;
    
    const pageRect = pageDiv.getBoundingClientRect();
    const elementRect = draggedElement.getBoundingClientRect();
    
    // Calculate position relative to page
    let x = e.clientX - pageRect.left - dragOffset.x;
    let y = e.clientY - pageRect.top - dragOffset.y;
    
    // Get page dimensions
    const pageWidth = pageDiv.offsetWidth;
    const pageHeight = pageDiv.offsetHeight;
    const elementWidth = elementRect.width;
    const elementHeight = elementRect.height;
    
    // Apply very soft constraints - allow elements to move freely with minimal restrictions
    // Allow 80% of element to go outside the page boundaries for easier positioning
    const minX = -(elementWidth * 0.8);
    const maxX = pageWidth + (elementWidth * 0.3);
    const minY = -(elementHeight * 0.8);
    const maxY = pageHeight + (elementHeight * 0.3);
    
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    
    draggedElement.style.left = x + 'px';
    draggedElement.style.top = y + 'px';
    
    // Update element data
    const elementId = parseInt(draggedElement.id.replace('element-', ''));
    const element = pages[currentPageIndex].elements.find(el => el.id === elementId);
    if (element) {
        element.x = x;
        element.y = y;
    }
}

function stopDrag() {
    if (draggedElement) {
        draggedElement.classList.remove('selected');
        draggedElement.style.zIndex = '10'; // Reset z-index
        draggedElement = null;
    }
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

function startResize(e) {
    e.stopPropagation();
    
    draggedElement = e.target.closest('.draggable-element');
    
    // Check if element is locked
    const elementId = parseInt(draggedElement.id.replace('element-', ''));
    const currentPage = pages[currentPageIndex];
    const elementData = currentPage.elements.find(el => el.id === elementId);
    if (elementData && elementData.locked) {
        showStatus('🔒 Element is locked. Unlock it first to move or resize.', 'warning');
        return;
    }
    
    resizing = true;
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    
    e.preventDefault();
}

function resize(e) {
    if (!draggedElement) return;
    
    const pageDiv = draggedElement.closest('.pdf-page');
    const pageRect = pageDiv.getBoundingClientRect();
    const elementRect = draggedElement.getBoundingClientRect();
    
    let width = e.clientX - elementRect.left;
    let height = e.clientY - elementRect.top;
    
    // Minimum size
    width = Math.max(80, width);
    height = Math.max(40, height);
    
    draggedElement.style.width = width + 'px';
    draggedElement.style.height = height + 'px';
    
    // Update size display
    const sizeText = draggedElement.querySelector('.text-gray-500');
    if (sizeText) {
        sizeText.textContent = `${Math.round(width)}x${Math.round(height)}`;
    }
    
    // Update element data
    const elementId = parseInt(draggedElement.id.replace('element-', ''));
    const element = pages[currentPageIndex].elements.find(el => el.id === elementId);
    if (element) {
        element.width = width;
        element.height = height;
    }
}

function stopResize() {
    resizing = false;
    draggedElement = null;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}

window.deleteElement = function(elementId) {
    const currentPage = pages[currentPageIndex];
    const element = currentPage.elements.find(el => el.id === elementId);
    
    // Check if element is locked
    if (element && element.locked) {
        showStatus('🔒 Element is locked. Unlock it first to delete.', 'warning');
        return;
    }
    
    currentPage.elements = currentPage.elements.filter(el => el.id !== elementId);
    renderPages();
    renderPageElements();
    showStatus('Element deleted', 'info');
}

// Toggle lock state of an element
window.toggleLockElement = function(elementId) {
    const currentPage = pages[currentPageIndex];
    const element = currentPage.elements.find(el => el.id === elementId);
    
    if (element) {
        element.locked = !element.locked;
        renderPages();
        renderPageElements();
        showStatus(element.locked ? '🔒 Element locked' : '🔓 Element unlocked', 'success');
    }
}

// ============================================
// COPY/PASTE FUNCTIONALITY
// ============================================

function setupCopyPasteShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Check if we're not in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl+C or Cmd+C - Copy selected element
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            copySelectedElement();
        }
        
        // Ctrl+V or Cmd+V - Paste copied element
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            pasteElement();
        }
    });
}

function copySelectedElement() {
    if (!selectedElementId) {
        showStatus('⚠️ Select an element first (click on it)', 'warning');
        return;
    }
    
    const currentPage = pages[currentPageIndex];
    const element = currentPage.elements.find(el => el.id === selectedElementId);
    
    if (!element) {
        showStatus('⚠️ Element not found', 'warning');
        return;
    }
    
    // Deep copy the element
    copiedElement = JSON.parse(JSON.stringify(element));
    showStatus('✅ Element copied! Press Ctrl+V to paste', 'success');
    console.log('Element copied:', copiedElement);
}

function pasteElement() {
    if (!copiedElement) {
        showStatus('⚠️ No element copied. Select and copy an element first (Ctrl+C)', 'warning');
        return;
    }
    
    const currentPage = pages[currentPageIndex];
    
    // Create new element with new ID and slightly offset position
    const newElement = {
        ...copiedElement,
        id: Date.now() + Math.random(),
        x: copiedElement.x + 20, // Offset by 20px
        y: copiedElement.y + 20
    };
    
    currentPage.elements.push(newElement);
    
    renderPages();
    renderPageElements();
    showStatus('✅ Element pasted!', 'success');
    console.log('Element pasted:', newElement);
}

function selectElement(elementId) {
    selectedElementId = elementId;
    
    // Update visual selection in sidebar
    const container = document.getElementById('pageElementsContainer');
    if (container) {
        container.querySelectorAll('.page-element-item').forEach(el => {
            el.classList.remove('selected');
        });
        const selectedItem = container.querySelector(`[data-element-id="${elementId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
    }
    
    // Update visual selection on canvas
    document.querySelectorAll('.draggable-element').forEach(el => {
        el.classList.remove('selected');
    });
    const canvasElement = document.getElementById(`element-${elementId}`);
    if (canvasElement) {
        canvasElement.classList.add('selected');
    }
}

// ============================================
// PDF GENERATION
// ============================================

async function generatePDF() {
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    
    try {
        // 1. Validate Project Settings
        const title = document.getElementById('pdfTitle').value.trim();
        const author = document.getElementById('pdfAuthor').value.trim();
        
        if (!title || !author) {
            alert('⚠️ Please complete Project Settings\n\nRequired fields:\n• PDF Title\n• Author Name\n\nClick "Project Settings" below to add this information.');
            return;
        }
        
        if (pages.length === 0) {
            showStatus('⚠️ Please add at least one page', 'warning');
            alert('⚠️ Please add at least one page before generating PDF.');
            return;
        }
        
        // 4. Confirm if updating existing PDF
        if (currentProjectId && currentPdfUrl) {
            const confirmUpdate = confirm(
                '📄 Update Existing PDF?\n\n' +
                'This project already has a published PDF:\n' +
                `"${title}"\n\n` +
                '⚠️ WARNING: This will override the existing PDF!\n\n' +
                'Click OK to update, or Cancel to keep the current version.'
            );
            
            if (!confirmUpdate) {
                showStatus('ℹ️ PDF generation cancelled', 'info');
                return;
            }
        }
        
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Publishing...';
        
        // Save current state and mark as published
        showStatus('💾 Saving and publishing...', 'info');
        
        // First save current state (silent mode to avoid double alerts)
        const projectData = {
            pages: pages,
            assets: assets,
            currentPageIndex: currentPageIndex,
            settings: {
                title: title,
                author: author,
                pageSize: document.getElementById('pageSize').value,
                orientation: document.getElementById('orientation').value,
                embeddedMode: embeddedMode,
                flipbookMode: flipbookMode,
                versionNumber: document.getElementById('versionNumber')?.value || 'v1.0',
                partNumber: document.getElementById('partNumber')?.value || '',
                folderName: document.getElementById('folderName')?.value || '',
                subfolderName: document.getElementById('subfolderName')?.value || ''
            }
        };
        
        let savedProject;
        if (currentProjectId) {
            savedProject = await updateProjectDB(currentProjectId, projectData);
        } else {
            savedProject = await saveProjectDraft(projectData);
        }
        
        currentProjectId = savedProject.id;
        
        // Update URL with project ID
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('project', currentProjectId);
        window.history.replaceState({}, '', newUrl);
        
        // Update status to published (NO PDF generation)
        await publishProjectDB(currentProjectId, null, projectData);
        
        // 2. Success message
        showStatus('✅ Project published! Click "Export JSON" to download.', 'success');
        alert('✅ PDF Generated Successfully!\n\n' +
              `Project: "${title}"\n` +
              `Pages: ${pages.length}\n` +
              `Status: Published\n\n` +
              'Click "Export JSON" to download your project.');
        
        // Show success message
        const resultDiv = document.getElementById('resultArea');
        if (resultDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded p-4">
                    <h3 class="font-bold text-green-800 mb-2">
                        <i class="fas fa-check-circle mr-2"></i>Project Published!
                    </h3>
                    <p class="text-sm text-green-700 mb-3">
                        Your interactive flipbook is ready. Click "Export JSON" to download 
                        and upload to your 3C Content Library.
                    </p>
                    <button onclick="exportProjectJSON()" 
                            class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
                        <i class="fas fa-download mr-2"></i>Export JSON
                    </button>
                </div>
            `;
        }
        
    } catch (error) {
        // 3. Explicit error message
        console.error('Publish error:', error);
        const errorMsg = error.message || 'Unknown error occurred';
        showStatus('❌ Error: ' + errorMsg, 'error');
        alert('❌ PDF Generation Failed\n\n' +
              'Error Details:\n' + errorMsg + '\n\n' +
              'Possible causes:\n' +
              '• Database connection issue\n' +
              '• Missing project data\n' +
              '• Permission denied\n\n' +
              'Please check the console (F12) for more details.');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

function getPageHeight() {
    const pageSize = document.getElementById('pageSize').value;
    const orientation = document.getElementById('orientation').value;
    
    const sizes = {
        'A4': { portrait: 842, landscape: 595 },
        'Letter': { portrait: 792, landscape: 612 },
        'Legal': { portrait: 1008, landscape: 612 }
    };
    
    return sizes[pageSize][orientation];
}

// ============================================
// UI HELPERS
// ============================================


function showStatus(message, type) {
    const statusArea = document.getElementById('statusArea');
    statusArea.classList.remove('hidden');
    
    const colors = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800'
    };
    
    statusArea.innerHTML = `
        <div class="${colors[type]} border rounded-lg p-3">
            <p class="text-xs font-medium">${message}</p>
        </div>
    `;
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusArea.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Upload video to Cloudflare Stream
 */
async function uploadToStream(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    
    const response = await fetch(`${API_BASE}/api/upload-stream`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }
    
    return await response.json();
}

/**
 * Upload media to R2
 */
async function uploadToR2(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'interactive/2026');
    
    const response = await fetch(`${API_BASE}/api/upload-media`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }
    
    const data = await response.json();
    return { url: data.url };
}

function showResults(result) {
    const resultArea = document.getElementById('resultArea');
    resultArea.classList.remove('hidden');
    
    const pdfUrl = result.browserUrl || `${API_BASE}${result.apiViewUrl}`;
    const filename = result.filename || 'interactive-pdf.pdf';
    
    // Store current PDF URL
    currentPdfUrl = pdfUrl;
    
    const projectInfo = currentProjectId ? 
        `<p class="text-xs text-purple-600 font-medium"><i class="fas fa-info-circle mr-1"></i>Project ID: ${currentProjectId}</p>` : '';
    
    resultArea.innerHTML = `
        <h4 class="text-sm font-bold text-gray-800 mb-2">✅ PDF Generated!</h4>
        ${projectInfo}
        <div class="space-y-2">
            <button onclick="saveToDashboard()" 
                class="block w-full bg-green-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-green-600 font-medium">
                <i class="fas fa-save mr-1"></i>${currentProjectId ? 'Update in Dashboard' : 'Save to Dashboard'}
            </button>
            <button onclick="downloadPDF('${pdfUrl}', '${filename}')" 
                class="block w-full bg-blue-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-blue-600">
                <i class="fas fa-download mr-1"></i>Download PDF
            </button>
            ${result.browserUrl ? `
                <a href="${result.browserUrl}" target="_blank" 
                    class="block w-full bg-purple-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-purple-600">
                    <i class="fas fa-external-link-alt mr-1"></i>Open in Browser
                </a>
            ` : ''}
        </div>
        <div class="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
            <p><strong>Pages:</strong> ${pages.length}</p>
            <p><strong>Size:</strong> ${result.size ? (result.size / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
        </div>
    `;
}

function hideResults() {
    const resultArea = document.getElementById('resultArea');
    resultArea.classList.add('hidden');
}

// ============================================
// PDF PREVIEW AND DOWNLOAD
// ============================================

function showPDFPreview(pdfUrl) {
    const previewSection = document.getElementById('pdfPreview');
    previewSection.innerHTML = `
        <div class="pdf-preview-container">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-bold text-gray-800">
                    <i class="fas fa-eye text-purple-600 mr-2"></i>PDF Preview
                </h3>
                <button onclick="closePDFPreview()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <iframe src="${pdfUrl}" width="100%" height="600px"></iframe>
        </div>
    `;
    previewSection.style.display = 'block';
    
    // Scroll to preview
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePDFPreview() {
    const previewSection = document.getElementById('pdfPreview');
    previewSection.style.display = 'none';
    previewSection.innerHTML = '';
}

function downloadPDF(pdfUrl, filename) {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showStatus('📥 Download started!', 'success');
}

// Save to Dashboard
async function saveToDashboard() {
    try {
        showStatus('💾 Saving to dashboard...', 'info');
        
        if (!currentPdfUrl) {
            showStatus('⚠️ Please generate PDF first', 'warning');
            return;
        }
        
        const title = document.getElementById('pdfTitle').value || 'Untitled PDF';
        
        const projectData = {
            id: currentProjectId, // Will be null for new projects
            title: title,
            pdf_url: currentPdfUrl,
            page_count: pages.length,
            embedded_mode: embeddedMode,
            flipbook_mode: flipbookMode,
            presentation_mode: presentationMode,
            project_json: JSON.stringify({ 
                pages: pages,
                assets: assts,
                settings: { 
                    embeddedMode, 
                    flipbookMode,
                    presentationMode,
                    pageSize: document.getElementById('pageSize').value,
                    orientation: document.getElementById('orientation').value,
                    author: document.getElementById('pdfAuthor').value
                } 
            }),
            updated_at: new Date().toISOString()
        };
        
        const endpoint = currentProjectId ? '/api/update-project' : '/api/save-project';
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Store project ID for future updates
            if (!currentProjectId && result.id) {
                currentProjectId = result.id;
            }
            
            const action = currentProjectId ? 'updated' : 'saved';
            showStatus(`✅ Project ${action} to dashboard! ID: ${currentProjectId}`, 'success');
            
            // Update button text
            showResults({ browserUrl: currentPdfUrl, size: 0 });
            
            // Update URL without reload
            const newUrl = `${window.location.pathname}?project=${currentProjectId}`;
            window.history.pushState({ projectId: currentProjectId }, '', newUrl);
            
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save');
        }
    } catch (error) {
        console.error('Save error:', error);
        showStatus('❌ Failed to save: ' + error.message, 'error');
    }
}

// Load project from URL or ID
async function loadProjectFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
        await loadProject(projectId);
    }
}

async function loadProject(projectId) {
    try {
        showStatus('📂 Loading project...', 'info');
        
        // Load directly from Supabase (bypasses Edge Function timeout issues)
        const project = await getProjectDB(projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }
        
        // Set project ID
        currentProjectId = project.id;
        currentPdfUrl = project.pdf_url;
        
        // Load project data from project_json column
        const projectJson = typeof project.project_json === 'string' 
            ? JSON.parse(project.project_json) 
            : project.project_json;
        
        // Restore pages and assets
        pages = projectJson.pages || [];
        assets = projectJson.assets || [];
        currentPageIndex = 0;
        
        // Restore settings
        if (projectJson.settings) {
            embeddedMode = projectJson.settings.embeddedMode || false;
            flipbookMode = projectJson.settings.flipbookMode !== undefined ? projectJson.settings.flipbookMode : true;
            presentationMode = projectJson.settings.presentationMode !== undefined ? projectJson.settings.presentationMode : false;
            document.getElementById('pageSize').value = projectJson.settings.pageSize || 'A4';
            document.getElementById('orientation').value = projectJson.settings.orientation || 'portrait';
            document.getElementById('pdfTitle').value = projectJson.settings.title || project.title || 'Untitled PDF';
            document.getElementById('pdfAuthor').value = projectJson.settings.author || project.author || 'PDF Creator';
            
            // Restore description if field exists
            const descField = document.getElementById('pdfDescription');
            if (descField) {
                descField.value = projectJson.settings.description || project.description || '';
            }
            
            // Restore folder and subfolder fields
            console.log('Loading folder/subfolder:', {
                folderName: projectJson.settings.folderName,
                subfolderName: projectJson.settings.subfolderName
            });
            
            if (document.getElementById('folderName')) {
                document.getElementById('folderName').value = projectJson.settings.folderName || '';
                console.log('Set folder field to:', document.getElementById('folderName').value);
            }
            if (document.getElementById('subfolderName')) {
                document.getElementById('subfolderName').value = projectJson.settings.subfolderName || '';
                console.log('Set subfolder field to:', document.getElementById('subfolderName').value);
            }
            
            // Update folder path preview
            updateFolderPathPreview();
            
            // Update toggles
            document.getElementById('embeddedMode').checked = embeddedMode;
            document.getElementById('flipbookMode').checked = flipbookMode;
            document.getElementById('presentationMode').checked = presentationMode;
            
            // Trigger toggle functions to update UI state
            toggleFlipbookMode();
            togglePresentationMode();
        }
        
        // Render everything
        renderPages();
        renderPageThumbnails();
        renderAssetLibrary();
        updatePageCounter();
        
        showStatus(`✅ Project loaded: ${project.title || 'Untitled'}`, 'success');
        
    } catch (error) {
        console.error('Load error:', error);
        showStatus('❌ Failed to load project: ' + error.message, 'error');
    }
}

// ============================================
// PROJECT RESET
// ============================================

function resetProject() {
    // Confirmation dialog
    const confirmReset = confirm(
        '⚠️ DANGER: This will completely reset your project!\n\n' +
        'This will:\n' +
        '• Clear all pages and elements\n' +
        '• Clear all assets\n' +
        '• Reset all settings\n' +
        '• Clear project ID\n' +
        '• Remove from URL\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Type "RESET" to confirm:'
    );
    
    if (!confirmReset) return;
    
    // Double confirmation with text
    const verifyText = prompt('Type "RESET" to confirm this action:');
    if (verifyText !== 'RESET') {
        showStatus('❌ Reset cancelled', 'info');
        return;
    }
    
    try {
        // Clear all project data
        pages = [];
        assets = [];
        currentPageIndex = 0;
        currentProjectId = null;
        currentPdfUrl = null;
        
        // Clear all form fields
        document.getElementById('pdfTitle').value = '';
        document.getElementById('pdfAuthor').value = '';
        document.getElementById('folderName').value = '';
        document.getElementById('subfolderName').value = '';
        document.getElementById('pdfDescription').value = '';
        document.getElementById('versionNumber').value = 'v1.0';
        document.getElementById('pageSize').value = 'A4';
        document.getElementById('orientation').value = 'portrait';
        
        // Reset toggles
        document.getElementById('embeddedMode').checked = false;
        document.getElementById('flipbookMode').checked = false;
        embeddedMode = false;
        flipbookMode = false;
        
        // Clear URL parameters
        const url = new URL(window.location);
        url.searchParams.delete('project');
        window.history.pushState({}, '', url);
        
        // Clear localStorage
        localStorage.removeItem('pdfCreatorDraft');
        
        // Update folder path preview
        updateFolderPathPreview();
        
        // Re-render everything
        renderPages();
        renderPageThumbnails();
        renderAssetLibrary();
        updatePageCounter();
        
        // Hide results and status
        hideResults();
        hideStatus();
        
        showStatus('✅ Project reset successfully! Ready for new project.', 'success');
        
        // Close settings sidebar
        closeSettingsSidebar();
        
    } catch (error) {
        console.error('Reset error:', error);
        showStatus('❌ Reset failed: ' + error.message, 'error');
    }
}

// ============================================
// JSON EXPORT
// ============================================

// ============================================
// FLIPBOOK PREVIEW
// ============================================

function previewFlipbook() {
    if (!flipbookMode) {
        showStatus('⚠️ Enable Flipbook Mode first', 'warning');
        return;
    }
    
    if (pages.length === 0) {
        showStatus('⚠️ Add some pages first', 'warning');
        return;
    }
    
    // Create manifest from CURRENT data (not database)
    const manifest = {
        title: document.getElementById('pdfTitle').value || 'Interactive Flipbook',
        author: document.getElementById('pdfAuthor').value || 'Chef',
        pages: pages.map((page, index) => ({
            pageNumber: index + 1,
            background: page.backgroundData,
            hotspots: page.elements.map(el => ({
                type: el.type || 'button',
                title: el.label || el.text || 'Interactive Element',
                action: el.action || 'link',
                url: el.url || el.link || '#',
                videoUrl: el.videoUrl,
                streamId: el.streamId,
                mediaUrl: el.mediaUrl,
                bounds: {
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height
                }
            }))
        })),
        settings: {
            pageSize: document.getElementById('pageSize').value,
            orientation: document.getElementById('orientation').value,
            flipbookMode: flipbookMode
        },
        createdAt: new Date().toISOString()
    };
    
    // Store manifest in sessionStorage for immediate loading
    console.log('Storing manifest to sessionStorage:', {
        pages: manifest.pages.length,
        title: manifest.title,
        manifestSize: JSON.stringify(manifest).length
    });
    sessionStorage.setItem('flipbookManifest', JSON.stringify(manifest));
    
    // Verify it was stored
    const stored = sessionStorage.getItem('flipbookManifest');
    console.log('Verification - manifest stored:', !!stored);
    
    // Open flipbook in new tab with project ID
    let flipbookUrl = 'flipbook.html';
    
    // If we have a current project ID, pass it to flipbook
    if (currentProjectId) {
        flipbookUrl += `?project=${currentProjectId}`;
        console.log('Opening flipbook with project ID:', currentProjectId);
    } else {
        console.log('No project ID - opening flipbook without project data');
    }
    
    window.open(flipbookUrl, '_blank');
    
    showStatus('✅ Opening flipbook viewer...', 'success');
}

// Initialize collapsible sections and render initial state
setTimeout(() => {
    document.getElementById('assetLibrary').style.maxHeight = '500px';
    renderPageElements(); // Initialize element container
}, 100);

// ============================================
// PRESENTATION PREVIEW
// ============================================

function previewPresentation() {
    if (!presentationMode) {
        showStatus('⚠️ Enable Presentation Mode first', 'warning');
        return;
    }
    
    if (pages.length === 0) {
        showStatus('⚠️ Add some pages first', 'warning');
        return;
    }
    
    // Create manifest from CURRENT data (not database)
    const manifest = {
        title: document.getElementById('pdfTitle').value || 'Interactive Presentation',
        author: document.getElementById('pdfAuthor').value || 'Chef',
        pages: pages.map((page, index) => ({
            pageNumber: index + 1,
            background: page.backgroundData,
            hotspots: page.elements.map(el => ({
                type: el.type || 'button',
                title: el.label || el.text || 'Interactive Element',
                action: el.action || 'link',
                url: el.url || el.link || '#',
                videoUrl: el.videoUrl,
                streamId: el.streamId,
                mediaUrl: el.mediaUrl,
                bounds: {
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height
                }
            }))
        })),
        settings: {
            pageSize: document.getElementById('pageSize').value,
            orientation: document.getElementById('orientation').value,
            presentationMode: presentationMode
        },
        createdAt: new Date().toISOString()
    };
    
    // Store manifest in sessionStorage for immediate loading
    console.log('Storing manifest to sessionStorage:', {
        pages: manifest.pages.length,
        title: manifest.title,
        manifestSize: JSON.stringify(manifest).length
    });
    sessionStorage.setItem('presentationManifest', JSON.stringify(manifest));
    
    // Verify it was stored
    const stored = sessionStorage.getItem('presentationManifest');
    console.log('Verification - manifest stored:', !!stored);
    
    // Open presentation in new tab with project ID
    let presentationUrl = 'presentation-viewer.html';
    
    // If we have a current project ID, pass it to presentation
    if (currentProjectId) {
        presentationUrl += `?project=${currentProjectId}`;
        console.log('Opening presentation with project ID:', currentProjectId);
    } else {
        console.log('No project ID - opening presentation without project data');
    }
    
    window.open(presentationUrl, '_blank');
    
    showStatus('✅ Opening presentation viewer...', 'success');
}

// Initialize collapsible sections and render initial state
setTimeout(() => {
    document.getElementById('assetLibrary').style.maxHeight = '500px';
    renderPageElements(); // Initialize element container
}, 100);

// ============================================
// CUSTOM 3C BUTTON/EMOJI UPLOAD
// ============================================

function handleCustom3CUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const url = prompt('Enter URL for this custom 3C asset (optional - leave empty for decoration only):');
    const name = prompt('Enter a name for this asset:', file.name.replace(/\.[^/.]+$/, ""));
    
    if (!name) {
        showStatus('❌ Asset name is required', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const asset = {
            id: Date.now(),
            type: url ? '3c-custom' : '3c-custom-decoration',
            url: url || null,
            imagePath: e.target.result, // Base64 data URL
            name: name,
            thumbnail: e.target.result,
            embedded: false
        };
        
        assets.push(asset);
        renderAssetLibrary();
        showStatus(`✅ ${name} uploaded${url ? ' with URL' : ' as decoration'}`, 'success');
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    event.target.value = '';
}

// ============================================
// EXTERNAL LINK WARNING POPUP
// ============================================

function showExternalLinkWarning(url) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        
        const popup = document.createElement('div');
        popup.className = 'bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative';
        popup.innerHTML = `
            <button onclick="this.closest('.fixed').remove()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
            <div class="text-center mb-4">
                <i class="fas fa-external-link-alt text-5xl text-blue-600 mb-3"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2">External Link</h3>
                <p class="text-sm text-gray-600 mb-3">You are about to open an external link:</p>
                <div class="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                    <p class="text-sm text-blue-800 break-all">${url}</p>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium transition">
                    <i class="fas fa-times mr-1"></i>Cancel
                </button>
                <button id="proceedLink" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">
                    <i class="fas fa-check mr-1"></i>Continue
                </button>
            </div>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        document.getElementById('proceedLink').onclick = () => {
            overlay.remove();
            resolve(true);
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        };
    });
}

// ============================================
// PREVIEW MODAL WITH PAGE NAVIGATION
// ============================================

let previewCurrentPage = 0;

// ============================================
// FLIPBOOK VIEWER
// ============================================

function openInFlipbook() {
    if (pages.length === 0) {
        showStatus('⚠️ Add at least one page first', 'warning');
        return;
    }
    
    // Check if project has been saved (has project ID)
    if (!currentProjectId) {
        showStatus('⚠️ Please save your project first before viewing in flipbook', 'warning');
        alert('⚠️ Save Required\n\nPlease save your project first by clicking the "Save" button.\nThis will generate a project ID needed to view the flipbook.');
        return;
    }
    
    // Open flipbook with project ID
    const flipbookUrl = `flipbook.html?project=${currentProjectId}`;
    window.open(flipbookUrl, '_blank');
    
    showStatus('✅ Opening in flipbook viewer...', 'success');
}

// ============================================
// PRESENTATION VIEWER
// ============================================

function openInPresentation() {
    if (pages.length === 0) {
        showStatus('⚠️ Add at least one page first', 'warning');
        return;
    }
    
    // Check if project has been saved (has project ID)
    if (!currentProjectId) {
        showStatus('⚠️ Please save your project first before viewing in presentation', 'warning');
        alert('⚠️ Save Required\n\nPlease save your project first by clicking the "Save" button.\nThis will generate a project ID needed to view the flipbook.');
        return;
    }
    
    // Open presentation with project ID
    const presentationUrl = `presentation-viewer.html?project=${currentProjectId}`;
    window.open(presentationUrl, '_blank');
    
    showStatus('✅ Opening in presentation viewer...', 'success');
}

// ============================================
// PDF PREVIEW (OLD)
// ============================================

function previewPDF() {
    if (pages.length === 0) {
        showStatus('⚠️ No pages to preview. Add a page first!', 'warning');
        return;
    }
    
    previewCurrentPage = 0;
    const modal = document.getElementById('previewModal');
    modal.classList.add('active');
    
    updatePreviewPage();
    showStatus('📖 Preview mode - Use navigation to flip through pages', 'info');
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    modal.classList.remove('active');
}

function updatePreviewPage() {
    const container = document.getElementById('previewPageContainer');
    const currentPageSpan = document.getElementById('previewCurrentPage');
    const totalPagesSpan = document.getElementById('previewTotalPages');
    const prevBtn = document.getElementById('previewPrevBtn');
    const nextBtn = document.getElementById('previewNextBtn');
    
    // Update page counter
    currentPageSpan.textContent = previewCurrentPage + 1;
    totalPagesSpan.textContent = pages.length;
    
    // Update navigation buttons
    prevBtn.disabled = previewCurrentPage === 0;
    nextBtn.disabled = previewCurrentPage === pages.length - 1;
    
    // Render current page
    const page = pages[previewCurrentPage];
    
    // Get page dimensions
    const pageSize = document.getElementById('pageSize')?.value || 'A4';
    const orientation = document.getElementById('orientation')?.value || 'portrait';
    
    let width, height;
    if (pageSize === 'A4') {
        width = orientation === 'portrait' ? 595 : 842;
        height = orientation === 'portrait' ? 842 : 595;
    } else if (pageSize === 'Letter') {
        width = orientation === 'portrait' ? 612 : 792;
        height = orientation === 'portrait' ? 792 : 612;
    } else {
        width = 595;
        height = 842;
    }
    
    const pageDimensions = { width, height };
    
    container.innerHTML = '';
    container.style.width = pageDimensions.width + 'px';
    container.style.height = pageDimensions.height + 'px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // Add background
    if (page.backgroundData) {
        container.style.backgroundImage = `url('${page.backgroundData}')`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
    } else {
        container.style.backgroundColor = '#ffffff';
    }
    
    // Add elements
    page.elements.forEach(element => {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = element.x + 'px';
        el.style.top = element.y + 'px';
        el.style.width = element.width + 'px';
        el.style.height = element.height + 'px';
        el.style.cursor = element.url ? 'pointer' : 'default';
        
        if (element.type === '3c-button' || element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
            const img = document.createElement('img');
            img.src = element.imagePath;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            if (element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
                img.style.borderRadius = '50%';
            }
            el.appendChild(img);
        } else if (element.type === 'button') {
            el.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            el.style.color = 'white';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.borderRadius = '8px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '14px';
            el.textContent = element.text;
        } else if (element.type === 'image') {
            const img = document.createElement('img');
            img.src = element.url;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            el.appendChild(img);
        } else if (element.type === 'video') {
            el.style.background = 'rgba(0, 0, 0, 0.8)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.color = 'white';
            el.style.fontSize = '12px';
            el.style.borderRadius = '8px';
            el.innerHTML = '<i class="fas fa-play-circle text-3xl mb-2"></i><br>Video';
        } else if (element.type === 'audio') {
            el.style.background = 'rgba(59, 130, 246, 0.1)';
            el.style.border = '2px solid #3b82f6';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.color = '#3b82f6';
            el.style.fontSize = '12px';
            el.style.borderRadius = '8px';
            el.innerHTML = '<i class="fas fa-music text-2xl"></i>';
        } else if (element.type === 'hotspot') {
            el.style.background = 'transparent';
            el.style.border = '2px dashed rgba(255, 165, 0, 0.3)';
        }
        
        // Add click handler for elements with URLs
        if (element.url) {
            el.title = `Click to visit: ${element.url}`;
            el.onclick = () => {
                console.log('🔗 Editor preview - Opening URL:', element.url);
                console.log('   Element type:', element.type);
                console.log('   Element text:', element.text);
                window.open(element.url, '_blank');
            };
            el.style.transition = 'transform 0.2s';
            el.onmouseenter = () => {
                el.style.transform = 'scale(1.05)';
            };
            el.onmouseleave = () => {
                el.style.transform = 'scale(1)';
            };
        }
        
        container.appendChild(el);
    });
}

function previousPreviewPage() {
    if (previewCurrentPage > 0) {
        previewCurrentPage--;
        updatePreviewPage();
    }
}

function nextPreviewPage() {
    if (previewCurrentPage < pages.length - 1) {
        previewCurrentPage++;
        updatePreviewPage();
    }
}

// Handle keyboard navigation in preview
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('previewModal');
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        previousPreviewPage();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextPreviewPage();
    } else if (e.key === 'Escape') {
        closePreview();
    }
});

// ============================================
// COLLAPSIBLE SECTIONS
// ============================================

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + 'Icon');
    
    if (!section) return;
    
    // Check if section is currently visible
    // Handle both 'none' and empty string (default hidden state)
    const isVisible = section.style.display === 'block';
    
    if (isVisible) {
        // Hide it
        section.style.display = 'none';
        if (icon) {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-right');
        }
    } else {
        // Show it - display: block puts element in normal flow
        // This automatically pushes content below it down
        section.style.display = 'block';
        if (icon) {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-down');
        }
    }
}

// Open modal
function openSupabaseModal() {
    const modal = document.getElementById('supabaseModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Load existing credentials if available
    if (window.ENV_CONFIG?.supabase) {
        document.getElementById('supabaseUrl').value = window.ENV_CONFIG.supabase.url || '';
        document.getElementById('supabaseAnonKey').value = window.ENV_CONFIG.supabase.anonKey || '';
        document.getElementById('supabaseServiceKey').value = window.ENV_CONFIG.supabase.serviceKey || '';
    }
}

// Close modal
function closeSupabaseModal() {
    const modal = document.getElementById('supabaseModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    hideModalStatus();
}

// Show status message in modal
function showModalStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    statusDiv.classList.remove('hidden', 'bg-green-900/30', 'border-green-500', 'bg-red-900/30', 'border-red-500', 'bg-blue-900/30', 'border-blue-500');
    statusIcon.classList.remove('text-green-400', 'text-red-400', 'text-blue-400', 'fa-check-circle', 'fa-times-circle', 'fa-spinner', 'fa-spin');
    
    if (type === 'success') {
        statusDiv.classList.add('bg-green-900/30', 'border', 'border-green-500');
        statusIcon.classList.add('text-green-400', 'fa-check-circle');
    } else if (type === 'error') {
        statusDiv.classList.add('bg-red-900/30', 'border', 'border-red-500');
        statusIcon.classList.add('text-red-400', 'fa-times-circle');
    } else {
        statusDiv.classList.add('bg-blue-900/30', 'border', 'border-blue-500');
        statusIcon.classList.add('text-blue-400', 'fa-spinner', 'fa-spin');
    }
    
    statusText.textContent = message;
}

function hideModalStatus() {
    document.getElementById('connectionStatus')?.classList.add('hidden');
}

// Test connection
async function testConnection() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const anonKey = document.getElementById('supabaseAnonKey').value.trim();
    
    if (!url || !anonKey) {
        showModalStatus('Please enter URL and Anon Key', 'error');
        return;
    }
    
    showModalStatus('Testing connection...', 'loading');
    
    try {
        const response = await fetch(`${url}/rest/v1/`, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });
        
        if (response.ok || response.status === 404) {
            showModalStatus('✅ Connection successful!', 'success');
        } else {
            showModalStatus(`❌ Connection failed: ${response.status}`, 'error');
        }
    } catch (error) {
        showModalStatus(`❌ Error: ${error.message}`, 'error');
    }
}

// Test connection and update status indicator
async function testSupabaseConnectionStatus() {
    const iconEl = document.getElementById('supabaseIcon');
    
    // Check if config exists
    if (!window.ENV_CONFIG?.supabase?.url || !window.ENV_CONFIG?.supabase?.anonKey) {
        iconEl.className = 'fas fa-circle text-yellow-400 animate-pulse';
        // textEl.textContent = 'Not Configured';
        return;
    }
    
    try {
        const response = await fetch(`${window.ENV_CONFIG.supabase.url}/rest/v1/`, {
            headers: {
                'apikey': window.ENV_CONFIG.supabase.anonKey,
                'Authorization': `Bearer ${window.ENV_CONFIG.supabase.anonKey}`
            }
        });
        
        if (response.ok || response.status === 404) {
            iconEl.className = 'fas fa-circle text-green-400';
            // textEl.textContent = 'Connected';
        } else {
            iconEl.className = 'fas fa-circle text-red-400';
            // textEl.textContent = 'Error';
        }
    } catch (error) {
        iconEl.className = 'fas fa-circle text-red-400';
        // textEl.textContent = 'Error';
        console.error('Supabase connection test failed:', error);
    }
}

// Setup status button click handler
document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('supabaseStatus');
    
    if (statusEl) {
        statusEl.onclick = function() {
            // Check if credentials exist
            if (!window.ENV_CONFIG?.supabase?.url || !window.ENV_CONFIG?.supabase?.anonKey) {
                // No credentials - open modal
                openSupabaseModal();
            } else {
                // Has credentials - test connection then open modal
                testSupabaseConnectionStatus();
                openSupabaseModal();
            }
        };
    }
    
    // Auto-test on load
    testSupabaseConnectionStatus();
});
