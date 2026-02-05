/**
 * Supabase API Client for Interactive PDF Builder
 * Connects to Supabase Edge Functions
 * Uses credentials from window.ENV_CONFIG (loaded from config.js)
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
    
    console.log('📦 Enriched data structure:', {
        hasPages: !!enrichedData.pages,
        pagesCount: enrichedData.pages?.length,
        hasAssets: !!enrichedData.assets,
        hasSettings: !!enrichedData.settings,
        hasMetadata: !!enrichedData.metadata
    });

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
    
    console.log('🚀 Sending payload to Supabase:', {
        url: DIRECT_API_URL,
        payloadKeys: Object.keys(payload),
        project_json_type: typeof payload.project_json
    });

    const response = await fetch(DIRECT_API_URL, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save draft: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
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
    
    console.log('📦 Update enriched data structure:', {
        hasPages: !!enrichedData.pages,
        pagesCount: enrichedData.pages?.length,
        hasAssets: !!enrichedData.assets,
        hasSettings: !!enrichedData.settings,
        hasMetadata: !!enrichedData.metadata
    });

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

    const response = await fetch(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update project: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
};

/**
 * Publish project with PDF URL - DIRECT to Supabase (no Edge Function)
 */
publishProjectDB = async function(projectId, pdfUrl, projectData) {
    // Enrich project_json with metadata
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

    const response = await fetch(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to publish project: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
};

/**
 * Get project by ID - DIRECT from Supabase (bypasses Edge Function)
 */
getProjectDB = async function(projectId) {
    const response = await fetch(`${DIRECT_API_URL}?id=eq.${projectId}&select=*`, {
        method: 'GET',
        headers: {
            ...getHeaders(),
            'Accept-Encoding': 'gzip, deflate'
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get project: ${error}`);
    }

    // Stream response to avoid Content-Length issues with large projects
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

    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to list projects: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
};

/**
 * Delete project
 */
deleteProjectDB = async function(projectId) {
    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            action: 'delete',
            id: projectId
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete project: ${error}`);
    }

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

console.log('✅ Supabase API loaded');
console.log('📡 Direct API (drafts):', DIRECT_API_URL);
console.log('🚀 Edge Function (publish only):', EDGE_FUNCTION_URL);
console.log('💡 Drafts save directly to Supabase - NO timeout issues!');
