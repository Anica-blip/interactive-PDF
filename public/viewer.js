/**
 * Interactive PDF Viewer with Cloudflare Stream Integration
 * Transparent Floating Video Player
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.5;
let manifest = null;
let currentHotspots = [];

// DOM elements
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');
const videoOverlay = document.getElementById('video-overlay');
const videoPlayerWrapper = document.getElementById('video-player-wrapper');
const videoTitle = document.getElementById('video-title');
const closeVideoBtn = document.getElementById('close-video');

// Get PDF URL from query parameter
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('pdf') || '';
const manifestUrl = urlParams.get('manifest') || '';

/**
 * Initialize viewer
 */
async function init() {
    if (!pdfUrl) {
        alert('No PDF specified. Add ?pdf=URL to the address bar.');
        loading.classList.add('hidden');
        return;
    }

    try {
        // Load PDF
        await loadPDF(pdfUrl);
        
        // Load manifest if available
        if (manifestUrl) {
            await loadManifest(manifestUrl);
        }
        
        // Render first page
        await renderPage(currentPage);
        
        // Setup event listeners
        setupEventListeners();
        
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Init error:', error);
        alert('Failed to load PDF: ' + error.message);
        loading.classList.add('hidden');
    }
}

/**
 * Load PDF document
 */
async function loadPDF(url) {
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    
    document.getElementById('total-pages').textContent = totalPages;
    
    console.log('PDF loaded:', totalPages, 'pages');
}

/**
 * Load manifest JSON
 */
async function loadManifest(url) {
    try {
        const response = await fetch(url);
        manifest = await response.json();
        console.log('Manifest loaded:', manifest);
    } catch (error) {
        console.warn('Failed to load manifest:', error);
        manifest = null;
    }
}

/**
 * Render PDF page
 */
async function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    // Get page
    const page = await pdfDoc.getPage(pageNum);
    
    // Calculate viewport
    const viewport = page.getViewport({ scale });
    
    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render PDF page
    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Update UI
    currentPage = pageNum;
    document.getElementById('current-page').textContent = currentPage;
    updateButtons();
    
    // Load hotspots for this page
    loadHotspotsForPage(pageNum);
    
    console.log('Rendered page:', pageNum);
}

/**
 * Load hotspots for current page
 */
function loadHotspotsForPage(pageNum) {
    // Clear existing hotspots
    currentHotspots = [];
    document.querySelectorAll('.hotspot-indicator').forEach(el => el.remove());
    
    if (!manifest || !manifest.pages) return;
    
    // Find page in manifest
    const pageData = manifest.pages.find(p => p.pageNumber === pageNum);
    if (!pageData || !pageData.hotspots) return;
    
    // Store hotspots
    currentHotspots = pageData.hotspots;
    
    console.log('Loaded', currentHotspots.length, 'hotspots for page', pageNum);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            renderPage(currentPage - 1);
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) {
            renderPage(currentPage + 1);
        }
    });
    
    // Zoom
    document.getElementById('zoom-in').addEventListener('click', () => {
        scale += 0.25;
        document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
        renderPage(currentPage);
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        if (scale > 0.5) {
            scale -= 0.25;
            document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
            renderPage(currentPage);
        }
    });
    
    // Download
    document.getElementById('download-pdf').addEventListener('click', () => {
        window.open(pdfUrl, '_blank');
    });
    
    // Canvas click detection
    canvas.addEventListener('click', handleCanvasClick);
    
    // Close video
    closeVideoBtn.addEventListener('click', closeVideo);
    videoOverlay.addEventListener('click', (e) => {
        if (e.target === videoOverlay) {
            closeVideo();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            renderPage(currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
            renderPage(currentPage + 1);
        } else if (e.key === 'Escape') {
            closeVideo();
        }
    });
}

/**
 * Handle canvas click - detect hotspot clicks
 */
