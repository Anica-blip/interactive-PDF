/**
 * 3C Interactive Flipbook Viewer
 * Real page turning with interactive media support + Supabase integration
 * Deployed: 2024-12-30-01:50 - Fixed duplicate function, added detailed logging
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Supabase configuration - read from config.js
const SUPABASE_URL = window.ENV_CONFIG?.supabase?.url || '';
const SUPABASE_ANON_KEY = window.ENV_CONFIG?.supabase?.anonKey || '';

// Global state
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.125; // 75% zoom (1.5 * 0.75 = 1.125)
let manifest = null;
let pageCanvases = [];
let flipbookInitialized = false;

// A4 dimensions at 96 DPI (standard web DPI)
const A4_WIDTH_PX = 794;  // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('pdf') || '';
const manifestUrl = urlParams.get('manifest') || '';
const projectId = urlParams.get('project') || '';

console.log('🚀 Flipbook v20241228-2 - Loading with parameters:', {
    projectId: projectId,
    pdfUrl: pdfUrl,
    manifestUrl: manifestUrl
});

// Check for sessionStorage manifest (from builder preview)
const sessionManifest = sessionStorage.getItem('flipbookManifest');
console.log('SessionStorage check:', {
    hasManifest: !!sessionManifest,
    manifestLength: sessionManifest ? sessionManifest.length : 0,
    manifestPreview: sessionManifest ? sessionManifest.substring(0, 100) + '...' : 'null'
});

// DOM elements - will be initialized after DOM is ready
let loading = null;
let videoOverlay = null;
let videoPlayerWrapper = null;
let videoTitle = null;
let closeVideoBtn = null;

// Initialize DOM elements
function initDOMElements() {
    loading = document.getElementById('loading');
    videoOverlay = document.getElementById('video-overlay');
    videoPlayerWrapper = document.getElementById('video-player-wrapper');
    videoTitle = document.getElementById('video-title');
    closeVideoBtn = document.getElementById('close-video');
    
    if (!loading) {
        console.error('Loading element not found!');
        return false;
    }
    return true;
}

/**
 * Load project from Supabase using project ID
 */
