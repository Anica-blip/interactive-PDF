/**
 * 3C Interactive Flipbook Viewer
 * Real page turning with interactive media support + Supabase integration
 * Version: 2024-12-31-2023 - COMPLETE REWRITE: Fixed zoom mechanics and element positioning
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
let scale = 0.48; // Current zoom level (0.48 = 48%)
let manifest = null;
let pageCanvases = [];
let flipbookInitialized = false;

// A4 dimensions at 96 DPI (standard web DPI)
const A4_WIDTH_PX = 794;  // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

// Editor canvas dimensions (75% of A4 - this is what the editor uses)
const EDITOR_WIDTH_PX = 595;  // 794 * 0.75
const EDITOR_HEIGHT_PX = 842;  // 1123 * 0.75

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('pdf') || '';
const manifestUrl = urlParams.get('manifest') || '';
const projectId = urlParams.get('project') || '';

console.log('Flipbook v20241231-2023 - Loading with parameters:', {
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
        
        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        // Get response as text first to debug
        const responseText = await response.text();
        console.log('Raw response text (first 500 chars):', responseText.substring(0, 500));
        
        let projects;
        try {
            projects = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response as JSON');
            console.error('Full response text:', responseText);
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
        console.log('Response from Supabase:', projects);
        
        if (!projects || projects.length === 0) {
            throw new Error('Project not found');
        }
        
        const project = projects[0];
        console.log('Project loaded:', project.title || 'Untitled');
        console.log('Full project object:', project);
        console.log('project_json exists?', !!project.project_json);
        console.log('project_json type:', typeof project.project_json);
        console.log('project_json value:', project.project_json);
        
        // Parse the JSON data from project_json column
        
        let projectData;
        if (!project.project_json) {
            throw new Error('project_json column is empty or null');
        }
        
        // Supabase JSONB columns are returned as objects, not strings
        if (typeof project.project_json === 'object' && project.project_json !== null) {
            console.log('project_json is an object, using directly');
            projectData = project.project_json;
        } else if (typeof project.project_json === 'string') {
            console.log('project_json is a string, attempting to parse');
            try {
                projectData = JSON.parse(project.project_json);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Raw JSON string (first 500 chars):', project.project_json.substring(0, 500));
                throw new Error(`Failed to parse project JSON: ${parseError.message}`);
            }
        } else {
            console.error('project_json type is invalid:', typeof project.project_json);
            console.error('project_json value:', project.project_json);
            throw new Error(`project_json is not an object or string, it is: ${typeof project.project_json}`);
        }
        
        console.log('projectData parsed successfully');
        console.log('projectData.pages count:', projectData.pages?.length || 0);
        console.log('projectData.settings:', projectData.settings);
        
        // Create manifest from project data
        const manifest = {
            title: projectData.settings?.title || project.title || 'Interactive Flipbook',
            author: projectData.settings?.author || project.author || 'Chef',
            pages: projectData.pages || [],
            settings: projectData.settings || {},
            createdAt: project.created_at
        };
        
        console.log('Manifest created with', manifest.pages.length, 'pages');
        console.log('First page preview:', manifest.pages[0]);
        
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
        // Priority 3: Check for manifest URL (from 3C Content Library - JSON only)
        else if (manifestUrl) {
            console.log('Loading from manifest URL (3C Content Library)');
            const manifestData = await loadManifestFromUrl(manifestUrl);
            await initFromManifest(manifestData);
        }
        // Priority 4: Check for PDF URL (legacy PDF viewing)
        else if (pdfUrl) {
            console.log('Loading from PDF URL');
            await loadPDF(pdfUrl);
            
            // Render all pages
            await renderAllPages();
            
            // Initialize flipbook
            initFlipbook();
            
            // Setup event listeners
            setupEventListeners();
        }
        // No data source
        else {
            alert('⚠️ No flipbook data found!\n\nTo view flipbook:\n1. From editor: Click "View Flipbook" button\n2. From Supabase: Use URL ?project=PROJECT_ID\n3. From library: Use URL ?manifest=JSON_URL\n4. Legacy PDF: Use URL ?pdf=PDF_URL\n\nExample: flipbook.html?manifest=https://files.3c-public-library.org/flipbooks/my-flipbook.json');
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
    
    // Sort pages by pageNumber to ensure correct order
    if (manifest.pages && manifest.pages.length > 0) {
        manifest.pages.sort((a, b) => {
            const pageA = parseInt(a.pageNumber) || 0;
            const pageB = parseInt(b.pageNumber) || 0;
            return pageA - pageB;
        });
        console.log('✅ Pages sorted in correct order:', manifest.pages.map(p => p.pageNumber || '?').join(', '));
        console.log('✅ First page will be:', manifest.pages[0].pageNumber || 1);
    }
    
    totalPages = manifest.pages.length;
    
    document.getElementById('total-pages').textContent = totalPages;
    console.log('Manifest loaded:', totalPages, 'pages');
    
    // Update zoom display to show actual scale percentage
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    // Render all pages at current scale
    await renderPagesAtScale();
    
    // Initialize flipbook
    initFlipbook();
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Render all pages at the current scale
 * This is called on init and whenever zoom changes
 */
