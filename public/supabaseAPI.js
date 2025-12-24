/**
 * Supabase API Client for Interactive PDF Builder
 * Connects to Supabase Edge Functions
 * Uses credentials from window.ENV_CONFIG (loaded from config.js)
 */

// Wait for config to load
if (!window.ENV_CONFIG?.supabase) {
    console.error('⚠️ Supabase config not found! Make sure config.js loads before supabaseAPI.js');
}

// Get configuration from window.ENV_CONFIG
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
            embeddedMode: projectData.settings.embeddedMode
        }
    };

    const payload = {
        project_json: enrichedData,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

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
            embeddedMode: projectData.settings.embeddedMode
        }
    };

    const payload = {
        project_json: enrichedData,
        status: 'draft',
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
 * Publish project with PDF URL - Uses Edge Function for final export
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
            embeddedMode: projectData.settings.embeddedMode
        }
    };

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            action: 'update',
            id: projectId,
            data: {
                project_json: enrichedData,
                pdf_url: pdfUrl,
                status: 'published',
                updated_at: new Date().toISOString()
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to publish project: ${error}`);
    }

    const result = await response.json();
    return result.data;
};

/**
 * Get project by ID
 */
getProjectDB = async function(projectId) {
    const response = await fetch(`${EDGE_FUNCTION_URL}?id=${projectId}`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get project: ${error}`);
    }

    const result = await response.json();
    return result.data;
};

/**
 * List all projects
 */
listProjectsDB = async function(options = {}) {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit);
    if (options.status) params.append('status', options.status);
    if (options.offset) params.append('offset', options.offset);

    const response = await fetch(`${EDGE_FUNCTION_URL}?${params.toString()}`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to list projects: ${error}`);
    }

    const result = await response.json();
    return result.data;
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