async function loadProjectFromSupabase(projectId) {
    try {
        console.log('Loading project from Supabase:', projectId);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pdf_projects?id=eq.${projectId}&select=*`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        console.log('🌐 Response status:', response.status, response.statusText);
        console.log('🌐 Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        // Get response as text first to debug
        const responseText = await response.text();
        console.log('📝 Raw response text (first 500 chars):', responseText.substring(0, 500));
        
        let projects;
        try {
            projects = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Failed to parse response as JSON');
            console.error('Full response text:', responseText);
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
        console.log('📦 Response from Supabase:', projects);
        
        if (!projects || projects.length === 0) {
            throw new Error('Project not found');
        }
        
        const project = projects[0];
        console.log('✅ Project loaded:', project.title || 'Untitled');
        console.log('📊 Full project object:', project);
        console.log('🔍 project_json exists?', !!project.project_json);
        console.log('🔍 project_json type:', typeof project.project_json);
        console.log('🔍 project_json value:', project.project_json);
        
        // Parse the JSON data from project_json column
        
        let projectData;
        if (!project.project_json) {
            throw new Error('project_json column is empty or null');
        }
        
        // Supabase JSONB columns are returned as objects, not strings
        if (typeof project.project_json === 'object' && project.project_json !== null) {
            console.log('✅ project_json is an object, using directly');
            projectData = project.project_json;
        } else if (typeof project.project_json === 'string') {
            console.log('⚠️ project_json is a string, attempting to parse');
            try {
                projectData = JSON.parse(project.project_json);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                console.error('Raw JSON string (first 500 chars):', project.project_json.substring(0, 500));
                throw new Error(`Failed to parse project JSON: ${parseError.message}`);
            }
        } else {
            console.error('❌ project_json type is invalid:', typeof project.project_json);
            console.error('project_json value:', project.project_json);
            throw new Error(`project_json is not an object or string, it is: ${typeof project.project_json}`);
        }
        
        console.log('✅ projectData parsed successfully');
        console.log('📄 projectData.pages count:', projectData.pages?.length || 0);
        console.log('⚙️ projectData.settings:', projectData.settings);
        
        // Create manifest from project data
        const manifest = {
            title: projectData.settings?.title || project.title || 'Interactive Flipbook',
            author: projectData.settings?.author || project.author || 'Chef',
            pages: projectData.pages || [],
            settings: projectData.settings || {},
            createdAt: project.created_at
        };
        
        console.log('📖 Manifest created with', manifest.pages.length, 'pages');
        console.log('🎨 First page preview:', manifest.pages[0]);
        
        await initFromManifest(manifest);
        
    } catch (error) {
        console.error('Failed to load project from Supabase:', error);
        throw error;
    }
}

/**
 * Initialize flipbook
 */
async function init() {
    try {
        // Initialize DOM elements first
        if (!initDOMElements()) {
            console.error('Failed to initialize DOM elements');
            return;
        }
        
        // Priority 1: Check for project ID (from Supabase)
        if (projectId) {
            console.log('Loading from Supabase project:', projectId);
            await loadProjectFromSupabase(projectId);
        }
        // Priority 2: Check for sessionStorage manifest (from builder preview)
        else if (sessionManifest) {
            console.log('Loading from builder preview (sessionStorage)');
            await initFromManifest(JSON.parse(sessionManifest));
            // Clear sessionStorage after loading
            sessionStorage.removeItem('flipbookManifest');
        }
        // Priority 3: Check for PDF URL (from 3C Content Library)
        else if (pdfUrl) {
            console.log('Loading from PDF URL');
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
            alert('⚠️ No flipbook data found!\n\nTo view flipbook:\n1. From builder: Click "View Flipbook" button\n2. From Supabase: Use URL ?project=PROJECT_ID\n3. From library: Use URL ?pdf=PDF_URL\n\nExample: flipbook.html?project=123');
            loading.classList.add('hidden');
            return;
        }
        
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Init error:', error);
        alert('Failed to load flipbook: ' + error.message);
        loading.classList.add('hidden');
    }
}

/**
 * Initialize from JSON manifest (builder preview or Supabase)
 */
async function initFromManifest(manifestData) {
    manifest = manifestData;
    totalPages = manifest.pages.length;
    
    document.getElementById('total-pages').textContent = totalPages;
    console.log('Manifest loaded:', totalPages, 'pages');
    
    // Update zoom display
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    // Create canvases from page backgrounds
    pageCanvases = [];
    
    for (const page of manifest.pages) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = () => {
                // Calculate canvas size based on A4 proportions
                const targetWidth = A4_WIDTH_PX * scale;
                const targetHeight = A4_HEIGHT_PX * scale;
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                resolve();
            };
            img.onerror = () => {
                // If image fails to load, create blank A4 canvas
                console.warn('Failed to load background for page', page.pageNumber);
                canvas.width = A4_WIDTH_PX * scale;
                canvas.height = A4_HEIGHT_PX * scale;
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                resolve();
            };
            
            // Handle base64 backgrounds
            if (page.background && page.background.startsWith('data:')) {
                img.src = page.background;
            } else if (page.backgroundData) {
                img.src = page.backgroundData;
            } else if (page.background) {
                img.src = page.background;
            } else {
                // No background - create blank
                canvas.width = A4_WIDTH_PX * scale;
                canvas.height = A4_HEIGHT_PX * scale;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve();
            }
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
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
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
    
    console.log('Flipbook initialized at', Math.round(scale * 100) + '% zoom');
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
            if (hotspot.bounds && isPointInHotspot(x, y, hotspot.bounds)) {
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
    } else if (hotspot.mediaUrl || hotspot.url || hotspot.videoUrl) {
        const video = document.createElement('video');
        video.src = hotspot.mediaUrl || hotspot.url || hotspot.videoUrl;
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
    
    // Re-render based on source
    if (manifest && manifest.pages && !pdfDoc) {
        // Re-render from manifest
        await initFromManifest(manifest);
    } else if (pdfDoc) {
        // Re-render from PDF
        await renderAllPages();
        initFlipbook();
    }
    
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
