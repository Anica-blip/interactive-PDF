/**
 * Magazine-Style Flipbook Viewer
 * Realistic page turning with interactive media support
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.5;
let manifest = null;
let pageCanvases = [];
let flipbookInitialized = false;

// Get PDF URL from query parameter
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('pdf') || '';
const manifestUrl = urlParams.get('manifest') || '';

// Check for sessionStorage manifest (from builder preview)
const sessionManifest = sessionStorage.getItem('flipbookManifest');

// DOM elements
const loading = document.getElementById('loading');
const videoOverlay = document.getElementById('video-overlay');
const videoPlayerWrapper = document.getElementById('video-player-wrapper');
const videoTitle = document.getElementById('video-title');
const closeVideoBtn = document.getElementById('close-video');

/**
 * Initialize flipbook
 */
async function init() {
    try {
        // Priority 1: Check for sessionStorage manifest (from builder preview)
        if (sessionManifest) {
            console.log('Loading from builder preview (sessionStorage)');
            await initFromManifest(JSON.parse(sessionManifest));
            // Clear sessionStorage after loading
            sessionStorage.removeItem('flipbookManifest');
        }
        // Priority 2: Check for PDF URL (from 3C Content Library)
        else if (pdfUrl) {
            console.log('Loading from 3C Content Library (PDF URL)');
            await loadPDF(pdfUrl);
            
            // Load manifest if available
            if (manifestUrl) {
                await loadManifest(manifestUrl);
            }
            
            // Render all pages
            await renderAllPages();
            
            // Initialize flipbook
            initFlipbook();
            
            // Setup event listeners
            setupEventListeners();
        }
        // No data source
        else {
            alert('No flipbook data. Either:\n1. Click "View Flipbook" in builder\n2. Add ?pdf=URL to the address bar');
            loading.classList.add('hidden');
            return;
        }
        
        // Hide navigation hints after 5 seconds
        setTimeout(() => {
            document.querySelectorAll('.nav-hint').forEach(hint => {
                hint.style.display = 'none';
            });
        }, 5000);
        
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Init error:', error);
        alert('Failed to load flipbook: ' + error.message);
        loading.classList.add('hidden');
    }
}

/**
 * Initialize from JSON manifest (builder preview)
 */
async function initFromManifest(manifestData) {
    manifest = manifestData;
    totalPages = manifest.pages.length;
    
    document.getElementById('total-pages').textContent = totalPages;
    console.log('Manifest loaded:', totalPages, 'pages');
    
    // Create canvases from page backgrounds
    pageCanvases = [];
    
    for (const page of manifest.pages) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = () => {
                // Set canvas size based on image (use scale)
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                resolve();
            };
            img.onerror = () => {
                // If image fails to load, create blank canvas
                console.warn('Failed to load background for page', page.pageNumber);
                canvas.width = 800 * scale;
                canvas.height = 1100 * scale;
                resolve();
            };
            img.src = page.background;
        });
        
        pageCanvases.push(canvas);
        console.log('Rendered page:', page.pageNumber);
    }
    
    // Initialize flipbook
    initFlipbook();
    
    // Setup event listeners
    setupEventListeners();
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
 * Render all PDF pages to canvases
 */
async function renderAllPages() {
    pageCanvases = [];
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const ctx = canvas.getContext('2d');
        
        // Render page
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
        
        pageCanvases.push(canvas);
        
        console.log('Rendered page:', pageNum);
    }
}

/**
 * Initialize turn.js flipbook
 */
function initFlipbook() {
    const flipbook = $('#flipbook');
    
    // Clear existing content
    flipbook.empty();
    
    // Add pages to flipbook
    pageCanvases.forEach((canvas, index) => {
        const pageDiv = $('<div class="page"></div>');
        pageDiv.append(canvas);
        
        // Add page number
        const pageNumber = $('<div class="page-number"></div>').text(index + 1);
        pageDiv.append(pageNumber);
        
        flipbook.append(pageDiv);
    });
    
    // Calculate dimensions
    const pageWidth = pageCanvases[0].width;
    const pageHeight = pageCanvases[0].height;
    
    // Initialize turn.js
    flipbook.turn({
        width: pageWidth * 2, // Double width for spread
        height: pageHeight,
        autoCenter: true,
        gradients: true,
        elevation: 50,
        acceleration: true,
        duration: 1000,
        pages: totalPages,
        when: {
            turning: function(event, page, view) {
                currentPage = page;
                updatePageInfo();
            },
            turned: function(event, page, view) {
                checkHotspots(page);
            }
        }
    });
    
    flipbookInitialized = true;
    updatePageInfo();
    
    console.log('Flipbook initialized');
}

/**
 * Check for hotspots on current page
 */
