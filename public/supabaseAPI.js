/**
 * Supabase API Client for Interactive PDF Builder
 * Connects to Supabase Edge Functions
 * Uses credentials from window.ENV_CONFIG (loaded from config.js)
 * 
 * FIXES (2025-03-06):
 * - Added 520 error detection with clear messaging
 * - Added retry logic (3 attempts) for network failures
 * - Added null/empty result guard in updateProjectDB
 * - Added payload size logging to help diagnose large document issues
 */

// Wait for config to load
if (!window.ENV_CONFIG?.supabase) {
    console.error('⚠️ Supabase config not found! Make sure config.js loads before supabaseAPI.js');
}

// Get configuration from window.ENV_CONFIG only
const SUPABASE_URL = window.ENV_CONFIG?.supabase?.url || '';
const SUPABASE_ANON_KEY = window.ENV_CONFIG?.supabase?.anonKey || '';

// Edge Function endpoint (ONLY for final published exports)
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pdf_projects`;

// Direct REST API endpoint (for draft saves - NO timeout issues)
const DIRECT_API_URL = `${SUPABASE_URL}/rest/v1/pdf_projects`;

/**
 * Base headers for all Supabase requests
 */
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY
});

/**
 * Retry wrapper - attempts a fetch up to maxRetries times
 * Handles 520 specifically and network errors
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${maxRetries} → ${options.method} ${url}`);

            const response = await fetch(url, options);

            // 520 = Cloudflare dropped the request (network/payload issue on origin)
            if (response.status === 520) {
                const msg = `Supabase returned a 520 error (Attempt ${attempt}/${maxRetries}). ` +
                            `This is usually a temporary Cloudflare/Supabase infrastructure issue. ` +
                            `Check https://status.supabase.com if this persists.`;
                console.warn('⚠️ 520 error:', msg);
                lastError = new Error(msg);

                // Wait before retry: 2s, 4s, 6s
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                    continue;
                }
                throw lastError;
            }

            // Any other non-ok response
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return response;

        } catch (err) {
            // NetworkError (no connection, DNS failure, etc.)
            lastError = err;
            console.error(`❌ Attempt ${attempt} failed:`, err.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            }
        }
    }

    throw lastError;
}

/**
 * Save new project draft - DIRECT to Supabase (bypasses Edge Function)
 * This avoids timeout issues with large documents (31+ pages)
 */
