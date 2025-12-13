/**
 * Supabase API Client for Interactive PDF Builder
 * Connects to Supabase Edge Functions
 */

// Supabase Configuration
const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';

// Edge Function endpoint
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pdf_projects`;

/**
 * Base headers for all Supabase requests
 */
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY
});

/**
 * Save new project draft
 */
saveProjectDraft = async function(projectData) {
    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            action: 'create',
            data: {
                metadata: projectData,
                status: 'draft'
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save draft: ${error}`);
    }

    const result = await response.json();
    return result.data;
};

/**
 * Update existing project
 */
updateProjectDB = async function(projectId, projectData) {
    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            action: 'update',
            id: projectId,
            data: {
                metadata: projectData,
                status: 'draft'
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update project: ${error}`);
    }

    const result = await response.json();
    return result.data;
};

/**
 * Publish project with PDF URL
 */
publishProjectDB = async function(projectId, pdfUrl, projectData) {
    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            action: 'update',
            id: projectId,
            data: {
                metadata: projectData,
                pdf_url: pdfUrl,
                status: 'published'
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

console.log('✅ Supabase API loaded - Edge Function:', EDGE_FUNCTION_URL);
