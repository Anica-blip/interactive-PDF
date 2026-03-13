/**
 * Supabase API Client for Interactive PDF Builder
 * Connects to Supabase Edge Functions
 * Uses credentials from window.ENV_CONFIG (loaded from config.js)
 *
 * ARCHITECTURE (2026-03-06):
 * - Project JSON is stored in Cloudflare R2 (drafts/project-id.json) — no size limit
 * - Supabase stores metadata only: title, author, pages, draft_url, etc.
 * - Load: fetches row from Supabase → reads draft_url → fetches JSON from R2
 *
 * FIXES:
 * - Added 520 error detection with clear messaging
 * - Added retry logic (3 attempts) for network failures
 * - Added null/empty result guard in updateProjectDB
 */

if (!window.ENV_CONFIG?.supabase) {
    console.error('⚠️ Supabase config not found! Make sure config.js loads before supabaseAPI.js');
}

const SUPABASE_URL = window.ENV_CONFIG?.supabase?.url || '';
const SUPABASE_ANON_KEY = window.ENV_CONFIG?.supabase?.anonKey || '';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/pdf_projects`;
const DIRECT_API_URL = `${SUPABASE_URL}/rest/v1/pdf_projects`;
const WORKER_API = 'https://api.3c-public-library.org';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY
});

async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${maxRetries} → ${options.method} ${url}`);
            const response = await fetch(url, options);
            if (response.status === 520) {
                const msg = `Supabase returned a 520 error (Attempt ${attempt}/${maxRetries}). Check https://status.supabase.com if this persists.`;
                console.warn('⚠️ 520 error:', msg);
                lastError = new Error(msg);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                    continue;
                }
                throw lastError;
            }
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            return response;
        } catch (err) {
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
 * Upload project JSON to Cloudflare R2 via Worker
 * Stores as drafts/{projectId}.json — no size limit
 */
async function uploadJSONToR2(projectId, jsonData) {
    console.log(`☁️ Uploading JSON to R2: interactive-pdf/2026/drafts/${projectId}.json`);
    const jsonString = JSON.stringify(jsonData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
    console.log(`📦 JSON size: ${sizeMB} MB`);

    const formData = new FormData();
    formData.append('file', blob, `${projectId}.json`);
    formData.append('filename', `${projectId}.json`);
    formData.append('folder', 'interactive-pdf/2026/drafts');

    const response = await fetch(`${WORKER_API}/api/upload-media`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`R2 upload failed: ${err}`);
    }

    const result = await response.json();
    const publicUrl = result.browserUrl || result.publicUrl;
    if (!publicUrl) throw new Error('R2 upload succeeded but no URL returned');

    console.log(`✅ JSON uploaded to R2: ${publicUrl}`);
    return publicUrl;
}

/**
 * Save new project draft
 * Step 1: POST metadata to Supabase → get ID
 * Step 2: Upload JSON to R2 as drafts/{id}.json
 * Step 3: PATCH row with draft_url
 */
saveProjectDraft = async function(projectData) {
    console.log('💾 saveProjectDraft:', { pagesCount: projectData.pages?.length, title: projectData.settings?.title });

    // Step 1: Create metadata row (no JSON blob)
    const metadataPayload = {
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

    console.log('📝 Step 1: Creating Supabase metadata row...');
    const createResponse = await fetchWithRetry(DIRECT_API_URL, {
        method: 'POST',
        headers: { ...getHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify(metadataPayload)
    });

    const createResult = await createResponse.json();
    const record = Array.isArray(createResult) ? createResult[0] : createResult;
    if (!record || !record.id) throw new Error('Supabase row created but no ID returned.');

    const projectId = record.id;
    console.log(`✅ Step 1 done — ID: ${projectId}`);

    // Step 2: Upload JSON to R2
    console.log('☁️ Step 2: Uploading JSON to R2...');
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

    const draftUrl = await uploadJSONToR2(projectId, enrichedData);
    console.log('✅ Step 2 done:', draftUrl);

    // Step 3: PATCH row with draft_url
    console.log('🔗 Step 3: Patching row with draft_url...');
    const patchResponse = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify({ draft_url: draftUrl, updated_at: new Date().toISOString() })
    });

    const patchResult = await patchResponse.json();
    const finalRecord = Array.isArray(patchResult) ? patchResult[0] : patchResult;
    console.log('✅ Step 3 done — project saved to R2 + Supabase');

    return finalRecord || record;
};

/**
 * Update existing project
 * Step 1: Upload JSON to R2 (overwrites drafts/{id}.json)
 * Step 2: PATCH Supabase metadata row
 */
updateProjectDB = async function(projectId, projectData) {
    console.log('🔄 updateProjectDB:', projectId, { pagesCount: projectData.pages?.length });

    // Step 1: Upload updated JSON to R2
    console.log('☁️ Step 1: Uploading updated JSON to R2...');
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

    const draftUrl = await uploadJSONToR2(projectId, enrichedData);
    console.log('✅ Step 1 done:', draftUrl);

    // Step 2: PATCH Supabase metadata
    console.log('📝 Step 2: Patching Supabase metadata...');
    const metadataPayload = {
        draft_url: draftUrl,
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

    const response = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify(metadataPayload)
    });

    const result = await response.json();

    // Guard: empty result = row not found, fall back to new insert
    if (!result || (Array.isArray(result) && result.length === 0)) {
        console.warn('⚠️ Update returned empty — falling back to INSERT.');
        return await saveProjectDraft(projectData);
    }

    const record = Array.isArray(result) ? result[0] : result;
    console.log('✅ Step 2 done — Supabase metadata updated');
    return record;
};