saveProjectDraft = async function(projectData) {
    console.log('💾 saveProjectDraft called with:', {
        pagesCount: projectData.pages?.length,
        assetsCount: projectData.assets?.length,
        settings: projectData.settings
    });

    // Enrich project_json with metadata for easy querying
    const enrichedData = {
        ...projectData,
        metadata: {
            title: projectData.settings.title,
            description: projectData.settings.description || '',
            author: projectData.settings.author,
            pageSize: projectData.settings.pageSize,
            orientation: projectData.settings.orientation,
            totalPages: projectData.pages.length,
            flipbookMode: projectData.settings.flipbookMode,
            presentationMode: projectData.settings.presentationMode,
            embeddedMode: projectData.settings.embeddedMode
        }
    };

    const payload = {
        project_json: enrichedData,
        status: 'draft',
        title: projectData.settings.title,
        description: projectData.settings.description || '',
        author: projectData.settings.author,
        total_pages: projectData.pages.length,
        page_size: projectData.settings.pageSize,
        orientation: projectData.settings.orientation,
        flipbook_mode: projectData.settings.flipbookMode || false,
        presentation_mode: projectData.settings.presentationMode || false,
        embedded_mode: projectData.settings.embeddedMode || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Log payload size so we can diagnose large document issues
    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    console.log(`📦 Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

    const response = await fetchWithRetry(DIRECT_API_URL, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    const record = Array.isArray(result) ? result[0] : result;

    if (!record || !record.id) {
        throw new Error('Save succeeded but no record was returned from Supabase. Please try again.');
    }

    return record;
};

/**
 * Update existing project - DIRECT to Supabase (bypasses Edge Function)
 * This avoids timeout issues with large documents (31+ pages)
 */
updateProjectDB = async function(projectId, projectData) {
    console.log('🔄 updateProjectDB called for project:', projectId, {
        pagesCount: projectData.pages?.length,
        assetsCount: projectData.assets?.length,
        settings: projectData.settings
    });

    // Enrich project_json with metadata for easy querying
    const enrichedData = {
        ...projectData,
        metadata: {
            title: projectData.settings.title,
            description: projectData.settings.description || '',
            author: projectData.settings.author,
            pageSize: projectData.settings.pageSize,
            orientation: projectData.settings.orientation,
            totalPages: projectData.pages.length,
            flipbookMode: projectData.settings.flipbookMode,
            presentationMode: projectData.settings.presentationMode,
            embeddedMode: projectData.settings.embeddedMode
        }
    };

    const payload = {
        project_json: enrichedData,
        status: 'draft',
        title: projectData.settings.title,
        description: projectData.settings.description || '',
        author: projectData.settings.author,
        total_pages: projectData.pages.length,
        page_size: projectData.settings.pageSize,
        orientation: projectData.settings.orientation,
        flipbook_mode: projectData.settings.flipbookMode || false,
        presentation_mode: projectData.settings.presentationMode || false,
        embedded_mode: projectData.settings.embeddedMode || false,
        updated_at: new Date().toISOString()
    };

    // Log payload size so we can diagnose large document issues
    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    console.log(`📦 Update payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

    const response = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    // Guard: empty array means the row was not found (deleted externally or ID mismatch)
    if (!result || (Array.isArray(result) && result.length === 0)) {
        console.warn('⚠️ Update returned empty result — row may not exist. Falling back to INSERT.');
        // Fall back to creating a new record instead of crashing
        return await saveProjectDraft(projectData);
    }

    const record = Array.isArray(result) ? result[0] : result;

    if (!record || !record.id) {
        throw new Error('Update succeeded but no record was returned from Supabase. Please try again.');
    }

    return record;
};

/**
 * Publish project with PDF URL - DIRECT to Supabase (no Edge Function)
 */
publishProjectDB = async function(projectId, pdfUrl, projectData) {
    const enrichedData = {
        ...projectData,
        metadata: {
            title: projectData.settings.title,
            description: projectData.settings.description || '',
            author: projectData.settings.author,
            pageSize: projectData.settings.pageSize,
            orientation: projectData.settings.orientation,
            totalPages: projectData.pages.length,
            flipbookMode: projectData.settings.flipbookMode,
            presentationMode: projectData.settings.presentationMode,
            embeddedMode: projectData.settings.embeddedMode
        }
    };

    const payload = {
        project_json: enrichedData,
        pdf_url: pdfUrl,
        status: 'published',
        updated_at: new Date().toISOString()
    };

    const response = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
};

/**
 * Get project by ID - DIRECT from Supabase (bypasses Edge Function)
 */
getProjectDB = async function(projectId) {
    const response = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}&select=*`, {
        method: 'GET',
        headers: {
            ...getHeaders(),
            'Accept-Encoding': 'gzip, deflate'
        }
    });

    const result = await response.json();
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
};

/**
 * List all projects - DIRECT from Supabase (bypasses Edge Function)
 */
listProjectsDB = async function(options = {}) {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let url = `${DIRECT_API_URL}?select=*&order=updated_at.desc&limit=${limit}&offset=${offset}`;

    if (options.status) {
        url += `&status=eq.${options.status}`;
    }

    const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: getHeaders()
    });

    const result = await response.json();
    return Array.isArray(result) ? result : [];
};

/**
 * Delete project
 */
deleteProjectDB = async function(projectId) {
    const response = await fetchWithRetry(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            action: 'delete',
            id: projectId
        })
    });

    return true;
};

/**
 * Test Supabase connection
 */
testSupabaseConnectionDB = async function() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pdf_projects?select=id&limit=1`, {
            method: 'GET',
            headers: getHeaders()
        });

        return {
            connected: response.ok,
            status: response.status,
            message: response.ok ? 'Connected to Supabase' : 'Connection failed'
        };
    } catch (error) {
        return {
            connected: false,
            status: 0,
            message: error.message
        };
    }
};

console.log('✅ Supabase API loaded (with retry logic + 520 handling)');
console.log('📡 Direct API (drafts):', DIRECT_API_URL);
console.log('🚀 Edge Function (publish only):', EDGE_FUNCTION_URL);
console.log('💡 Drafts save directly to Supabase - NO timeout issues!');