function handleCanvasClick(event) {
    if (currentHotspots.length === 0) return;
    
    // Get click coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    
    console.log('Click at:', x, y);
    
    // Check if click is within any hotspot
    for (const hotspot of currentHotspots) {
        if (isPointInHotspot(x, y, hotspot.bounds)) {
            handleHotspotClick(hotspot);
            break;
        }
    }
}

/**
 * Check if point is within hotspot bounds
 */
function isPointInHotspot(x, y, bounds) {
    return x >= bounds.x && 
           x <= bounds.x + bounds.width &&
           y >= bounds.y && 
           y <= bounds.y + bounds.height;
}

/**
 * Handle hotspot click
 */
function handleHotspotClick(hotspot) {
    console.log('Hotspot clicked:', hotspot);
    
    if (hotspot.type === 'video' || hotspot.type === 'cloudflare-stream') {
        playVideo(hotspot);
    } else if (hotspot.type === 'audio') {
        playAudio(hotspot);
    } else if (hotspot.type === 'gif') {
        showGif(hotspot);
    } else if (hotspot.type === 'link' || hotspot.type === 'button' || hotspot.type === 'hotspot') {
        if (hotspot.action === 'internal') {
            // Link to another document in your library
            window.location.href = hotspot.url;
        } else {
            // External link
            window.open(hotspot.url, '_blank');
        }
    }
}

/**
 * Play video in transparent floating player
 */
function playVideo(hotspot) {
    // Set title
    videoTitle.textContent = hotspot.title || 'Video';
    
    // Clear previous player
    videoPlayerWrapper.innerHTML = '';
    
    if (hotspot.type === 'cloudflare-stream' && hotspot.streamId) {
        // Cloudflare Stream video
        const streamElement = document.createElement('stream');
        streamElement.setAttribute('src', hotspot.streamId);
        streamElement.setAttribute('controls', '');
        streamElement.setAttribute('autoplay', '');
        if (hotspot.poster) {
            streamElement.setAttribute('poster', hotspot.poster);
        }
        videoPlayerWrapper.appendChild(streamElement);
        
    } else if (hotspot.iframeUrl) {
        // iframe embed
        const iframe = document.createElement('iframe');
        iframe.src = hotspot.iframeUrl;
        iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        videoPlayerWrapper.appendChild(iframe);
        
    } else if (hotspot.mediaUrl || hotspot.url) {
        // Standard HTML5 video
        const video = document.createElement('video');
        video.src = hotspot.mediaUrl || hotspot.url;
        video.controls = true;
        video.autoplay = true;
        if (hotspot.thumbnailUrl || hotspot.poster) {
            video.poster = hotspot.thumbnailUrl || hotspot.poster;
        }
        videoPlayerWrapper.appendChild(video);
    }
    
    // Show overlay
    videoOverlay.classList.add('active');
}

/**
 * Play audio
 */
function playAudio(hotspot) {
    videoTitle.textContent = hotspot.title || 'Audio';
    videoPlayerWrapper.innerHTML = '';
    
    const audio = document.createElement('audio');
    audio.src = hotspot.mediaUrl || hotspot.url;
    audio.controls = true;
    audio.autoplay = true;
    audio.style.width = '100%';
    
    videoPlayerWrapper.appendChild(audio);
    videoOverlay.classList.add('active');
}

/**
 * Show animated GIF in overlay
 */
function showGif(hotspot) {
    videoTitle.textContent = hotspot.title || 'Animated Image';
    videoPlayerWrapper.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = hotspot.mediaUrl || hotspot.url;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '12px';
    
    videoPlayerWrapper.appendChild(img);
    videoOverlay.classList.add('active');
}

/**
 * Close video overlay
 */
function closeVideo() {
    videoOverlay.classList.remove('active');
    
    // Stop all media
    videoPlayerWrapper.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.currentTime = 0;
    });
    
    // Clear player
    setTimeout(() => {
        videoPlayerWrapper.innerHTML = '';
    }, 300);
}

/**
 * Update navigation buttons
 */
function updateButtons() {
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

// Initialize on load
init();
