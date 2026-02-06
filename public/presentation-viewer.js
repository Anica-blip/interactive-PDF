/**
 * 3C Content Library - Presentation Viewer
 * Enhanced version with 2x rendering quality and popup functions
 * Version: 2025-01-27 - Cloned from flipbook viewer for presentations
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let currentPage = 1;
let totalPages = 0;
let scale = 0.48; // Default 48% zoom for optimal viewing (fits viewport without scrolling)
let manifest = null;
let pageCanvases = [];
let presentationInitialized = false;
let contentId = null;
let contentData = null;

// A4 dimensions at 96 DPI (standard web DPI)
const A4_WIDTH_PX = 794;  // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

// Current page dimensions (default to landscape for presentations)
let currentPageWidth = A4_HEIGHT_PX;  // Start with landscape width
let currentPageHeight = A4_WIDTH_PX;  // Start with landscape height
let isLandscape = true;  // Default to landscape

// Editor canvas dimensions (75% of A4 - this is what the editor uses)
const EDITOR_WIDTH_PX = 595;  // 794 * 0.75
const EDITOR_HEIGHT_PX = 842;  // 1123 * 0.75

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('pdf') || '';
const manifestUrl = urlParams.get('manifest') || '';
const projectId = urlParams.get('project') || '';

console.log('Presentation v20241231-2023 - Loading with parameters:', {
    pdfUrl: pdfUrl,
    manifestUrl: manifestUrl,
    projectId: projectId    
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
let mediaOverlay = null;
let closeMediaBtn = null;

// Initialize DOM elements
function initDOMElements() {
    loading = document.getElementById('loading');
    videoOverlay = document.getElementById('video-overlay');
    videoPlayerWrapper = document.getElementById('video-player-wrapper');
    videoTitle = document.getElementById('video-title');
    closeVideoBtn = document.getElementById('close-video');
    mediaOverlay = document.getElementById('media-overlay');
    closeMediaBtn = document.getElementById('close-media');
    
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
            title: projectData.settings?.title || project.title || 'Interactive Presentation',
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
        throw new Error(`Failed to load presentation manifest: ${error.message}`);
    }
}

/**
 * Initialize presentation
 */
async function init() {
    try {
        // Initialize DOM elements first
        if (!initDOMElements()) {
            console.error('Failed to initialize DOM elements');
            return;
        }

        console.log('🖥️ Desktop device detected, loading desktop presentation...');
        
        // Priority 1: Check for project ID (from Supabase)
        if (projectId) {
            console.log('Loading from Supabase project:', projectId);
            await loadProjectFromSupabase(projectId);
            
            // Render all pages
            await renderAllPages();
            
            // Initialize presentation
            initPresentation();
        
            // Setup event listeners
            setupEventListeners();
        }
        // Priority 2: Check for sessionStorage manifest (from builder preview)
        else if (sessionManifest) {
            console.log('Loading from builder preview (sessionStorage)');
            await initFromManifest(JSON.parse(sessionManifest));
            // Clear sessionStorage after loading
            sessionStorage.removeItem('presentationManifest');
            
            // Render all pages
            await renderAllPages();
            
            // Initialize presentation
            initPresentation();
        
            // Setup event listeners
            setupEventListeners();
        }
        // Priority 3: Check for manifest URL (from 3C Content Library - JSON only)
        else if (manifestUrl) {
            console.log('Loading from manifest URL (3C Content Library)');
            const manifestData = await loadManifestFromUrl(manifestUrl);
            await initFromManifest(manifestData);
            
            // Render all pages
            await renderAllPages();
            
            // Initialize presentation
            initPresentation();
        
            // Setup event listeners
            setupEventListeners();
        }
        // No data source
        else {
            alert('⚠️ No presentation data found!\n\nTo view presentation:\n1. From editor: Click "View Presentation" button\n2. From Supabase: Use URL ?project=PROJECT_ID\n3. From library: Use URL ?manifest=JSON_URL');
            loading.classList.add('hidden');
            return;
        }
    } catch (error) {
        console.error('Init error:', error);
        alert('Failed to load presentation: ' + error.message);
        loading.classList.add('hidden');
    }
}

/**
 * Detect page orientation from manifest
 * Default is landscape, switch to portrait only if detected
 */
function detectPageOrientation() {
    // Start with landscape as default (already set in global variables)
    isLandscape = true;
    currentPageWidth = A4_HEIGHT_PX;
    currentPageHeight = A4_WIDTH_PX;
    
    // Check manifest metadata for orientation
    if (manifest.orientation) {
        if (manifest.orientation === 'portrait') {
            isLandscape = false;
            currentPageWidth = A4_WIDTH_PX;
            currentPageHeight = A4_HEIGHT_PX;
            console.log('📐 Portrait orientation from manifest metadata');
        } else {
            console.log('📐 Landscape orientation from manifest metadata');
        }
    }
    // Check first page dimensions if available
    else if (manifest.pages && manifest.pages.length > 0) {
        const firstPage = manifest.pages[0];
        if (firstPage.width && firstPage.height) {
            // Only switch to portrait if height is clearly greater than width
            if (firstPage.height > firstPage.width) {
                isLandscape = false;
                currentPageWidth = A4_WIDTH_PX;
                currentPageHeight = A4_HEIGHT_PX;
                console.log('📐 Portrait detected from page dimensions:', firstPage.width, 'x', firstPage.height);
            } else {
                console.log('📐 Landscape detected from page dimensions:', firstPage.width, 'x', firstPage.height);
            }
        }
    }
    
    console.log('✅ Final orientation:', isLandscape ? 'LANDSCAPE' : 'PORTRAIT', '→', currentPageWidth, 'x', currentPageHeight);
}

