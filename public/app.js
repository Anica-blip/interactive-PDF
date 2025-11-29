// Global state
let pages = [];
let currentPageIndex = 0;
let assets = [];
let draggedElement = null;
let dragOffset = { x: 0, y: 0 };
let resizing = false;
let embeddedMode = false; // Toggle between embedded and link mode
let flipbookMode = false; // Toggle for magazine-style flipbook

// API Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Interactive PDF Creator v2 initialized');
    document.getElementById('pdfTitle').value = 'My Interactive PDF';
    document.getElementById('pdfAuthor').value = 'PDF Creator';
    
    // Add first page automatically
    addNewPage();
});

// Health check
document.getElementById('healthCheck').addEventListener('click', async () => {
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
    flipbookMode = document.getElementById('flipbookMode').checked;
    const description = document.getElementById('flipbookDescription');
    
    if (flipbookMode) {
        description.textContent = '📖 Magazine-style page turning enabled!';
        description.classList.add('text-purple-700', 'font-semibold');
        showStatus('📖 Flipbook mode ON: Realistic page turning like a magazine!', 'success');
    } else {
        description.textContent = '📖 Realistic page turning like a magazine';
        description.classList.remove('text-purple-700', 'font-semibold');
        showStatus('📄 Standard PDF mode', 'info');
    }
}

// ============================================
// PAGE MANAGEMENT
// ============================================

function addNewPage() {
    const pageId = Date.now();
    const page = {
        id: pageId,
        background: null,
        backgroundData: null,
        elements: []
    };
    
    pages.push(page);
    currentPageIndex = pages.length - 1;
    
    renderPages();
    renderPageThumbnails();
    updatePageCounter();
    
    showStatus(`✅ Page ${pages.length} added`, 'success');
}

function switchToPage(index) {
    if (index < 0 || index >= pages.length) return;
    currentPageIndex = index;
    renderPages();
    renderPageThumbnails();
    updatePageCounter();
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
        pageDiv.onclick = () => switchToPage(index);
        
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
    
    pages.forEach((page, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'page-thumbnail-wrapper';
        
        const thumb = document.createElement('div');
        thumb.className = `page-thumbnail ${index === currentPageIndex ? 'active' : ''}`;
        thumb.onclick = () => switchToPage(index);
        thumb.textContent = index + 1;
        
        if (page.backgroundData) {
            thumb.style.backgroundImage = `url(${page.backgroundData})`;
            thumb.style.backgroundSize = 'cover';
            thumb.style.backgroundPosition = 'center';
            thumb.textContent = '';
        }
        
        wrapper.appendChild(thumb);
        
        // Add page controls
        const controls = document.createElement('div');
        controls.className = 'page-controls';
        controls.innerHTML = `
            <button onclick="movePageUp(${index})" 
                    ${index === 0 ? 'disabled' : ''}
                    class="btn-page-control" title="Move Up">
                <i class="fas fa-arrow-up"></i>
            </button>
            <button onclick="movePageDown(${index})" 
                    ${index === pages.length - 1 ? 'disabled' : ''}
                    class="btn-page-control" title="Move Down">
                <i class="fas fa-arrow-down"></i>
            </button>
            ${pages.length > 1 ? `
            <button onclick="deletePage(${index})" 
                    class="btn-page-control btn-delete" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
            ` : ''}
        `;
        
        wrapper.appendChild(controls);
        container.appendChild(wrapper);
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
// PAGE REORDERING
// ============================================

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
    showStatus('✅ Page moved up', 'success');
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
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        type = 'image';
    } else if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
        type = 'video';
    } else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        type = 'audio';
    }
    
    const fileName = url.split('/').pop().split('?')[0] || 'Media';
    
    const asset = {
        id: Date.now(),
        type: type,
        url: url,
        name: fileName,
        thumbnail: type === 'image' ? url : getAssetThumbnail(type, url),
        embedded: embeddedMode
    };
    
    assets.push(asset);
    renderAssetLibrary();
    urlInput.value = ''; // Clear input
    
    const modeText = embeddedMode ? ' (embedded)' : ' (link)';
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
    
    assets.forEach(asset => {
        const assetDiv = document.createElement('div');
        assetDiv.className = 'asset-item bg-gray-50 border-2 border-gray-200 rounded p-2 text-center hover:border-purple-400';
        assetDiv.draggable = true;
        assetDiv.ondragstart = (e) => startAssetDrag(e, asset);
        assetDiv.onclick = () => addAssetToPage(asset);
        
        // Show image thumbnail for images (both uploaded and URLs)
        if (asset.type === 'image' || asset.thumbnail.startsWith('http') || asset.url.startsWith('data:image')) {
            const imgSrc = asset.thumbnail.startsWith('http') ? asset.thumbnail : asset.url;
            assetDiv.innerHTML = `
                <img src="${imgSrc}" class="w-full h-16 object-cover rounded mb-1">
                <p class="text-xs font-medium text-gray-700 truncate">${asset.name}</p>
            `;
        } else {
            // Show icon for other media types
            const icon = getAssetThumbnail(asset.type, asset.url);
            assetDiv.innerHTML = `
                <div class="flex items-center justify-center h-16">
                    <i class="${icon} text-3xl"></i>
                </div>
                <p class="text-xs font-medium text-gray-700 truncate">${asset.name}</p>
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
    if (asset.type === 'button') {
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
        embedded: asset.embedded || false
    };
    
    pages[currentPageIndex].elements.push(element);
    renderPages();
    const modeText = asset.embedded ? ' (embedded)' : '';
    showStatus(`✅ ${asset.name} added to page ${currentPageIndex + 1}${modeText}`, 'success');
}

// ============================================
// ELEMENT MANAGEMENT
// ============================================

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
    
    if (element.type === 'button') {
        // Visible button with styling
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="w-full h-full bg-indigo-500 hover:bg-indigo-600 text-white rounded flex items-center justify-center font-bold cursor-pointer">
                ${element.text}
            </div>
            <div class="resize-handle"></div>
        `;
    } else if (element.type === 'hotspot') {
        // Invisible/transparent hotspot
        div.style.background = 'rgba(255, 165, 0, 0.2)';
        div.style.border = '2px dashed orange';
        div.innerHTML = `
            <div class="element-controls">
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
    } else if (element.type === 'image' || (element.url && (element.url.startsWith('data:image') || element.url.startsWith('http')))) {
        // Show actual image for image elements
        div.innerHTML = `
            <div class="element-controls">
                <button onclick="deleteElement(${element.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <img src="${element.url}" class="w-full h-full object-contain">
            <div class="resize-handle"></div>
        `;
    } else {
        const embeddedBadge = element.embedded ? '<span class="text-xs bg-purple-500 text-white px-1 rounded">▶</span>' : '';
        div.innerHTML = `
            <div class="element-controls">
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
    }
    
    // Make draggable
    div.addEventListener('mousedown', startDrag);
    
    // Make resizable
    const resizeHandle = div.querySelector('.resize-handle');
    resizeHandle.addEventListener('mousedown', startResize);
    
    return div;
}

function startDrag(e) {
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.closest('.element-controls')) return;
    if (e.target.closest('button')) return;
    
    draggedElement = e.currentTarget;
    const rect = draggedElement.getBoundingClientRect();
    const pageDiv = draggedElement.closest('.pdf-page');
    const pageRect = pageDiv.getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    draggedElement.classList.add('selected');
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
}

function drag(e) {
    if (!draggedElement || resizing) return;
    
    const pageDiv = draggedElement.closest('.pdf-page');
    const pageRect = pageDiv.getBoundingClientRect();
    
    let x = e.clientX - pageRect.left - dragOffset.x;
    let y = e.clientY - pageRect.top - dragOffset.y;
    
    // Constrain to page
    x = Math.max(0, Math.min(x, pageRect.width - draggedElement.offsetWidth));
    y = Math.max(0, Math.min(y, pageRect.height - draggedElement.offsetHeight));
    
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
        draggedElement = null;
    }
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

function startResize(e) {
    e.stopPropagation();
    resizing = true;
    draggedElement = e.target.closest('.draggable-element');
    
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

function deleteElement(elementId) {
    const currentPage = pages[currentPageIndex];
    currentPage.elements = currentPage.elements.filter(el => el.id !== elementId);
    renderPages();
    showStatus('Element deleted', 'info');
}

// ============================================
// PDF GENERATION
// ============================================

async function generatePDF() {
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    
    try {
        if (pages.length === 0) {
            showStatus('⚠️ Please add at least one page', 'warning');
            return;
        }
        
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Generating...';
        showStatus(`🔄 Generating ${pages.length}-page PDF...`, 'info');
        hideResults();
        
        // Prepare PDF data
        const pdfData = {
            title: document.getElementById('pdfTitle').value || 'Interactive PDF',
            author: document.getElementById('pdfAuthor').value || 'PDF Creator',
            pageSize: document.getElementById('pageSize').value,
            orientation: document.getElementById('orientation').value,
            pages: pages.map((page, index) => ({
                pageNumber: index + 1,
                background: page.backgroundData,
                elements: page.elements.map(el => ({
                    ...el,
                    // Convert from top-left (canvas) to bottom-left (PDF)
                    y: getPageHeight() - el.y - el.height
                }))
            }))
        };
        
        console.log('Sending PDF data:', pdfData);
        
        const response = await fetch(`${API_BASE}/api/generate-pdf-multipage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pdfData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate PDF');
        }
        
        const result = await response.json();
        console.log('PDF generated:', result);
        
        showStatus(`✅ ${pages.length}-page PDF generated successfully!`, 'success');
        showResults(result);
        
        // Show PDF preview
        if (result.browserUrl || result.apiViewUrl) {
            const pdfUrl = result.browserUrl || `${API_BASE}${result.apiViewUrl}`;
            showPDFPreview(pdfUrl);
        }
        
        // Save to Supabase
        await savePDFToDatabase(result);
        
    } catch (error) {
        console.error('Generation error:', error);
        showStatus('❌ Error: ' + error.message, 'error');
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

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + 'Icon');
    
    if (section.style.maxHeight && section.style.maxHeight !== '0px') {
        section.style.maxHeight = '0px';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    } else {
        section.style.maxHeight = section.scrollHeight + 'px';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    }
}

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
    formData.append('folder', 'interactive-pdfs');
    
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
    
    resultArea.innerHTML = `
        <h4 class="text-sm font-bold text-gray-800 mb-2">✅ PDF Ready!</h4>
        <div class="space-y-2">
            ${result.browserUrl ? `
                <a href="${result.browserUrl}" target="_blank" 
                    class="block w-full bg-purple-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-purple-600">
                    <i class="fas fa-external-link-alt mr-1"></i>Open in Browser
                </a>
            ` : ''}
            <button onclick="downloadPDF('${pdfUrl}', '${filename}')" 
                class="block w-full bg-blue-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-blue-600">
                <i class="fas fa-download mr-1"></i>Download PDF
            </button>
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

async function savePDFToDatabase(pdfData) {
    try {
        const projectData = {
            title: document.getElementById('pdfTitle').value || 'Untitled PDF',
            pdf_url: pdfData.browserUrl || pdfData.apiViewUrl,
            filename: pdfData.filename || 'interactive-pdf.pdf',
            file_size: pdfData.size || 0,
            page_count: pages.length,
            embedded_mode: embeddedMode,
            flipbook_mode: flipbookMode,
            project_json: JSON.stringify({ 
                pages: pages.map(p => ({
                    ...p,
                    backgroundData: p.backgroundData ? '[base64 data]' : null // Don't save full base64
                })),
                settings: { 
                    embeddedMode, 
                    flipbookMode,
                    pageSize: document.getElementById('pageSize').value,
                    orientation: document.getElementById('orientation').value
                } 
            }),
            created_at: new Date().toISOString()
        };
        
        const response = await fetch(`${API_BASE}/api/save-project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
            console.log('✅ Project saved to database');
        } else {
            console.warn('⚠️ Failed to save to database:', await response.text());
        }
    } catch (error) {
        console.error('Database save error:', error);
        // Don't show error to user - this is a background operation
    }
}

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
    
    // Save current state
    const previewData = {
        pages: pages,
        title: document.getElementById('pdfTitle').value || 'Flipbook Preview'
    };
    
    // Store in sessionStorage
    sessionStorage.setItem('flipbookPreview', JSON.stringify(previewData));
    
    // Open preview in new tab
    window.open('/flipbook.html?preview=true', '_blank');
    
    showStatus('📖 Opening flipbook preview...', 'info');
}

// Initialize collapsible sections
setTimeout(() => {
    document.getElementById('assetLibrary').style.maxHeight = '500px';
    document.getElementById('settings').style.maxHeight = '0px';
}, 100);
