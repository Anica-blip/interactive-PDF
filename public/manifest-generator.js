/**
 * Manifest Generator for Interactive PDFs
 * Creates JSON manifest with hotspot data for the viewer
 */

/**
 * Generate manifest from current project state
 * @param {Object} projectData - Project data including pages and elements
 * @returns {Object} Manifest JSON
 */
function generateManifest(projectData) {
    const manifest = {
        version: '1.0',
        pdfId: projectData.id || generateId(),
        type: detectPDFType(projectData),
        title: projectData.title || 'Interactive PDF',
        author: projectData.author || 'PDF Creator',
        created: new Date().toISOString(),
        flipbookMode: projectData.flipbookMode || false,
        pages: []
    };

    // Process each page
    if (projectData.pages && Array.isArray(projectData.pages)) {
        projectData.pages.forEach((page, index) => {
            const pageData = {
                pageNumber: index + 1,
                type: page.type || 'static',
                hotspots: []
            };

            // Extract hotspots from page elements
            if (page.elements && Array.isArray(page.elements)) {
                page.elements.forEach(element => {
                    const hotspot = elementToHotspot(element);
                    if (hotspot) {
                        pageData.hotspots.push(hotspot);
                    }
                });
            }

            manifest.pages.push(pageData);
        });
    }

    return manifest;
}

/**
 * Detect PDF type based on content
 */
function detectPDFType(projectData) {
    if (!projectData.pages) return 'static';
    
    let hasInteractive = false;
    let hasPageTurner = false;

    projectData.pages.forEach(page => {
        if (page.elements && page.elements.some(el => 
            ['video', 'audio', 'button', 'hotspot', 'cloudflare-stream'].includes(el.type)
        )) {
            hasInteractive = true;
        }
        if (page.flipAnimation || page.type === 'page-turner') {
            hasPageTurner = true;
        }
    });

    if (hasInteractive && hasPageTurner) return 'hybrid';
    if (hasInteractive) return 'interactive';
    if (hasPageTurner) return 'page-turner';
    return 'static';
}

/**
 * Convert element to hotspot
 */
function elementToHotspot(element) {
    const hotspotTypes = ['video', 'audio', 'button', 'hotspot', 'cloudflare-stream', 'gif'];
    
    if (!hotspotTypes.includes(element.type)) {
        return null;
    }

    const hotspot = {
        id: element.id || generateId(),
        type: element.type,
        bounds: {
            x: element.x || 0,
            y: element.y || 0,
            width: element.width || 100,
            height: element.height || 100
        }
    };

    // Add type-specific properties
    if (element.type === 'cloudflare-stream') {
        hotspot.streamId = element.streamId;
        hotspot.thumbnailUrl = element.thumbnailUrl;
        hotspot.iframeUrl = element.url;
        hotspot.title = element.name || 'Video';
    } else if (element.type === 'video' || element.type === 'audio') {
        hotspot.mediaUrl = element.url;
        hotspot.thumbnailUrl = element.thumbnail;
        hotspot.title = element.name || element.type.toUpperCase();
        hotspot.embedded = element.embedded || false;
    } else if (element.type === 'button' || element.type === 'hotspot') {
        hotspot.url = element.url;
        hotspot.title = element.name || element.text || 'Click Here';
        hotspot.action = element.action || 'link';
    } else if (element.type === 'gif') {
        hotspot.mediaUrl = element.url;
        hotspot.title = element.name || 'GIF';
    }

    return hotspot;
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Save manifest to R2
 * @param {Object} manifest - Manifest object
 * @param {string} pdfId - PDF identifier
 * @returns {Promise<string>} Manifest URL
 */
async function saveManifest(manifest, pdfId) {
    const manifestJson = JSON.stringify(manifest, null, 2);
    const blob = new Blob([manifestJson], { type: 'application/json' });
    const file = new File([blob], `${pdfId}-manifest.json`, { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'interactive-pdfs/manifests');

    const API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : 'https://api.3c-public-library.org/pdf';

    const response = await fetch(`${API_BASE}/upload-media`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to save manifest');
    }

    const data = await response.json();
    return data.url;
}

/**
 * Load manifest from URL
 * @param {string} url - Manifest URL
 * @returns {Promise<Object>} Manifest object
 */
async function loadManifest(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to load manifest');
    }
    return await response.json();
}

/**
 * Validate manifest structure
 * @param {Object} manifest - Manifest to validate
 * @returns {boolean} Is valid
 */
function validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') return false;
    if (!manifest.version || !manifest.pdfId) return false;
    if (!Array.isArray(manifest.pages)) return false;

    for (const page of manifest.pages) {
        if (typeof page.pageNumber !== 'number') return false;
        if (!Array.isArray(page.hotspots)) return false;

        for (const hotspot of page.hotspots) {
            if (!hotspot.id || !hotspot.type) return false;
            if (!hotspot.bounds || typeof hotspot.bounds !== 'object') return false;
            if (typeof hotspot.bounds.x !== 'number') return false;
            if (typeof hotspot.bounds.y !== 'number') return false;
        }
    }

    return true;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateManifest,
        saveManifest,
        loadManifest,
        validateManifest,
        detectPDFType
    };
}