/**
 * Publish project
 */
publishProjectDB = async function(projectId, pdfUrl, projectData) {
    const payload = {
        pdf_url: pdfUrl,
        status: 'published',
        updated_at: new Date().toISOString()
    };

    const response = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
};

/**
 * Get project by ID
 * Fetches metadata from Supabase → fetches full JSON from R2 via draft_url
 */
getProjectDB = async function(projectId) {
    console.log('📂 getProjectDB:', projectId);

    const response = await fetchWithRetry(`${DIRECT_API_URL}?id=eq.${projectId}&select=*`, {
        method: 'GET',
        headers: getHeaders()
    });

    const result = await response.json();
    const record = Array.isArray(result) && result.length > 0 ? result[0] : null;

    if (!record) {
        console.warn('⚠️ No project found for ID:', projectId);
        return null;
    }

    // Load JSON from R2 via draft_url
    if (record.draft_url) {
        console.log('☁️ Loading JSON from R2:', record.draft_url);
        try {
            const jsonResponse = await fetch(record.draft_url + '?t=' + Date.now());
            if (!jsonResponse.ok) throw new Error(`HTTP ${jsonResponse.status}`);
            const projectJson = await jsonResponse.json();
            console.log('✅ JSON loaded from R2:', projectJson.pages?.length, 'pages');
            record.project_json = projectJson;
        } catch (err) {
            console.error('❌ Failed to fetch JSON from R2:', err.message);
            throw new Error(`Could not load project data from R2 storage: ${err.message}`);
        }
    } else {
        throw new Error('Project has no draft_url. Data may be missing.');
    }

    return record;
};

/**
 * List all projects — metadata only
 */
listProjectsDB = async function(options = {}) {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let url = `${DIRECT_API_URL}?select=id,title,description,author,status,total_pages,page_size,orientation,flipbook_mode,presentation_mode,embedded_mode,pdf_url,draft_url,thumbnail_url,created_at,updated_at&order=updated_at.desc&limit=${limit}&offset=${offset}`;

    if (options.status) url += `&status=eq.${options.status}`;

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
    await fetchWithRetry(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'delete', id: projectId })
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
        return { connected: false, status: 0, message: error.message };
    }
};

console.log('✅ Supabase API loaded — JSON in Cloudflare R2, metadata in Supabase');
console.log('📡 Supabase (metadata):', DIRECT_API_URL);
console.log('☁️ R2 (JSON drafts): drafts/{project-id}.json');