async function renderPagesAtScale() {
    pageCanvases = [];
    
    // Calculate actual display dimensions at current zoom
    const pageWidth = Math.round(A4_WIDTH_PX * scale);
    const pageHeight = Math.round(A4_HEIGHT_PX * scale);
    
    console.log('Rendering', manifest.pages.length, 'pages at', Math.round(scale * 100) + '% zoom');
    console.log('   Page dimensions:', pageWidth, 'x', pageHeight, 'px');
    
    for (let i = 0; i < manifest.pages.length; i++) {
        const page = manifest.pages[i];
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = () => {
                // Render at 2x resolution for quality, then scale display with CSS
                const renderScale = 2;
                canvas.width = pageWidth * renderScale;
                canvas.height = pageHeight * renderScale;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Set CSS display size to actual zoom size
                canvas.style.width = pageWidth + 'px';
                canvas.style.height = pageHeight + 'px';
                
                resolve();
            };
            
            img.onerror = (error) => {
                console.warn('Failed to load background for page', i + 1);
                const renderScale = 2;
                canvas.width = pageWidth * renderScale;
                canvas.height = pageHeight * renderScale;
                canvas.style.width = pageWidth + 'px';
                canvas.style.height = pageHeight + 'px';
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve();
            };
            
            // Get background source
            let backgroundSource = null;
            if (page.backgroundData) {
                backgroundSource = page.backgroundData;
            } else if (page.background && page.background.startsWith('data:')) {
                backgroundSource = page.background;
            } else if (page.background) {
                backgroundSource = page.background;
            }
            
            if (backgroundSource) {
                img.src = backgroundSource;
            } else {
                // Create blank canvas
                const renderScale = 2;
                canvas.width = pageWidth * renderScale;
                canvas.height = pageHeight * renderScale;
                canvas.style.width = pageWidth + 'px';
                canvas.style.height = pageHeight + 'px';
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve();
            }
        });
        
        pageCanvases.push(canvas);
    }
    
    console.log('All pages rendered at', Math.round(scale * 100) + '%');
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
 * Load manifest JSON from URL (for 3C Content Library)
 */
