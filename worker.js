/**
 * Cloudflare Worker for Interactive PDF Builder
 * Handles PDF generation, uploads to R2, and API endpoints
 * Domain: builder.3c-public-library.org
 * Updated: 2024-11-29 - Full interactive PDF functionality
 * Deploy: Force deployment with separated workflow
 */

export default {
    async fetch(request, env) {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Change to your domain in production
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

      // Upload video to Cloudflare Stream
      if (path === '/api/upload-stream' && request.method === 'POST') {
        return await handleStreamUpload(request, env, corsHeaders);
      }

      // Get Stream video details
      if (path.startsWith('/api/stream/') && request.method === 'GET') {
        const videoId = path.replace('/api/stream/', '');
        return await handleGetStreamVideo(videoId, env, corsHeaders);
      }

      // Delete Stream video
      if (path.startsWith('/api/stream/') && request.method === 'DELETE') {
        const videoId = path.replace('/api/stream/', '');
        return await handleDeleteStreamVideo(videoId, env, corsHeaders);
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

      // Save project to Supabase (published)
      if (path === '/save-project' && request.method === 'POST') {
        return await handleSaveProject(request, env, corsHeaders, 'published');
      }

      // Save draft to Supabase
      if (path === '/save-draft' && request.method === 'POST') {
        return await handleSaveProject(request, env, corsHeaders, 'draft');
      }

      // Update project in Supabase
      if (path === '/update-project' && request.method === 'POST') {
        return await handleUpdateProject(request, env, corsHeaders);
      }

      // Load project from Supabase
      if (path.startsWith('/load-project/') && request.method === 'GET') {
        return await handleLoadProject(request, env, corsHeaders);
      }

      // List all projects from Supabase
      if (path === '/list-projects' && request.method === 'GET') {
        return await handleListProjects(request, env, corsHeaders);
      }

      // Export project as JSON for 3C Library
      if (path.startsWith('/export-json/') && request.method === 'GET') {
        return await handleExportJSON(request, env, corsHeaders);
      }

      // Test Supabase connection
      if (path === '/test-connection' && request.method === 'GET') {
        return await handleTestConnection(request, env, corsHeaders);
      }

      // Delete project from Supabase
      if (path.startsWith('/delete-project/') && request.method === 'DELETE') {
        return await handleDeleteProject(request, env, corsHeaders);
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
      cloudflareStream: env.CLOUDFLARE_STREAM_TOKEN ? 'configured' : 'not configured',
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
async function handleSaveProject(request, env, corsHeaders, status = 'published') {
  try {
    const projectData = await request.json();

    // Ensure status is set correctly
    projectData.status = status;

    // If project_json is provided, also store it in metadata for compatibility
    if (projectData.project_json && !projectData.metadata) {
      projectData.metadata = { ...projectData.project_json };
    }

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
    const project = Array.isArray(savedProject) ? savedProject[0] : savedProject;

    return new Response(
      JSON.stringify({
        success: true,
        id: project.id,
        project: project,
        message: `Project ${status === 'draft' ? 'draft saved' : 'published'} successfully`,
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
 * Handle update project in Supabase
 */
async function handleUpdateProject(request, env, corsHeaders) {
  try {
    const projectData = await request.json();
    const projectId = projectData.id;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove id from update data
    const { id, ...updateData } = projectData;

    // Use service key to bypass RLS if available, otherwise use anon key
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    // Call Supabase API to update project
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pdf_projects?id=eq.${projectId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': authKey,
          'Authorization': `Bearer ${authKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const updatedProject = await response.json();
    const project = Array.isArray(updatedProject) ? updatedProject[0] : updatedProject;

    return new Response(
      JSON.stringify({
        success: true,
        id: projectId,
        project: project,
        message: 'Project updated successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Update project error:', error);
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
    const projectId = url.pathname.replace('/load-project/', '');

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

/**
 * Handle Cloudflare Stream video upload
 */
async function handleStreamUpload(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const metadata = {
      name: formData.get('name') || file.name,
      projectId: formData.get('projectId'),
      pageNumber: formData.get('pageNumber'),
    };

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload to Cloudflare Stream
    const streamFormData = new FormData();
    streamFormData.append('file', file);
    if (metadata.name) streamFormData.append('meta[name]', metadata.name);
    if (metadata.projectId) streamFormData.append('meta[projectId]', metadata.projectId);
    if (metadata.pageNumber) streamFormData.append('meta[pageNumber]', metadata.pageNumber);

    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`,
        },
        body: streamFormData,
      }
    );

    if (!streamResponse.ok) {
      const error = await streamResponse.json();
      throw new Error(`Stream upload failed: ${error.errors?.[0]?.message || 'Unknown error'}`);
    }

    const streamData = await streamResponse.json();
    const video = streamData.result;

    // Generate URLs
    const embedUrl = `<stream src="${video.uid}" controls></stream>`;
    const iframeUrl = `https://customer-${env.CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/iframe`;
    const thumbnailUrl = `https://customer-${env.CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/thumbnails/thumbnail.jpg`;

    return new Response(
      JSON.stringify({
        success: true,
        videoId: video.uid,
        embedCode: embedUrl,
        iframeUrl: iframeUrl,
        thumbnailUrl: thumbnailUrl,
        playbackUrl: video.playback?.hls || null,
        duration: video.duration,
        status: video.status?.state || 'processing',
        metadata: metadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Stream upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get Cloudflare Stream video details
 */
async function handleGetStreamVideo(videoId, env, corsHeaders) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get video details');
    }

    const data = await response.json();
    const video = data.result;

    return new Response(
      JSON.stringify({
        success: true,
        video: {
          id: video.uid,
          status: video.status?.state,
          duration: video.duration,
          thumbnailUrl: `https://customer-${env.CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}/thumbnails/thumbnail.jpg`,
          playbackUrl: video.playback?.hls,
          created: video.created,
          metadata: video.meta,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get stream video error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Delete Cloudflare Stream video
 */
async function handleDeleteStreamVideo(videoId, env, corsHeaders) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete video');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Video deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Delete stream video error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle list all projects from Supabase
 */
async function handleListProjects(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '100';
    const offset = url.searchParams.get('offset') || '0';

    // Use service key to bypass RLS if available, otherwise use anon key
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    // Call Supabase API to list projects (ordered by updated_at desc)
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pdf_projects?select=*&order=updated_at.desc&limit=${limit}&offset=${offset}`,
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

    return new Response(
      JSON.stringify({
        success: true,
        projects: projects,
        count: projects.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('List projects error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle delete project from Supabase
 */
async function handleDeleteProject(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const projectId = url.pathname.replace('/delete-project/', '');

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service key to bypass RLS if available, otherwise use anon key
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    // Call Supabase API to delete project
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pdf_projects?id=eq.${projectId}`,
      {
        method: 'DELETE',
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Delete project error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle export project as JSON for 3C Content Library
 */
async function handleExportJSON(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const projectId = url.pathname.replace('/export-json/', '');

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service key to bypass RLS if available, otherwise use anon key
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    // Call Supabase API to get project
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pdf_projects?id=eq.${projectId}&select=*`,
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
    
    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const project = projects[0];

    // Create export package for 3C Content Library
    const exportData = {
      id: project.id,
      title: project.title,
      description: project.description || '',
      author: project.author || '3C Thread To Success',
      created_at: project.created_at,
      updated_at: project.updated_at,
      type: 'interactive-pdf',
      status: project.status,
      
      // PDF details
      pdf_url: project.pdf_url,
      cloudflare_url: project.pdf_url, // Cloudflare R2 URL
      page_count: project.total_pages || project.page_count || 1,
      page_size: project.page_size || 'A4',
      orientation: project.orientation || 'portrait',
      
      // Interactive features
      flipbook_mode: project.flipbook_mode || false,
      embedded_mode: project.embedded_mode || false,
      
      // Full project data for reconstruction
      project_json: project.project_json || project.metadata || {},
      
      // Thumbnail
      thumbnail_url: project.thumbnail_url || null,
      
      // Export metadata
      export_timestamp: new Date().toISOString(),
      export_version: '1.0',
      compatible_with: '3C Content Library v2.0+',
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${project.title || 'project'}-export.json"`,
      },
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Test Supabase connection
 */
async function handleTestConnection(request, env, corsHeaders) {
  try {
    const authKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

    if (!env.SUPABASE_URL || !authKey) {
      return new Response(
        JSON.stringify({
          success: false,
          connected: false,
          message: 'Supabase credentials not configured',
          details: {
            hasUrl: !!env.SUPABASE_URL,
            hasKey: !!authKey,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test connection by querying pdf_projects table (limit 1)
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pdf_projects?select=id&limit=1`,
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
      return new Response(
        JSON.stringify({
          success: false,
          connected: false,
          message: 'Supabase connection failed',
          error: error,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        connected: true,
        message: 'Supabase connection successful',
        supabase_url: env.SUPABASE_URL,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        connected: false,
        message: 'Connection test failed',
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