function checkHotspots(pageNum) {
    if (!manifest || !manifest.pages) return;
    
    const pageData = manifest.pages.find(p => p.pageNumber === pageNum);
    if (!pageData || !pageData.hotspots || pageData.hotspots.length === 0) return;
    
    console.log('Page', pageNum, 'has', pageData.hotspots.length, 'hotspots');
    
    // Add click listeners to page
    const pageElement = $(`#flipbook .page:nth-child(${pageNum})`);
    pageElement.css('cursor', 'pointer');
    
    pageElement.off('click').on('click', function(e) {
        // Get click coordinates relative to page
        const offset = $(this).offset();
        const x = (e.pageX - offset.left) * (pageCanvases[pageNum - 1].width / $(this).width());
        const y = (e.pageY - offset.top) * (pageCanvases[pageNum - 1].height / $(this).height());
        
        // Check if click is on a hotspot
        for (const hotspot of pageData.hotspots) {
            if (isPointInHotspot(x, y, hotspot.bounds)) {
                e.stopPropagation(); // Prevent page turn
                handleHotspotClick(hotspot);
                break;
            }
        }
    });
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
            window.location.href = hotspot.url;
        } else {
            window.open(hotspot.url, '_blank');
        }
    }
}

/**
 * Play video in transparent floating player
 */
function playVideo(hotspot) {
    videoTitle.textContent = hotspot.title || 'Video';
    videoPlayerWrapper.innerHTML = '';
    
    if (hotspot.type === 'cloudflare-stream' && hotspot.streamId) {
        const streamElement = document.createElement('stream');
        streamElement.setAttribute('src', hotspot.streamId);
        streamElement.setAttribute('controls', '');
        streamElement.setAttribute('autoplay', '');
        if (hotspot.poster) {
            streamElement.setAttribute('poster', hotspot.poster);
        }
        videoPlayerWrapper.appendChild(streamElement);
    } else if (hotspot.iframeUrl) {
        const iframe = document.createElement('iframe');
        iframe.src = hotspot.iframeUrl;
        iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        videoPlayerWrapper.appendChild(iframe);
    } else if (hotspot.mediaUrl || hotspot.url) {
        const video = document.createElement('video');
        video.src = hotspot.mediaUrl || hotspot.url;
        video.controls = true;
        video.autoplay = true;
        if (hotspot.thumbnailUrl || hotspot.poster) {
            video.poster = hotspot.thumbnailUrl || hotspot.poster;
        }
        videoPlayerWrapper.appendChild(video);
    }
    
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
 * Show animated GIF
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
    
    videoPlayerWrapper.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.currentTime = 0;
    });
    
    setTimeout(() => {
        videoPlayerWrapper.innerHTML = '';
    }, 300);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation buttons
    $('#first-page').on('click', () => {
        $('#flipbook').turn('page', 1);
    });
    
    $('#prev-page').on('click', () => {
        $('#flipbook').turn('previous');
    });
    
    $('#next-page').on('click', () => {
        $('#flipbook').turn('next');
    });
    
    $('#last-page').on('click', () => {
        $('#flipbook').turn('page', totalPages);
    });
    
    // Zoom controls
    $('#zoom-in').on('click', async () => {
        scale += 0.25;
        $('#zoom-level').text(Math.round(scale * 100) + '%');
        await reloadFlipbook();
    });
    
    $('#zoom-out').on('click', async () => {
        if (scale > 0.5) {
            scale -= 0.25;
            $('#zoom-level').text(Math.round(scale * 100) + '%');
            await reloadFlipbook();
        }
    });
    
    // Download
    $('#download-pdf').on('click', () => {
        window.open(pdfUrl, '_blank');
    });
    
    // Close video
    closeVideoBtn.addEventListener('click', closeVideo);
    videoOverlay.addEventListener('click', (e) => {
        if (e.target === videoOverlay) {
            closeVideo();
        }
    });
    
    // Keyboard shortcuts
    $(document).on('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            $('#flipbook').turn('previous');
        } else if (e.key === 'ArrowRight') {
            $('#flipbook').turn('next');
        } else if (e.key === 'Home') {
            $('#flipbook').turn('page', 1);
        } else if (e.key === 'End') {
            $('#flipbook').turn('page', totalPages);
        } else if (e.key === 'Escape') {
            closeVideo();
        }
    });
}

/**
 * Reload flipbook after zoom change
 */
async function reloadFlipbook() {
    loading.classList.remove('hidden');
    
    // Destroy existing flipbook
    if (flipbookInitialized) {
        $('#flipbook').turn('destroy');
    }
    
    // Re-render all pages
    await renderAllPages();
    
    // Re-initialize flipbook
    initFlipbook();
    
    loading.classList.add('hidden');
}

/**
 * Update page info display
 */
function updatePageInfo() {
    $('#current-page').text(currentPage);
    
    // Update button states
    $('#first-page, #prev-page').prop('disabled', currentPage === 1);
    $('#next-page, #last-page').prop('disabled', currentPage === totalPages);
}

// Initialize on load
$(document).ready(() => {
    init();
});