async function loadManifestFromUrl(url) {
    try {
        console.log('Fetching manifest from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const manifestData = await response.json();
        console.log('Manifest loaded from URL:', manifestData.title || 'Untitled');
        console.log('Pages:', manifestData.pages?.length || 0);
        
        return manifestData;
    } catch (error) {
        console.error('Failed to load manifest from URL:', error);
        throw new Error(`Failed to load flipbook manifest: ${error.message}`);
    }
}

/**
 * Load manifest JSON (legacy function)
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
    
    // Get actual page dimensions from CSS-styled canvas
    const pageWidth = Math.round(A4_WIDTH_PX * scale);
    const pageHeight = Math.round(A4_HEIGHT_PX * scale);
    
    console.log('Initializing flipbook with page size:', pageWidth, 'x', pageHeight);
    
    // Add pages to flipbook - ensure proper structure for turn.js
    pageCanvases.forEach((canvas, index) => {
        const pageDiv = $('<div class="page"></div>').css({
            width: pageWidth + 'px',
            height: pageHeight + 'px'
        });
        
        // Ensure canvas fills the page div
        $(canvas).css({
            'display': 'block',
            'width': '100%',
            'height': '100%'
        });
        
        pageDiv.append(canvas);
        
        // Add interactive elements overlay
        if (manifest && manifest.pages && manifest.pages[index]) {
            const pageData = manifest.pages[index];
            if (pageData.elements && pageData.elements.length > 0) {
                console.log('Page', index + 1, '- Rendering', pageData.elements.length, 'elements');
                renderInteractiveElements(pageDiv, pageData.elements, pageWidth, pageHeight);
            }
        }
        
        // Add page number
        const pageNumber = $('<div class="page-number"></div>').text(index + 1);
        pageDiv.append(pageNumber);
        
        flipbook.append(pageDiv);
    });
    
    // Initialize turn.js with correct dimensions
    flipbook.turn({
        width: pageWidth * 2, // Double width for spread
        height: pageHeight,
        autoCenter: true,
        display: 'double',
        gradients: true,
        elevation: 50,
        acceleration: true,
        duration: 1000,
        pages: totalPages,
        page: 1, // ALWAYS start on page 1
        // Corner configuration to align with document edges
        turnCorners: 'bl,br,tl,tr', // Enable all corners
        cornerSize: Math.min(pageWidth * 0.03, 30), // Extremely tiny corners - 3% of page width, max 30px
        when: {
            turning: function(event, page, view) {
                try {
                    // Validate page number is within bounds
                    if (page < 1 || page > totalPages) {
                        console.warn('⚠️ Invalid page number during turn:', page, '(valid: 1-' + totalPages + ')');
                        return false; // Cancel invalid turn
                    }
                    currentPage = page;
                    updatePageInfo();
                    return true; // Allow turn to proceed
                } catch (error) {
                    console.error('Error during page turn:', error);
                    // Don't block the turn, just log the error
                    return true;
                }
            },
            turned: function(event, page, view) {
                try {
                    // Validate page number is within bounds
                    if (page < 1 || page > totalPages) {
                        console.warn('⚠️ Invalid page number after turn:', page, '(valid: 1-' + totalPages + ')');
                        return;
                    }
                    currentPage = page;
                    updatePageInfo();
                    checkHotspots(page);
                } catch (error) {
                    console.error('Error after page turn:', error);
                }
            },
            missing: function(event, pages) {
                // Handle missing pages gracefully
                console.error('❌ Turn.js missing pages:', pages);
                console.log('🔄 This may cause navigation issues. Use refresh button if needed.');
            }
        }
    });
    
    flipbookInitialized = true;
    
    // Force set to page 1 after initialization
    currentPage = 1;
    setTimeout(() => {
        $('#flipbook').turn('page', 1);
        updatePageInfo();
        console.log('✅ Flipbook locked to page 1 on load');
    }, 100);
    
    console.log('Flipbook initialized at', Math.round(scale * 100) + '% zoom with', totalPages, 'pages');
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
        if (hotspot.url) {
            // Check if it's a video URL - use overlay popup
            if (isVideoUrl(hotspot.url)) {
                playVideo(hotspot);
            } else {
                // Regular link - open in new window
                window.open(hotspot.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
            }
        }
    }
}

/**
 * Detect if URL is a video platform link
 */
function isVideoUrl(url) {
    if (!url) return false;
    const videoPatterns = [
        /youtube\.com\/watch/i,
        /youtu\.be\//i,
        /vimeo\.com\//i,
        /cloudflarestream\.com/i,
        /customer-.*\.cloudflarestream\.com/i,
        /\.mp4$/i,
        /\.webm$/i,
        /\.ogg$/i,
        /\.mov$/i
    ];
    return videoPatterns.some(pattern => pattern.test(url));
}

/**
 * Convert video URL to embed iframe URL
 */
function getVideoEmbedUrl(url) {
    // YouTube
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]+)/);
    if (match) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    
    // Vimeo
    match = url.match(/vimeo\.com\/(\d+)/);
    if (match) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
    }
    
    return null;
}

/**
 * Play video in transparent floating player
 */
