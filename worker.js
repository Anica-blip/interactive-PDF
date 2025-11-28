/**
 * Cloudflare Worker for Interactive PDF Builder
 * Handles PDF generation, uploads to R2, and API endpoints
 * Domain: builder.3c-public-library.org
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Change to your domain in production
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check endpoint
      if (path === '/api/health' && request.method === 'GET') {
        return handleHealthCheck(env, corsHeaders);
      }

      // Upload PDF to R2
      if (path === '/api/upload-pdf' && request.method === 'POST') {
        return await handlePDFUpload(request, env, corsHeaders);
      }

      // Upload media (images, videos, audio) to R2
      if (path === '/api/upload-media' && request.method === 'POST') {
        return await handleMediaUpload(request, env, corsHeaders);
      }

      // Delete file from R2
      if (path === '/api/delete' && request.method === 'DELETE') {
        return await handleDelete(request, env, corsHeaders);
      }

      // List files in R2
      if (path === '/api/list' && request.method === 'GET') {
        return await handleList(request, env, corsHeaders);
      }

      // Get file info from R2
      if (path.startsWith('/api/info/') && request.method === 'GET') {
        return await handleInfo(request, env, corsHeaders);
      }

      // Save project to Supabase
      if (path === '/api/save-project' && request.method === 'POST') {
        return await handleSaveProject(request, env, corsHeaders);
      }

      // Load project from Supabase
      if (path.startsWith('/api/load-project/') && request.method === 'GET') {
        return await handleLoadProject(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Health check endpoint
 */
function handleHealthCheck(env, corsHeaders) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Interactive PDF Builder API is operational',
    services: {
      worker: 'operational',
      r2: env.R2_BUCKET ? 'configured' : 'not configured',
      supabase: env.SUPABASE_URL ? 'configured' : 'not configured',
      supabaseAuth: env.SUPABASE_SERVICE_KEY ? 'service-key' : 'anon-key',
    },
    config: {
      bucket: env.R2_BUCKET ? 'connected' : 'not connected',
      publicUrl: env.R2_PUBLIC_URL || 'not set',
    },
  };

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Handle PDF upload to R2
 */
async function handlePDFUpload(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId') || 'unknown';
    const title = formData.get('title') || 'untitled';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `interactive-pdfs/${sanitizedTitle}-${timestamp}-${randomStr}.pdf`;

    // Upload to R2
    await env.R2_BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        projectId: projectId,
        title: title,
        type: 'interactive-pdf',
      },
    });

    // Get public URL
    const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: filename,
        size: file.size,
        type: file.type,
        message: 'PDF uploaded successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('PDF upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle media upload (images, videos, audio) to R2
 */
async function handleMediaUpload(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'media';
    const projectId = formData.get('projectId') || 'unknown';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
    ];

    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'File type not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const filename = `interactive-pdfs/${folder}/${timestamp}-${randomStr}.${extension}`;

    // Upload to R2
    await env.R2_BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        projectId: projectId,
        type: folder,
      },
    });

    // Get public URL
    const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: filename,
        size: file.size,
        type: file.type,
        message: 'Media uploaded successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Media upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle file deletion from R2
 */
async function handleDelete(request, env, corsHeaders) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return new Response(JSON.stringify({ error: 'No filename provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.R2_BUCKET.delete(filename);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle list files in R2
 */
async function handleList(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || 'interactive-pdfs/';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const listed = await env.R2_BUCKET.list({
      prefix: prefix,
      limit: limit,
    });

    const files = listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
      url: `${env.R2_PUBLIC_URL}/${obj.key}`,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        files: files,
        truncated: listed.truncated,
        count: files.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('List error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle get file info from R2
 */
async function handleInfo(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const filename = url.pathname.replace('/api/info/', '');

    const object = await env.R2_BUCKET.head(filename);

    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
        url: `${env.R2_PUBLIC_URL}/${object.key}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Info error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle save project to Supabase
 */
async function handleSaveProject(request, env, corsHeaders) {
  try {
    const projectData = await request.json();

    // Use service key to bypass RLS if available, otherwise use anon key
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    // Call Supabase API to save project
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/pdf_projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const savedProject = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        project: savedProject,
        message: 'Project saved successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Save project error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle load project from Supabase
 */
async function handleLoadProject(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const projectId = url.pathname.replace('/api/load-project/', '');

    // Use service key to bypass RLS if available, otherwise use anon key
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    // Call Supabase API to load project
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pdf_projects?id=eq.${projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': authKey,
          'Authorization': `Bearer ${authKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const projects = await response.json();

    if (projects.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        project: projects[0],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Load project error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
