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
        
        container.appendChild(thumb);
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

function uploadAsset(type) {
    let url, text, file;
    
    // Special handling for buttons and hotspots
    if (type === 'button' || type === 'hotspot') {
        url = prompt(`Enter URL for ${type}:`);
        if (!url) return;
        
        if (type === 'button') {
            text = prompt('Enter button text:') || 'Click Here';
        } else {
            text = prompt('Enter hotspot name (for reference):') || 'Hotspot';
        }
        
        const asset = {
            id: Date.now(),
            type: type,
            url: url,
            name: text,
            thumbnail: getAssetThumbnail(type, url),
            embedded: false // Buttons and hotspots are always links
        };
        
        assets.push(asset);
        renderAssetLibrary();
        showStatus(`✅ ${type} added`, 'success');
        return;
    }
    
    const choice = prompt(`Add ${type}:\n1. Paste URL\n2. Upload file\n\nEnter 1 or 2:`);
    
    if (choice === '1') {
        // URL input
        url = prompt(`Enter ${type} URL:`);
        if (!url) return;
        text = prompt('Enter display name:') || type.toUpperCase();
        
        const asset = {
            id: Date.now(),
            type: type,
            url: url,
            name: text,
            thumbnail: getAssetThumbnail(type, url),
            embedded: embeddedMode // Use current mode setting
        };
        
        assets.push(asset);
        renderAssetLibrary();
        const modeText = embeddedMode ? ' (embedded)' : ' (link)';
        showStatus(`✅ ${type} asset added${modeText}`, 'success');
        
    } else if (choice === '2') {
        // File upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = getAcceptType(type);
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            showStatus(`📤 Uploading ${file.name} to Cloudflare...`, 'info');
            
            // Upload video to Cloudflare Stream
            if (type === 'video') {
                try {
                    const streamData = await uploadToStream(file);
                    const asset = {
                        id: Date.now(),
                        type: 'cloudflare-stream',
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
                } catch (error) {
                    console.error('Stream upload failed:', error);
                    showStatus(`❌ Upload failed: ${error.message}`, 'error');
                }
            } else {
                // For non-video files, upload to R2
                try {
                    const r2Data = await uploadToR2(file, type);
                    const asset = {
                        id: Date.now(),
                        type: type,
                        url: r2Data.url,
                        name: file.name,
                        thumbnail: type === 'gif' ? r2Data.url : getAssetThumbnail(type),
                        embedded: embeddedMode
                    };
                    
                    assets.push(asset);
                    renderAssetLibrary();
                    showStatus(`✅ ${file.name} uploaded to R2!`, 'success');
                } catch (error) {
                    console.error('R2 upload failed:', error);
                    showStatus(`❌ Upload failed: ${error.message}`, 'error');
                }
            }
        };
        input.click();
    }
}

function getAcceptType(type) {
    const accepts = {
        video: 'video/*',
        audio: 'audio/*',
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
        
        if (asset.url.startsWith('data:image')) {
            assetDiv.innerHTML = `
                <img src="${asset.url}" class="w-full h-16 object-cover rounded mb-1">
                <p class="text-xs font-medium text-gray-700 truncate">${asset.name}</p>
            `;
        } else {
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
    } else if (element.url && element.url.startsWith('data:image')) {
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
    
    resultArea.innerHTML = `
        <h4 class="text-sm font-bold text-gray-800 mb-2">✅ PDF Ready!</h4>
        <div class="space-y-2">
            ${result.browserUrl ? `
                <a href="${result.browserUrl}" target="_blank" 
                    class="block w-full bg-purple-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-purple-600">
                    <i class="fas fa-external-link-alt mr-1"></i>Open in Browser
                </a>
            ` : ''}
            <a href="${API_BASE}${result.apiViewUrl}" target="_blank" 
                class="block w-full bg-blue-500 text-white px-3 py-2 rounded text-xs text-center hover:bg-blue-600">
                <i class="fas fa-download mr-1"></i>Download PDF
            </a>
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

// Initialize collapsible sections
setTimeout(() => {
    document.getElementById('assetLibrary').style.maxHeight = '500px';
    document.getElementById('settings').style.maxHeight = '0px';
}, 100);