function playVideo(hotspot) {
    console.log('playVideo called with:', hotspot);
    console.log('   - Type:', hotspot.type);
    console.log('   - URL:', hotspot.url);
    console.log('   - VideoURL:', hotspot.videoUrl);
    console.log('   - MediaURL:', hotspot.mediaUrl);
    console.log('   - StreamID:', hotspot.streamId);
    console.log('   - IframeURL:', hotspot.iframeUrl);
    
    try {
        // Hide title completely
        videoTitle.textContent = '';
        videoTitle.style.display = 'none';
        videoPlayerWrapper.innerHTML = '';
        
        // Get the video URL from any available property
        const videoUrl = hotspot.url || hotspot.videoUrl || hotspot.mediaUrl || hotspot.iframeUrl;
        
        console.log('✅ Video URL found:', videoUrl);
        
        if (!videoUrl && !hotspot.streamId) {
            console.error('No video URL found in element:', hotspot);
            return;
        }
    
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
        const url = hotspot.mediaUrl || hotspot.url || hotspot.videoUrl;
        
        console.log('Processing video URL:', url);
        
        // Check if URL contains 'iframe' or is a Cloudflare Stream URL
        if (url.includes('/iframe') || url.includes('cloudflarestream.com') || url.includes('customer-')) {
            console.log('Cloudflare Stream iframe detected');
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.style.maxWidth = '100%';
            iframe.style.maxHeight = '70vh';
            iframe.style.width = 'auto';
            iframe.style.height = 'auto';
            iframe.style.border = 'none';
            videoPlayerWrapper.appendChild(iframe);
        } else {
            // Check if it's a YouTube/Vimeo URL that needs iframe
            const embedUrl = getVideoEmbedUrl(url);
            if (embedUrl) {
                console.log('YouTube/Vimeo embed detected');
                const iframe = document.createElement('iframe');
                iframe.src = embedUrl;
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.style.maxWidth = '100%';
                iframe.style.maxHeight = '70vh';
                iframe.style.width = 'auto';
                iframe.style.height = 'auto';
                iframe.style.border = 'none';
                videoPlayerWrapper.appendChild(iframe);
            } else {
                // Direct video file
                console.log('Direct video file detected');
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.autoplay = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain';
                if (hotspot.thumbnailUrl || hotspot.poster) {
                    video.poster = hotspot.thumbnailUrl || hotspot.poster;
                }
                
                // Simple sizing - let object-fit: contain handle aspect ratio
                video.onloadedmetadata = () => {
                    console.log('📐 Video loaded:', video.videoWidth, 'x', video.videoHeight);
                };
                
                // Error handling - console only, no popup alerts
                video.onerror = (e) => {
                    console.error('❌ Video failed to load:', url);
                    console.error('Error details:', e);
                    console.error('Error code:', video.error ? video.error.code : 'unknown');
                    videoPlayerWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 40px;">❌ Video Error<br><br>Failed to load video file.<br><br>Check browser console (F12) for details.</div>';
                };
                
                videoPlayerWrapper.appendChild(video);
            }
        }
    }
    
    videoOverlay.classList.add('active');
    } catch (error) {
        console.error('Error playing video:', error);
    }
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
    console.log('🔴 Closing video overlay - cleaning up all media');
    
    // Stop all video and audio elements
    videoPlayerWrapper.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.currentTime = 0;
        media.src = ''; // Clear source to fully release
        media.load(); // Reset media element
    });
    
    // Remove all iframes (YouTube, Vimeo, Cloudflare Stream)
    videoPlayerWrapper.querySelectorAll('iframe').forEach(iframe => {
        iframe.src = 'about:blank'; // Clear iframe source
        iframe.remove();
    });
    
    // Remove Cloudflare Stream elements
    videoPlayerWrapper.querySelectorAll('stream').forEach(stream => {
        stream.remove();
    });
    
    // Clear all content immediately
    videoPlayerWrapper.innerHTML = '';
    videoTitle.textContent = '';
    
    // Remove active class to hide overlay
    videoOverlay.classList.remove('active');
    
    console.log('✅ Video overlay cleaned and closed - ready for next video');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation buttons
    $('#first-page').on('click', () => {
        console.log('First page clicked - going to page 1');
        // In double-page mode with large documents, turn.js can throw errors
        // when jumping from end to beginning. Use try-catch and verify.
        try {
            const currentPage = $('#flipbook').turn('page');
            console.log('   Current page before jump:', currentPage);
            
            $('#flipbook').turn('page', 1);
            
            // Double-check after a short delay
            setTimeout(() => {
                const actualPage = $('#flipbook').turn('page');
                if (actualPage !== 1) {
                    console.log('⚠️ Page mismatch detected, correcting:', actualPage, '→ 1');
                    $('#flipbook').turn('page', 1);
                }
            }, 100);
        } catch (error) {
            console.error('❌ Error navigating to first page:', error);
            console.log('🔄 Attempting to reload flipbook to fix navigation...');
            // If navigation fails, reload the flipbook
            reloadFlipbook();
        }
    });
    
    $('#prev-page').on('click', () => {
        const current = $('#flipbook').turn('page');
        console.log('Previous clicked - current:', current, 'going to:', current - 1);
        if (current > 1) {
            $('#flipbook').turn('page', current - 1);
        }
    });
    
    $('#next-page').on('click', () => {
        const current = $('#flipbook').turn('page');
        console.log('Next clicked - current:', current, 'going to:', current + 1);
        if (current < totalPages) {
            $('#flipbook').turn('page', current + 1);
        }
    });
    
    $('#last-page').on('click', () => {
        console.log('Last page clicked - going to page', totalPages);
        // In double-page mode, ensure we go to the actual last page
        // Turn.js can get confused at the end, so we force it
        try {
            $('#flipbook').turn('page', totalPages);
            // Double-check after a short delay
            setTimeout(() => {
                const actualPage = $('#flipbook').turn('page');
                if (actualPage !== totalPages) {
                    console.log('⚠️ Page mismatch detected, correcting:', actualPage, '→', totalPages);
                    $('#flipbook').turn('page', totalPages);
                }
            }, 100);
        } catch (error) {
            console.error('Error navigating to last page:', error);
        }
    });
    
    // Refresh button - reload flipbook and go to page 1
    $('#refresh-flipbook').on('click', () => {
        console.log('🔄 Refresh flipbook clicked');
        currentPage = 1; // Reset to page 1
        reloadFlipbook();
    });
    
    // Zoom controls - only 48% and 53% allowed, reload JSON at new size starting page 1
    $('#zoom-in').on('click', async () => {
        console.log('🔍 Zoom in clicked - reloading JSON at 53%');
        if (scale < 0.53) {
            scale = 0.53; // Jump to 53%
            currentPage = 1; // Start at page 1
            await reloadFlipbook();
        }
    });
    
    $('#zoom-out').on('click', async () => {
        console.log('🔍 Zoom out clicked - reloading JSON at 48%');
        if (scale > 0.48) {
            scale = 0.48; // Jump to 48%
            currentPage = 1; // Start at page 1
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
            const current = $('#flipbook').turn('page');
            if (current > 1) {
                $('#flipbook').turn('page', current - 1);
            }
        } else if (e.key === 'ArrowRight') {
            const current = $('#flipbook').turn('page');
            if (current < totalPages) {
                $('#flipbook').turn('page', current + 1);
            }
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
function applyZoom() {
    console.log('Applying zoom:', Math.round(scale * 100) + '%');
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    $('#flipbook-wrapper').css({
        'transform': 'scale(' + (scale / 0.48) + ')',
        'transform-origin': 'center top'
    });
}

async function reloadFlipbook() {
    if (!loading) {
        console.error('Loading element not found!');
        return;
    }
    
    loading.classList.remove('hidden');
    console.log('Reloading flipbook');
    
    // Update zoom display
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    try {
        // Store current page before destroying
        const savedPage = currentPage;
        
        // Destroy existing flipbook
        if (flipbookInitialized) {
            try {
                // Check if turn.js is actually initialized on the element
                if (typeof $('#flipbook').turn === 'function' && $('#flipbook').data('turn')) {
                    $('#flipbook').turn('destroy');
                }
            } catch (e) {
                console.log('Turn.js destroy skipped:', e.message);
            }
            flipbookInitialized = false;
        }
        
        // Re-render based on source
        if (manifest && manifest.pages && !pdfDoc) {
            // Re-render pages at new scale
            await renderPagesAtScale();
            initFlipbook();
        } else if (pdfDoc) {
            // Re-render from PDF
            await renderAllPages();
            initFlipbook();
        }
        
        // Restore page position after reload (unless refresh button was clicked)
        if (savedPage > 1 && currentPage !== 1) {
            setTimeout(() => {
                $('#flipbook').turn('page', savedPage);
            }, 100);
        } else if (currentPage === 1) {
            setTimeout(() => {
                $('#flipbook').turn('page', 1);
            }, 100);
        }
        
        // Resize container to fit new dimensions
        const pageWidth = Math.round(A4_WIDTH_PX * scale);
        const pageHeight = Math.round(A4_HEIGHT_PX * scale);
        
        // Update flipbook dimensions
        $('#flipbook').css({
            width: (pageWidth * 2) + 'px',
            height: pageHeight + 'px'
        });
        
        // Update wrapper to match new size (important for zoom visual effect)
        $('#flipbook-wrapper').css({
            width: (pageWidth * 2) + 'px',
            height: pageHeight + 'px'
        });
        
        console.log('Flipbook reloaded at', Math.round(scale * 100) + '%, size:', (pageWidth * 2) + 'x' + pageHeight);
    } catch (error) {
        console.error('Error reloading flipbook:', error);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Render interactive elements as overlays on page
 * Elements are positioned based on editor coordinates (595px x 842px canvas)
 */
function renderInteractiveElements(pageDiv, elements, pageWidth, pageHeight) {
    // Filter out only positioned elements (ignore element container metadata)
    const positionedElements = elements.filter(element => {
        return (element.x !== undefined && element.x !== null) && 
               (element.y !== undefined && element.y !== null) &&
               element.type !== 'container' &&
               element.type !== 'element-container';
    });
    
    if (positionedElements.length === 0) return;
    
    console.log('Rendering', positionedElements.length, 'elements on page');
    
    positionedElements.forEach((element, idx) => {
        // Element positions are saved relative to editor canvas (595px x 842px)
        // We need to scale them to current viewer size (pageWidth x pageHeight)
        const scaleX = pageWidth / EDITOR_WIDTH_PX;
        const scaleY = pageHeight / EDITOR_HEIGHT_PX;
        
        if (idx === 0) {
            console.log('Element scaling:');
            console.log('   Editor canvas:', EDITOR_WIDTH_PX, 'x', EDITOR_HEIGHT_PX);
            console.log('   Viewer page:', pageWidth, 'x', pageHeight);
            console.log('   Scale factors:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));
            console.log('   Element raw:', element.x, element.y, element.width, element.height);
        }
        
        // Scale element position and size to match current page size
        const scaledX = element.x * scaleX;
        const scaledY = element.y * scaleY;
        const scaledWidth = (element.width || 100) * scaleX;
        const scaledHeight = (element.height || 40) * scaleY;
        
        if (idx === 0) {
            console.log('   Scaled to:', scaledX.toFixed(1), scaledY.toFixed(1), scaledWidth.toFixed(1), scaledHeight.toFixed(1));
        }
        
        const elementDiv = $('<div></div>')
            .addClass('interactive-element')
            .attr('data-element-type', element.type)
            .attr('data-element-url', element.url || '')
            .attr('data-element-data', JSON.stringify(element))
            .css({
                position: 'absolute',
                left: scaledX + 'px',
                top: scaledY + 'px',
                width: scaledWidth + 'px',
                height: scaledHeight + 'px',
                cursor: 'pointer',
                zIndex: 10
            });
        
        // Handle different element types
        if (element.type === '3c-button' && element.imagePath) {
            // 3C Button with image
            const img = $('<img>').attr('src', element.imagePath).css({
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                cursor: 'pointer',
                transition: 'transform 0.2s'
            }).hover(
                function() { $(this).css('transform', 'scale(1.05)'); },
                function() { $(this).css('transform', 'scale(1)'); }
            );
            
            img.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                try {
                    console.log('3C Button clicked:', element.text, '| URL:', element.url);
                    if (element.url) {
                        // Ensure URL has protocol (fix for legacy buttons)
                        let buttonUrl = element.url;
                        if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
                            buttonUrl = 'https://' + buttonUrl;
                            console.log('Added https:// protocol to URL:', buttonUrl);
                        }
                        
                        // Check if it's a video URL - use overlay popup
                        if (isVideoUrl(buttonUrl)) {
                            console.log('Video URL detected - opening in overlay:', buttonUrl);
                            playVideo(element);
                        } else {
                            console.log('Regular link - opening in new window:', buttonUrl);
                            // Regular link - open in new window
                            const popup = window.open(buttonUrl, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
                            if (!popup) {
                                console.error('Popup blocked by browser');
                                alert('Please allow popups for this site to open links');
                            } else {
                                console.log('Popup opened successfully');
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Error handling button click:', error);
                }
            });
            
            elementDiv.append(img);
        } else if (element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
            // 3C Emoji with image from GitHub Pages
            let emojiImgSrc = element.imagePath || element.image;
            if (emojiImgSrc && !emojiImgSrc.startsWith('http')) {
                emojiImgSrc = 'https://anica-blip.github.io/interactive-PDF/public' + (emojiImgSrc.startsWith('/') ? emojiImgSrc : '/' + emojiImgSrc);
            }
            
            if (emojiImgSrc) {
                const img = $('<img>').attr('src', emojiImgSrc).css({
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    cursor: element.url ? 'pointer' : 'default',
                    transition: 'transform 0.2s'
                });
                
                if (element.url) {
                    img.hover(
                        function() { $(this).css('transform', 'scale(1.05)'); },
                        function() { $(this).css('transform', 'scale(1)'); }
                    );
                    
                    img.on('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        try {
                            console.log('3C Emoji clicked:', element.name, '| URL:', element.url);
                            let emojiUrl = element.url;
                            if (!emojiUrl.startsWith('http://') && !emojiUrl.startsWith('https://')) {
                                emojiUrl = 'https://' + emojiUrl;
                            }
                            const popup = window.open(emojiUrl, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
                            if (!popup) {
                                alert('Please allow popups for this site to open links');
                            }
                        } catch (error) {
                            console.error('Error handling emoji click:', error);
                        }
                    });
                }
                
                elementDiv.append(img);
            }
        } else if (element.type === 'button') {
            // Regular button with text
            const button = $('<button></button>')
                .text(element.text || 'Click')
                .css({
                    width: '100%',
                    height: '100%',
                    background: element.backgroundColor || '#667eea',
                    color: element.textColor || '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: Math.round((element.fontSize || 14) * scaleX) + 'px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                })
                .hover(
                    function() { $(this).css('transform', 'scale(1.05)'); },
                    function() { $(this).css('transform', 'scale(1)'); }
                );
            
            button.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                try {
                    if (element.url) {
                        // Check if it's a video URL - use overlay popup
                        if (isVideoUrl(element.url)) {
                            playVideo(element);
                        } else {
                            window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
                        }
                    } else if (element.videoUrl || element.streamId) {
                        playVideo(element);
                    }
                } catch (error) {
                    console.error('Error handling button click:', error);
                }
            });
            
            elementDiv.append(button);
        } else if (element.type === 'hotspot' || element.type === 'link') {
            // Invisible clickable area
            elementDiv.css({
                background: 'transparent',
                border: '2px dashed rgba(102, 126, 234, 0.3)'
            }).hover(
                function() { $(this).css('background', 'rgba(102, 126, 234, 0.1)'); },
                function() { $(this).css('background', 'transparent'); }
            );
            
            elementDiv.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                try {
                    if (element.url) {
                        // Check if it's a video URL - use overlay popup
                        if (isVideoUrl(element.url)) {
                            playVideo(element);
                        } else {
                            window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
                        }
                    }
                } catch (error) {
                    console.error('Error handling element click:', error);
                }
            });
        } else if (element.type === 'video' || element.type === 'cloudflare-stream') {
            // Video element - directly clickable using the element's own image/thumbnail
            const thumbnailUrl = element.thumbnailUrl || element.poster || element.imagePath;
            
            if (thumbnailUrl) {
                // Create wrapper for thumbnail + play button overlay
                const videoWrapper = $('<div>').css({
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden'
                });
                
                // Thumbnail image
                const thumbnail = $('<img>').attr('src', thumbnailUrl).css({
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                });
                
                // Play button overlay (matching editor style)
                const playOverlay = $('<div>').css({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                });
                
                const playButton = $('<div>').css({
                    width: '64px',
                    height: '64px',
                    background: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                }).html('<i class="fas fa-play" style="color: #667eea; font-size: 24px; margin-left: 4px;"></i>');
                
                playOverlay.append(playButton);
                videoWrapper.append(thumbnail, playOverlay);
                
                // Hover effects
                videoWrapper.hover(
                    function() { 
                        playOverlay.css('background', 'rgba(0, 0, 0, 0.5)');
                        playButton.css('transform', 'scale(1.1)');
                    },
                    function() { 
                        playOverlay.css('background', 'rgba(0, 0, 0, 0.4)');
                        playButton.css('transform', 'scale(1)');
                    }
                );
                
                // Click handler - capture element in closure for multiple videos
                (function(capturedElement) {
                    videoWrapper.on('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('Video element clicked:', capturedElement);
                        playVideo(capturedElement);
                    });
                })(element);
                
                elementDiv.append(videoWrapper);
            } else {
                // No thumbnail - make the element itself clickable with play icon
                console.log('🎬 Video without thumbnail - creating play icon');
                
                elementDiv.css({
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '2px solid rgba(102, 126, 234, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }).hover(
                    function() { $(this).css('background', 'rgba(102, 126, 234, 0.3)'); },
                    function() { $(this).css('background', 'rgba(102, 126, 234, 0.2)'); }
                );
                
                // Add play icon
                const playIcon = $('<i class="fas fa-play-circle"></i>').css({
                    color: '#667eea',
                    fontSize: '48px',
                    pointerEvents: 'none'  // Let clicks pass through to parent
                });
                elementDiv.append(playIcon);
                
                // Attach click handler - capture element in closure for multiple videos
                (function(capturedElement) {
                    elementDiv.on('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('✅ Video element clicked (no thumbnail):', capturedElement);
                        playVideo(capturedElement);
                    });
                    
                    // Test if element is actually clickable
                    elementDiv.on('mouseenter', function() {
                        console.log('🖱️ Mouse entered video element (no thumbnail)');  
                    });
                })(element);
                
                console.log('✅ Video element (no thumbnail) appended to page');
            }
        } else if (element.type === 'audio') {
            // Audio element - clickable with audio icon or thumbnail
            const thumbnailUrl = element.thumbnailUrl || element.imagePath;
            
            if (thumbnailUrl) {
                const thumbnail = $('<img>').attr('src', thumbnailUrl).css({
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'transform 0.2s'
                }).hover(
                    function() { $(this).css('transform', 'scale(1.05)'); },
                    function() { $(this).css('transform', 'scale(1)'); }
                );
                
                thumbnail.on('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Audio element clicked:', element);
                    playAudio(element);
                });
                
                elementDiv.append(thumbnail);
            } else {
                // No thumbnail - show audio icon
                elementDiv.css({
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '2px solid rgba(102, 126, 234, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }).hover(
                    function() { $(this).css('background', 'rgba(102, 126, 234, 0.3)'); },
                    function() { $(this).css('background', 'rgba(102, 126, 234, 0.2)'); }
                ).html('<i class="fas fa-volume-up" style="color: #667eea; font-size: 24px;"></i>');
                
                elementDiv.on('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Audio element clicked:', element);
                    playAudio(element);
                });
            }
        } else if (element.type === 'gif') {
            // GIF element - clickable animated image
            const gifUrl = element.mediaUrl || element.url || element.imagePath;
            
            if (gifUrl) {
                const gifImg = $('<img>').attr('src', gifUrl).css({
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'transform 0.2s'
                }).hover(
                    function() { $(this).css('transform', 'scale(1.05)'); },
                    function() { $(this).css('transform', 'scale(1)'); }
                );
                
                gifImg.on('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('GIF element clicked:', element);
                    showGif(element);
                });
                
                elementDiv.append(gifImg);
            }
        }
        
        pageDiv.append(elementDiv);
    });
}