/**
 * Initialize from JSON manifest
 */
async function initFromManifest(manifestData) {
    manifest = manifestData;
    
    // Sort pages by pageNumber to ensure correct order
    if (manifest.pages && manifest.pages.length > 0) {
        manifest.pages.sort((a, b) => {
            const pageA = a.pageNumber || 0;
            const pageB = b.pageNumber || 0;
            return pageA - pageB;
        });
        console.log('📄 Pages sorted by pageNumber:', manifest.pages.map(p => p.pageNumber || '?').join(', '));
    }

    totalPages = manifest.pages ? manifest.pages.length : 0;
    
    if (totalPages === 0) {
        throw new Error('No pages found in presentation data');
    }
    
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    console.log('🎨 Rendering', totalPages, 'pages at', Math.round(scale * 100) + '% zoom');
    
    // Detect page orientation from first page or manifest metadata
    detectPageOrientation();
    
    // Render all pages at current scale with 2x quality
    await renderPagesAtScale();
    
    // Initialize presentation
    initPresentation();
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Render all pages at the current scale
 * This is called on init and whenever zoom changes
 */
async function renderPagesAtScale() {
    pageCanvases = [];
    
    // Calculate actual display dimensions at current zoom (using detected orientation)
    const pageWidth = Math.round(currentPageWidth * scale);
    const pageHeight = Math.round(currentPageHeight * scale);
    
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
                console.warn(' Failed to load background for page', i + 1);
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
    
    console.log(' All pages rendered at', Math.round(scale * 100) + '% with 2x quality');
}

/**
 * Initialize turn.js presentation
 */
function initPresentation() {
    const presentation = $('#presentation');
    
    // Clear existing content
    presentation.empty();
    
    // Get actual page dimensions from CSS-styled canvas (using detected orientation)
    const pageWidth = Math.round(currentPageWidth * scale);
    const pageHeight = Math.round(currentPageHeight * scale);
    
    console.log('📖 Initializing presentation with page size:', pageWidth, 'x', pageHeight);
    
    // Add pages to presentation
    pageCanvases.forEach((canvas, index) => {
        const pageDiv = $('<div class="page"></div>');
        
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
                console.log(' Page', index + 1, '- Rendering', pageData.elements.length, 'elements');
                renderInteractiveElements(pageDiv, pageData.elements, pageWidth, pageHeight);
            }
        }
        
        // Add page number
        const pageNumber = $('<div class="page-number"></div>').text(index + 1);
        pageDiv.append(pageNumber);
        
        presentation.append(pageDiv);
    });
    
    // Initialize turn.js with correct dimensions
    presentation.turn({
        width: pageWidth, // Single page width
        height: pageHeight,
        autoCenter: true,
        display: 'single', // Single page view (not double spread)
        gradients: true,
        elevation: 50,
        acceleration: true,
        duration: 1000,
        pages: totalPages,
        when: {
            turning: function(event, page, view) {
                try {
                    currentPage = page;
                    updatePageInfo();
                } catch (error) {
                    console.error('Error during page turn:', error);
                    return true;
                }
            },
            turned: function(event, page, view) {
                currentPage = page;
                updatePageInfo();
            },
            start: function(event, pageObject, corner) {
                // Prevent turn if element is being clicked
                if ($(event.target).closest('.interactive-element').length > 0) {
                    event.preventDefault();
                    return false;
                }
            }
        }
    });
    
    presentationInitialized = true;
    updatePageInfo();
    
    console.log('✅ Presentation initialized at', Math.round(scale * 100) + '% zoom');
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
    
    console.log(' Rendering', positionedElements.length, 'elements on page');
    
    positionedElements.forEach((element, idx) => {
        // Log each element type for debugging
        console.log(`   Element ${idx + 1}: type="${element.type}", x=${element.x}, y=${element.y}, width=${element.width}, height=${element.height}`);
        
        // Element positions are saved relative to editor canvas (595px x 842px)
        // We need to scale them to current viewer size (pageWidth x pageHeight)
        const scaleX = pageWidth / EDITOR_WIDTH_PX;
        const scaleY = pageHeight / EDITOR_HEIGHT_PX;
        
        if (idx === 0) {
            console.log('🔍 Element scaling:');
            console.log('   Editor canvas:', EDITOR_WIDTH_PX, 'x', EDITOR_HEIGHT_PX);
            console.log('   Viewer page:', pageWidth, 'x', pageHeight);
            console.log('   Scale factors:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));
        }
        
        // Scale element position and size to match current page size
        const scaledX = element.x * scaleX;
        const scaledY = element.y * scaleY;
        const scaledWidth = (element.width || 100) * scaleX;
        const scaledHeight = (element.height || 40) * scaleY;
        
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
        if (element.type === '3c-button') {
            console.log(`   🔘 3C Button - imagePath: ${element.imagePath || 'MISSING'}, image: ${element.image || 'MISSING'}, url: ${element.url}`);
            
            // Try imagePath first, then image property
            // Button images stored in interactive-pdf repo - use full GitHub Pages URL
            let buttonImage = element.imagePath || element.image;
            if (buttonImage && !buttonImage.startsWith('http')) {
                // Convert relative path to full interactive-pdf GitHub Pages URL with /public/ directory
                buttonImage = 'https://anica-blip.github.io/interactive-PDF/public' + (buttonImage.startsWith('/') ? buttonImage : '/' + buttonImage);
                console.log(`   🔗 Using interactive-pdf repo URL: ${buttonImage}`);
            }
            
            if (buttonImage) {
                // 3C Button with image
                const img = $('<img>').attr('src', buttonImage).css({
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                cursor: 'pointer',
                transition: 'transform 0.2s'
            }).hover(
                function() { $(this).css('transform', 'scale(1.05)'); },
                function() { $(this).css('transform', 'scale(1)'); }
            );
            
            img.on('mouseenter', function() {
                console.log('🖱️ Mouse ENTERED button - URL:', element.url);
            });
            img.on('click', function(e) {
                e.stopPropagation();
                console.log('\n🔘 ========== BUTTON CLICKED ==========');
                console.log('✅ CLICK DETECTED!');
                try {
                    console.log('🔘 3C Button clicked:', element);
                    if (element.url) {
                        console.log('📍 Button URL:', element.url);
                        if (isVideoUrl(element.url)) {
                            console.log('🎥 Detected as video URL, opening in popup...');
                            playMedia(element, 'video');
                        } else {
                            console.log('🔗 Opening link in new window...');
                            const popup = window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
                            if (!popup) {
                                console.error('❌ Popup blocked by browser');
                                // alert('⚠️ Popup Blocked\n\nPlease allow popups for this site to open links.\n\nURL: ' + element.url);
                            } else {
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } else {
                        console.warn('⚠️ Button has no URL configured');
                        // alert('⚠️ Button Error\n\nThis button has no URL configured.');
                    }
                } catch (error) {
                    console.error('❌ Error handling button click:', error);
                    // alert('❌ Button Error\n\n' + error.message);
                }
            });
            
            elementDiv.append(img);
            } else {
                // 3C Button without image - show styled button
                console.warn('   ⚠️ 3C Button missing image - rendering as styled button');
                const button = $('<button></button>')
                    .text(element.text || '3C Button')
                    .css({
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: Math.round(14 * scaleX) + 'px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                        transition: 'all 0.2s'
                    })
                    .hover(
                        function() { $(this).css('transform', 'scale(1.05)'); },
                        function() { $(this).css('transform', 'scale(1)'); }
                    );
                
                button.on('click', function(e) {
                    e.stopPropagation();
                    try {
                        console.log('🔘 3C Button (no image) clicked:', element);
                        if (element.url) {
                            console.log('📍 Button URL:', element.url);
                            if (isVideoUrl(element.url)) {
                                console.log('🎥 Detected as video URL, opening in popup...');
                                playMedia(element, 'video');
                            } else {
                                console.log('🔗 Opening link in new window...');
                                window.open(element.url, '_blank');
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error handling button click:', error);
                    }
                });
                
                elementDiv.append(button);
            }
        } else if (element.type === 'button') {
            // Regular button
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
                    console.log('\n🔘 ========== BUTTON CLICKED ==========');
                    console.log('Element type:', element.type);
                    console.log('Element object:', JSON.stringify(element, null, 2));
                    console.log('Element.url:', element.url);
                    console.log('Element.videoUrl:', element.videoUrl);
                    console.log('Element.mediaUrl:', element.mediaUrl);
                    console.log('Element.iframeUrl:', element.iframeUrl);
                    console.log('Element.streamId:', element.streamId);
                    
                    if (element.url) {
                        console.log('📍 Button URL:', element.url);
                        const isVideo = isVideoUrl(element.url);
                        console.log('🔍 isVideoUrl() result:', isVideo);
                        
                        if (isVideo) {
                            console.log('🎥 Detected as video URL, opening in popup...');
                            playMedia(element, 'video');
                        } else {
                            console.log('🔗 Opening link in new window...');
                            const popup = window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
                            if (!popup) {
                                console.error('❌ Popup blocked by browser');
                                // alert('⚠️ Popup Blocked\n\nPlease allow popups for this site.\n\nURL: ' + element.url);
                            } else {
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } else if (element.videoUrl || element.streamId) {
                        console.log('🎥 Opening video from videoUrl/streamId...');
                        playMedia(element, 'video');
                    } else {
                        console.warn('⚠️ Button has no URL or video configured');
                        console.log('Available element properties:', Object.keys(element));
                        // alert('⚠️ Button Error\n\nThis button has no URL or video configured.\n\nElement type: ' + element.type);
                    }
                    console.log('========================================\n');
                } catch (error) {
                    console.error('❌ Error handling button click:', error);
                    console.error('Stack trace:', error.stack);
                    // alert('❌ Button Error\n\n' + error.message);
                }
            });
            
            elementDiv.append(button);
        } else if (element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
            console.log(`   🎭 3C Emoji - imagePath: ${element.imagePath || 'MISSING'}, url: ${element.url || 'decoration only'}`);
            
            // Emoji images stored in interactive-pdf repo
            let emojiImage = element.imagePath || element.image;
            if (emojiImage && !emojiImage.startsWith('http')) {
                // Convert relative path to full interactive-pdf GitHub Pages URL
                emojiImage = 'https://anica-blip.github.io/interactive-PDF/public' + (emojiImage.startsWith('/') ? emojiImage : '/' + emojiImage);
                console.log(`   🔗 Using interactive-pdf repo URL: ${emojiImage}`);
            }
            
            if (emojiImage) {
                const img = $('<img>').attr('src', emojiImage).css({
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    cursor: element.url ? 'pointer' : 'default',
                    transition: 'transform 0.2s',
                    borderRadius: '50%'
                });
                
                if (element.url) {
                    img.hover(
                        function() { $(this).css('transform', 'scale(1.1)'); },
                        function() { $(this).css('transform', 'scale(1)'); }
                    );
                    
                    img.on('click', function(e) {
                        e.stopPropagation();
                        console.log('\n🎭 ========== EMOJI CLICKED ==========');
                        try {
                            console.log('🎭 3C Emoji clicked:', element);
                            if (element.url) {
                                console.log('📍 Emoji URL:', element.url);
                                if (isVideoUrl(element.url)) {
                                    console.log('🎥 Opening video...');
                                    playMedia(element, 'video');
                                } else {
                                    console.log('🔗 Opening link...');
                                    const popup = window.open(element.url, '_blank', 'width=800,height=600');
                                    if (!popup) {
                                        console.error('❌ Popup blocked');
                                    } else {
                                        console.log('✅ Link opened successfully');
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('❌ Error handling emoji click:', error);
                        }
                    });
                }
                
                elementDiv.append(img);
            }
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
                try {
                    console.log('🎯 Hotspot/Link clicked:', element);
                    if (element.url) {
                        console.log('📍 Hotspot URL:', element.url);
                        if (isVideoUrl(element.url)) {
                            console.log('🎥 Detected as video URL, opening in popup...');
                            playMedia(element, 'video');
                        } else {
                            console.log('🔗 Opening link in new window...');
                            const popup = window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
                            if (!popup) {
                                console.error('❌ Popup blocked by browser');
                                // alert('⚠️ Popup Blocked\n\nPlease allow popups for this site.\n\nURL: ' + element.url);
                            } else {
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } else {
                        console.warn('⚠️ Hotspot has no URL configured');
                        // alert('⚠️ Hotspot Error\n\nThis hotspot has no URL configured.');
                    }
                } catch (error) {
                    console.error('❌ Error handling hotspot click:', error);
                    // alert('❌ Hotspot Error\n\n' + error.message);
                }
            });
        } else if (element.type === 'video' || element.type === 'cloudflare-stream') {
            // Video with thumbnail or purple box
            const videoWrapper = $('<div></div>').css({
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '8px',
                cursor: 'pointer'
            });
            
            // Check if video has thumbnail
            if (element.thumbnail || element.thumbnailUrl) {
                // Video WITH thumbnail
                const thumbnailUrl = element.thumbnail || element.thumbnailUrl;
                videoWrapper.css({
                    backgroundImage: `url(${thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                });
                
                const playBtn = $('<div></div>').css({
                    width: Math.round(64 * scaleX) + 'px',
                    height: Math.round(64 * scaleX) + 'px',
                    background: 'rgba(139, 92, 246, 0.3)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    pointerEvents: 'none'
                }).html('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="margin-left: 3px;"><path d="M8 5v14l11-7z" fill="#a78bfa" stroke="#a78bfa" stroke-width="2" stroke-linejoin="round"/></svg>');
                
                videoWrapper.append(playBtn);
                
                // IIFE to capture element correctly for multiple videos
                (function(capturedElement) {
                    videoWrapper.on('click', function(e) {
                        e.stopPropagation();
                        console.log('\n🎬 ========== VIDEO ELEMENT CLICKED ==========');
                        console.log('Element type:', capturedElement.type);
                        console.log('Element object:', JSON.stringify(capturedElement, null, 2));
                        console.log('========================================\n');
                        playMedia(capturedElement, 'video');
                    });
                })(element);
                
            } else {
                // Video WITHOUT thumbnail - purple box with play icon
                console.log('   🎬 Creating video wrapper WITHOUT thumbnail - purple box + Font Awesome icon');
                videoWrapper.css({
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '2px solid rgba(102, 126, 234, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                });
                
                const playIcon = $('<i class="fas fa-play-circle"></i>').css({
                    color: '#667eea',
                    fontSize: '48px',
                    pointerEvents: 'none'
                });
                console.log('   ▶️ Font Awesome play icon created:', playIcon.length, 'elements');
                
                videoWrapper.append(playIcon);
                console.log('   ✅ Play icon appended to videoWrapper');
                
                // IIFE to capture element correctly for multiple videos
                (function(capturedElement) {
                    videoWrapper.on('mouseenter', function() {
                        console.log('🖱️ Mouse ENTERED video element - URL:', capturedElement.url || 'NO URL');
                    });
                    videoWrapper.on('click', function(e) {
                        e.stopPropagation();
                        console.log('\n🎬 ========== VIDEO CLICKED ==========');
                        console.log('✅ CLICK DETECTED!');
                        console.log('Video URL:', capturedElement.url);
                        console.log('Element type:', capturedElement.type);
                        console.log('========================================\n');
                        playMedia(capturedElement, 'video');
                    });
                })(element);
            }
            
            elementDiv.append(videoWrapper);
            console.log(`   ✅ Video element rendered: ${element.type}, has thumbnail: ${!!(element.thumbnail || element.thumbnailUrl)}`);
            console.log(`   📦 VideoWrapper appended to elementDiv. Wrapper children count: ${videoWrapper.children().length}`);
        } else {
            // Unhandled element type - log it
            console.warn(`   ⚠️ Unhandled element type: "${element.type}"`);
        }
        
        pageDiv.append(elementDiv);
    });
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
        /\.mp4$/i,
        /\.webm$/i,
        /\.ogg$/i,
        /\.mov$/i,
        /cloudflarestream\.com/i,
        /cloudflare\.com.*\/stream/i,
        /r2\..*\.org.*\.(mp4|webm|mov)/i, // Cloudflare R2 video files
        /customer-.*\.cloudflarestream\.com/i // Cloudflare Stream customer domains
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
 * Play video/audio in overlay
 */
function playMedia(element, type) {
    try {
        console.log('\n🎬 ========== PLAYING MEDIA ==========');
        console.log('Element:', element);
        console.log('Type:', type);
        
        // Hide title completely - no need to show anything
        mediaTitle.textContent = '';
        mediaTitle.style.display = 'none';
        mediaPlayerWrapper.innerHTML = '';
        
        if (type === 'video') {
            const videoUrl = element.url || element.videoUrl || element.mediaUrl || element.iframeUrl;
            console.log('📍 Video URL:', videoUrl);
            console.log('📍 Stream ID:', element.streamId);
            console.log('📍 Element type:', element.type);
            
            if (!videoUrl && !element.streamId) {
                console.error('❌ No video URL found in element');
                console.error('Element details:', JSON.stringify(element, null, 2));
                // alert('❌ Video Error\n\nNo video URL found.\n\nElement type: ' + element.type + '\n\nPlease check the element configuration in the editor.');
                return;
            }
            
            // Cloudflare Stream
            if (element.type === 'cloudflare-stream' && element.streamId) {
                console.log('🎥 Using Cloudflare Stream element with ID:', element.streamId);
                const streamElement = document.createElement('stream');
                streamElement.setAttribute('src', element.streamId);
                streamElement.setAttribute('controls', '');
                streamElement.setAttribute('autoplay', '');
                if (element.poster) {
                    streamElement.setAttribute('poster', element.poster);
                }
                streamElement.onerror = (e) => {
                    console.error('❌ Cloudflare Stream failed to load:', e);
                    // alert('❌ Video Error\n\nCloudflare Stream failed to load.\n\nStream ID: ' + element.streamId);
                };
                mediaPlayerWrapper.appendChild(streamElement);
                console.log('✅ Cloudflare Stream element added to page');
            }
            // Cloudflare Stream iframe
            else if (videoUrl && (videoUrl.includes('/iframe') || videoUrl.includes('cloudflarestream.com'))) {
                console.log('🎥 Using Cloudflare Stream iframe:', videoUrl);
                const iframe = document.createElement('iframe');
                iframe.src = videoUrl;
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.style.maxWidth = '100%';
                iframe.style.maxHeight = '70vh';
                iframe.style.width = 'auto';
                iframe.style.height = 'auto';
                iframe.style.border = 'none';
                iframe.onerror = (e) => {
                    console.error('❌ Cloudflare Stream iframe failed to load:', e);
                    // alert('❌ Video Error\n\nCloudflare Stream iframe failed to load.\n\nURL: ' + videoUrl);
                };
                mediaPlayerWrapper.appendChild(iframe);
                console.log('✅ Cloudflare Stream iframe added to page');
            }
            // YouTube/Vimeo
            else if (videoUrl) {
                const embedUrl = getVideoEmbedUrl(videoUrl);
                if (embedUrl) {
                    console.log('🎥 Using YouTube/Vimeo embed:', embedUrl);
                    const iframe = document.createElement('iframe');
                    iframe.src = embedUrl;
                    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = true;
                    iframe.style.maxWidth = '100%';
                    iframe.style.maxHeight = '70vh';
                    iframe.style.width = 'auto';
                    iframe.style.height = 'auto';
                    iframe.style.border = 'none';
                    iframe.onerror = (e) => {
                        console.error('❌ YouTube/Vimeo iframe failed to load:', e);
                        // alert('❌ Video Error\n\nYouTube/Vimeo iframe failed to load.\n\nURL: ' + embedUrl);
                    };
                    mediaPlayerWrapper.appendChild(iframe);
                    console.log('✅ YouTube/Vimeo iframe added to page');
                } else {
                    // Direct video file (including Cloudflare R2 URLs)
                    console.log('🎥 Using direct video file:', videoUrl);
                    const video = document.createElement('video');
                    video.src = videoUrl;
                    video.controls = true;
                    video.autoplay = true;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'contain';
                    video.setAttribute('crossorigin', 'anonymous'); // Enable CORS for Cloudflare R2
                    if (element.thumbnailUrl || element.poster) {
                        video.poster = element.thumbnailUrl || element.poster;
                        console.log('📸 Using poster:', element.thumbnailUrl || element.poster);
                    }
                    
                    // Simple sizing - let object-fit: contain handle aspect ratio
                    video.onloadedmetadata = () => {
                        console.log('📐 Video loaded:', video.videoWidth, 'x', video.videoHeight);
                    };
                    
                    // Error handling - console only, no popup alerts
                    video.onerror = (e) => {
                        console.error('❌ Video failed to load:', videoUrl);
                        console.error('Error details:', e);
                        console.error('Error code:', video.error ? video.error.code : 'unknown');
                        console.error('Possible causes: File not found (404), CORS not enabled, Invalid format, Network error');
                        // Show error in player area but NO alert popup
                        mediaPlayerWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 40px; background: rgba(231, 76, 60, 0.2); border-radius: 8px; margin: 20px;">❌ Video Error<br><br>Failed to load video file.<br><br>Check browser console (F12) for details.</div>';
                    };
                    video.onloadstart = () => {
                        console.log('⏳ Video loading started:', videoUrl);
                    };
                    video.oncanplay = () => {
                        console.log('✅ Video ready to play:', videoUrl);
                    };
                    mediaPlayerWrapper.appendChild(video);
                    console.log('✅ Direct video element added to page');
                }
            }
        } else if (type === 'audio') {
            const audioUrl = element.url || element.mediaUrl;
            console.log('🎵 Loading audio:', audioUrl);
            const audio = document.createElement('audio');
            audio.src = audioUrl;
            audio.controls = true;
            audio.autoplay = true;
            audio.style.width = '100%';
            audio.onerror = (e) => {
                console.error('❌ Audio failed to load:', audioUrl, e);
                const errorMsg = '❌ Audio Error\n\nFailed to load audio file.\n\nURL: ' + audioUrl;
                mediaPlayerWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 40px; background: rgba(231, 76, 60, 0.2); border-radius: 8px; margin: 20px;">' + errorMsg.replace(/\n/g, '<br>') + '</div>';
                // alert(errorMsg);
            };
            audio.oncanplay = () => {
                console.log('✅ Audio ready to play:', audioUrl);
            };
            mediaPlayerWrapper.appendChild(audio);
            console.log('✅ Audio element added to page');
        }
        
        mediaOverlay.classList.add('active');
        console.log('✅ Media overlay opened');
        console.log('========================================\n');
    } catch (error) {
        console.error('❌ CRITICAL ERROR playing media:', error);
        console.error('Stack trace:', error.stack);
        // alert('❌ Critical Error\n\nFailed to play media.\n\nError: ' + error.message + '\n\nCheck browser console for details.');
    }
}


/**
 * Show GIF/animated image in overlay
 */
function showGif(element) {
    try {
        console.log('\n🖼️ ========== SHOWING GIF/IMAGE ==========');
        console.log('Element:', element);
        
        // Set clean title
        const cleanTitle = element.text || element.title || element.name || 'Image';
        mediaTitle.textContent = cleanTitle;
        mediaPlayerWrapper.innerHTML = '';
        
        const imageUrl = element.url || element.imageUrl || element.src;
        
        if (!imageUrl) {
            console.error('❌ No image URL found');
            // alert('❌ Image Error\n\nNo image URL found.');
            return;
        }
        
        console.log('📍 Image URL:', imageUrl);
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '90vw';
        img.style.maxHeight = '80vh';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        img.onerror = () => {
            console.error('❌ Image failed to load:', imageUrl);
            // alert('❌ Image Error\n\nFailed to load image.\n\nURL: ' + imageUrl);
        };
        
        img.onload = () => {
            console.log('✅ Image loaded successfully');
        };
        
        mediaPlayerWrapper.appendChild(img);
        mediaOverlay.classList.add('active');
        
        console.log('✅ GIF/Image overlay opened');
        console.log('========================================\n');
    } catch (error) {
        console.error('❌ Error showing GIF/image:', error);
        // alert('❌ Error\n\nFailed to display image.\n\nError: ' + error.message);
    }
}

/**
 * Close media overlay
 */
function closeMedia() {
    // Stop and release all media
    mediaPlayerWrapper.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.currentTime = 0;
        media.src = '';
        media.load();
    });
    
    // Clear iframes
    mediaPlayerWrapper.querySelectorAll('iframe').forEach(iframe => {
        iframe.src = 'about:blank';
        iframe.remove();
    });
    
    // Remove Cloudflare Stream elements
    mediaPlayerWrapper.querySelectorAll('stream').forEach(stream => {
        stream.remove();
    });
    
    // Clear all content immediately
    mediaPlayerWrapper.innerHTML = '';
    mediaTitle.textContent = '';
    mediaOverlay.classList.remove('active');
    
    // Force garbage collection and cache clearing
    if (window.gc) {
        window.gc();
    }
    
    console.log('✅ Media overlay closed and cache cleared');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation buttons
    $('#first-page').on('click', async () => {
        console.log('⏮ First page clicked - reloading JSON');
        currentPage = 1;
        await reloadPresentation();
    });
    
    $('#last-page').on('click', () => {
        console.log('⏭ Last page clicked');
        $('#presentation').turn('page', totalPages);
    });
    
    // Zoom controls - only 48% and 53% allowed, reload JSON at new size starting page 1
    $('#zoom-in').on('click', async () => {
        console.log('🔍 Zoom in clicked - reloading JSON at 53%');
        if (scale < 0.53) {
            scale = 0.53; // Jump to 53%
            currentPage = 1; // Start at page 1
            await reloadPresentation();
        }
    });
    
    $('#zoom-out').on('click', async () => {
        console.log('🔍 Zoom out clicked - reloading JSON at 48%');
        if (scale > 0.48) {
            scale = 0.48; // Jump to 48%
            currentPage = 1; // Start at page 1
            await reloadPresentation();
        }
    });
    
    // Back button
    $('#back-btn').on('click', goBack);
    
    // Download button
    $('#download-btn').on('click', downloadPresentation);
    
    // Refresh button - reload at current scale and page
    $('#refresh-btn').on('click', async () => {
        console.log('🔄 Refresh clicked - reloading JSON at current scale/page');
        // currentPage is already set, just reload
        await reloadPresentation();
    });
    
    // Navigation arrows
    $('#nav-arrow-left').on('click', () => {
        $('#presentation').turn('previous');
    });
    
    $('#nav-arrow-right').on('click', () => {
        $('#presentation').turn('next');
    });
    
    // Close media
    closeMediaBtn.addEventListener('click', closeMedia);
    mediaOverlay.addEventListener('click', (e) => {
        if (e.target === mediaOverlay) {
            closeMedia();
        }
    });
    
    // Keyboard shortcuts
    $(document).on('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMedia();
        } else if (!mediaOverlay.classList.contains('active')) {
            // Only allow navigation when media is not playing
            if (e.key === 'ArrowLeft') {
                $('#presentation').turn('previous');
            } else if (e.key === 'ArrowRight') {
                $('#presentation').turn('next');
            } else if (e.key === 'Home') {
                $('#presentation').turn('page', 1);
            } else if (e.key === 'End') {
                $('#presentation').turn('page', totalPages);
            }
        }
    });
}

/**
 * Reload presentation after zoom change
 */
async function reloadPresentation() {
    loading.classList.remove('hidden');
    console.log('🔄 Reloading presentation at', Math.round(scale * 100) + '% zoom, page', currentPage);
    
    // Update zoom display
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    try {
        // Destroy existing presentation properly
        if (presentationInitialized) {
            try {
                const $presentation = $('#presentation');
                // Remove turn.js instance
                if ($presentation.data('turn')) {
                    $presentation.turn('destroy');
                }
            } catch (e) {
                console.warn('⚠️ Error destroying turn.js:', e);
            }
            presentationInitialized = false;
        }
        
        // Clear presentation container completely
        $('#presentation').empty();
        
        // Re-render pages at new scale
        await renderPagesAtScale();
        
        // Reinitialize presentation
        initPresentation();
        
        // Go to the desired page after reload
        setTimeout(() => {
            $('#presentation').turn('page', currentPage);
            updatePageInfo();
        }, 150);
        
        console.log('✅ Presentation reloaded at', Math.round(scale * 100) + '%, page', currentPage);
    } catch (error) {
        console.error('❌ Error reloading presentation:', error);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Update page info display
 */
function updatePageInfo() {
    $('#current-page').text(currentPage);
    
    // Update button states
    $('#first-page, #prev-page').prop('disabled', currentPage === 1);
    $('#next-page, #last-page').prop('disabled', currentPage === totalPages);
    
    // Update navigation arrows visibility
    const leftArrow = document.getElementById('nav-arrow-left');
    const rightArrow = document.getElementById('nav-arrow-right');
    
    if (leftArrow) {
        if (currentPage === 1) {
            leftArrow.classList.add('hidden');
        } else {
            leftArrow.classList.remove('hidden');
        }
    }
    
    if (rightArrow) {
        if (currentPage === totalPages) {
            rightArrow.classList.add('hidden');
        } else {
            rightArrow.classList.remove('hidden');
        }
    }
}

/**
 * Download presentation as PDF
 */
async function downloadPresentation() {
    try {
        console.log('📥 Download button clicked');
        
        if (!manifest || !manifest.pages || manifest.pages.length === 0) {
            // alert('⚠️ No presentation data available to download');
            return;
        }
        
        // Show loading indicator
        loading.classList.remove('hidden');
        
        // Create a new jsPDF instance
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: [currentPageWidth, currentPageHeight]
        });
        
        console.log('📄 Creating PDF with', manifest.pages.length, 'pages');
        
        // Add each page to the PDF
        for (let i = 0; i < manifest.pages.length; i++) {
            const page = manifest.pages[i];
            
            if (i > 0) {
                pdf.addPage();
            }
            
            // Get background image
            if (page.background || page.backgroundData) {
                const imgData = page.backgroundData || page.background;
                try {
                    pdf.addImage(imgData, 'PNG', 0, 0, currentPageWidth, currentPageHeight);
                } catch (error) {
                    console.warn('⚠️ Could not add image for page', i + 1, error);
                }
            }
            
            console.log('✅ Added page', i + 1, 'to PDF');
        }
        
        // Generate filename
        const filename = (manifest.title || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        
        // Save the PDF
        pdf.save(filename);
        
        loading.classList.add('hidden');
        console.log('✅ PDF download complete:', filename);
        
    } catch (error) {
        console.error('❌ Error downloading presentation:', error);
        loading.classList.add('hidden');
        // alert('❌ Download Error\n\nFailed to download presentation.\n\nError: ' + error.message);
    }
}

/**
 * Go back to library (returns to where user came from)
 */
function goBack() {
    if (document.referrer) {
        window.location.href = document.referrer;
    } else {
        window.history.back();
    }
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
                if (isVideoUrl(elementData.url)) {
                    console.log('🎥 Opening video...');
                    playMedia(elementData, 'video');
                } else {
                    console.log('🔗 Opening link...');
                    const popup = window.open(elementData.url, '_blank', 'width=800,height=600');
                    if (!popup) {
                        // alert('⚠️ Popup blocked. Please allow popups for this site.\n\nURL: ' + elementData.url);
                    }
                }
            } else if (elementData.videoUrl || elementData.streamId) {
                playMedia(elementData, 'video');
            }
        } else if (elementType === 'hotspot' || elementType === 'link') {
            if (elementData.url) {
                if (isVideoUrl(elementData.url)) {
                    playMedia(elementData, 'video');
                } else {
                    const popup = window.open(elementData.url, '_blank', 'width=800,height=600');
                    if (!popup) {
                        // alert('⚠️ Popup blocked. Please allow popups for this site.\n\nURL: ' + elementData.url);
                    }
                }
            }
        } else if (elementType === 'video' || elementType === 'cloudflare-stream') {
            console.log('🎬 Opening video element...');
            playMedia(elementData, 'video');
        } else if (elementType === 'gif' || elementType === 'image') {
            console.log('🖼️ Opening GIF/image element...');
            showGif(elementData);
        } else if (elementType === 'audio') {
            console.log('🎵 Opening audio element...');
            playMedia(elementData, 'audio');
        } else if (elementType === '3c-emoji' || elementType === '3c-emoji-decoration') {
            if (elementData.url) {
                let emojiUrl = elementData.url;
                if (!emojiUrl.startsWith('http://') && !emojiUrl.startsWith('https://')) {
                    emojiUrl = 'https://' + emojiUrl;
                }
                // Check if it's a video URL
                if (isVideoUrl(emojiUrl)) {
                    console.log('🎥 3c-emoji video detected, using purple overlay...');
                    playMedia({...elementData, url: emojiUrl}, 'video');
                } else {
                    const popup = window.open(emojiUrl, '_blank', 'width=800,height=600');
                    if (!popup) alert('Please allow popups');
                }
            }
        }
        
        console.log('========================================\n');
    });
    
    // Hover effect for interactive elements
    $(document).on('mouseenter', '.interactive-element', function() {
        const elementData = JSON.parse($(this).attr('data-element-data'));
        console.log('🖱️ Mouse ENTERED element - Type:', $(this).attr('data-element-type'), 'URL:', elementData.url || 'NO URL');
        $(this).css('transform', 'scale(1.05)');
    });
    
    $(document).on('mouseleave', '.interactive-element', function() {
        $(this).css('transform', 'scale(1)');
    });
    
    console.log('✅ Event delegation setup complete');
}

// Initialize on load
$(document).ready(() => {
    setupInteractiveElementHandlers();
    init();
});