/**
 * Setup event delegation for interactive elements
 * This ensures clicks work even when Turn.js manipulates the DOM
 */
function setupInteractiveElementHandlers() {
    console.log('🎯 Setting up event delegation for interactive elements...');
    
    // Use event delegation - attach to document which never gets destroyed
    $(document).on('click', '.interactive-element', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const $element = $(this);
        const elementData = JSON.parse($element.attr('data-element-data'));
        const elementType = $element.attr('data-element-type');
        
        console.log('\n🎯 ========== INTERACTIVE ELEMENT CLICKED ==========');
        console.log('Element type:', elementType);
        console.log('Element data:', elementData);
        
        // Handle different element types
        if (elementType === '3c-button' || elementType === 'button') {
            if (elementData.url) {
                console.log('📍 URL:', elementData.url);
                
                // Ensure URL has protocol (fix for legacy buttons)
                let buttonUrl = elementData.url;
                if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
                    buttonUrl = 'https://' + buttonUrl;
                    console.log('Added https:// protocol to URL:', buttonUrl);
                }
                
                if (isVideoUrl(buttonUrl)) {
                    console.log('🎥 Opening video...');
                    playVideo(elementData);
                } else {
                    console.log('🔗 Opening link...');
                    const popup = window.open(buttonUrl, '_blank', 'width=800,height=600');
                    if (!popup) {
                        console.warn('⚠️ Popup blocked');
                    }
                }
            } else if (elementData.videoUrl || elementData.streamId) {
                playVideo(elementData);
            }
        } else if (elementType === 'hotspot' || elementType === 'link') {
            if (elementData.url) {
                // Ensure URL has protocol (fix for legacy elements)
                let linkUrl = elementData.url;
                if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
                    linkUrl = 'https://' + linkUrl;
                    console.log('Added https:// protocol to URL:', linkUrl);
                }
                
                if (isVideoUrl(linkUrl)) {
                    playVideo(elementData);
                } else {
                    const popup = window.open(linkUrl, '_blank', 'width=800,height=600');
                    if (!popup) {
                        console.warn('⚠️ Popup blocked');
                    }
                }
            }
        } else if (elementType === 'video' || elementType === 'cloudflare-stream') {
            console.log('🎬 Opening video element...');
            playVideo(elementData);
        } else if (elementType === 'gif' || elementType === 'image') {
            console.log('🖼️ Opening GIF/image element...');
            showGif(elementData);
        } else if (elementType === 'audio') {
            console.log('🎵 Opening audio element...');
            playAudio(elementData);
        } else if (elementType === '3c-emoji' || elementType === '3c-emoji-decoration') {
            if (elementData.url) {
                let emojiUrl = elementData.url;
                if (!emojiUrl.startsWith('http://') && !emojiUrl.startsWith('https://')) {
                    emojiUrl = 'https://' + emojiUrl;
                }
                // Check if it's a video URL
                if (isVideoUrl(emojiUrl)) {
                    console.log('🎥 3c-emoji video detected, using purple overlay...');
                    playVideo({...elementData, url: emojiUrl});
                } else {
                    const popup = window.open(emojiUrl, '_blank', 'width=800,height=600');
                    if (!popup) alert('Please allow popups');
                }
            }
        }
        
        console.log('========================================\n');
    });
    
    console.log('✅ Event delegation setup complete');
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
    setupInteractiveElementHandlers();
    init();
});
