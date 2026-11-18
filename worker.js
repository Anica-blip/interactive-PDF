/**
 * Cloudflare Worker for Interactive PDF Builder
 * Handles PDF generation, uploads to R2, and Cloudflare Stream API
 * Domain: builder.3c-public-library.org
 * Updated: 2024-12-13 - Removed Supabase proxy (now using Edge Functions directly)
 * 
 * Environment Variables Required:
 * - R2_BUCKET: R2 bucket binding for file storage
 * - R2_PUBLIC_URL: Public URL for accessing R2 files (e.g., https://files.3c-public-library.org)
 * - CLOUDFLARE_STREAM_TOKEN: Token for Cloudflare Stream API
 * - CLOUDFLARE_ACCOUNT_ID: Account ID for Cloudflare Stream
 * - SUPABASE_URL: Supabase project URL (for client-side use only - not used by worker)
 * - SUPABASE_ANON_KEY: Supabase anon key (for client-side use only - not used by worker)
 * 
 * Note: All Supabase database operations are now handled by Supabase Edge Functions.
 * This worker ONLY handles R2 bucket operations and Cloudflare Stream.
 *
 * Access rules (v2):
 *   - GET /api/health  -> open to everyone (status check only)
 *   - every other route -> owner only. The builder page signs in with GitHub through
 *     Supabase (project cgxjqsbrditbteqhdyus) and sends the login token; this Worker
 *     asks Supabase's is_owner() function whether that login is the owner's.
 *     No key or email is stored in this Worker.
 *   - Browsers on other websites are not given access (see ALLOWED_ORIGINS).
 *   - Public viewers do not use this Worker: they read files straight from
 *     files.3c-public-library.org.
 */

// Public Supabase details (the anon key is meant to be public, same as config.js).
// Used only to check the owner sign-in.
const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';

// Websites allowed to call the owner-only routes from a browser
const ALLOWED_ORIGINS = [
  'https://builder.3c-public-library.org',
  'https://interactive-pdf.pages.dev',
];

export default {
    async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/pdf/, ''); // strip /pdf prefix — route: api.3c-public-library.org/pdf/*
    const isHealth = path === '/api/health' && request.method === 'GET';
    const origin = request.headers.get('Origin') || '';

    // CORS headers for browser requests.
    // Health check is open to all; every other route only answers the builder's own addresses.
    const corsHeaders = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin'
    };
    if (isHealth) {
      corsHeaders['Access-Control-Allow-Origin'] = '*';
    } else if (ALLOWED_ORIGINS.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint (open)
      if (isHealth) {
        return handleHealthCheck(env, corsHeaders);
      }

      // Everything below is owner only
      const denied = await requireOwner(request, corsHeaders);
      if (denied) return denied;

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
 * Owner check: the caller must send "Authorization: Bearer <login token>" and
 * Supabase's is_owner() function must answer true for that login.
 * Returns null when the caller is the owner, otherwise a ready-made error response.
 */
async function requireOwner(request, corsHeaders) {
  const reply = (body, status) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return reply({ error: 'Sign in required' }, 401);

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_owner`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${match[1]}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch (e) {
    return reply({ error: 'Could not verify sign-in. Try again.' }, 503);
  }
  if (res.status === 401 || res.status === 403) {
    return reply({ error: 'Sign in required' }, 401);
  }
  if (!res.ok) {
    return reply({ error: 'Could not verify sign-in. Try again.' }, 503);
  }
  let isOwner = false;
  try { isOwner = (await res.json()) === true; } catch (e) { isOwner = false; }
  if (!isOwner) return reply({ error: 'This account does not have access' }, 403);
  return null;
}

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
      cloudflareStream: env.CLOUDFLARE_STREAM_TOKEN ? 'configured' : 'not configured',
    },
    config: {
      bucket: env.R2_BUCKET ? 'connected' : 'not connected',
      publicUrl: env.R2_PUBLIC_URL || 'not set',
    },
    note: 'Database operations handled by Supabase Edge Functions (not this worker)'
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
    const filename = formData.get('filename') || 'unnamed.pdf';
    const folder = formData.get('folder') || 'pdfs';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = `${folder}/${filename}`;
    await env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: 'application/pdf',
      },
    });

    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
    const apiViewUrl = `/api/view/${key}`;

    return new Response(
      JSON.stringify({
        success: true,
        key,
        publicUrl,
        browserUrl: publicUrl,
        apiViewUrl,
        size: file.size,
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
    const filename = formData.get('filename');
    const folder = formData.get('folder') || 'media';

    if (!file || !filename) {
      return new Response(JSON.stringify({ error: 'File and filename required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const key = `${folder}/${filename}`;

    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filename.endsWith('.png')) {
        contentType = 'image/png';
      } else if (filename.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (filename.endsWith('.mp4')) {
        contentType = 'video/mp4';
      } else if (filename.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
      }
    }

    await env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: contentType,
      },
    });

    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
    const apiViewUrl = `/api/view/${key}`;

    return new Response(
      JSON.stringify({
        success: true,
        key,
        publicUrl,
        browserUrl: publicUrl,
        apiViewUrl,
        size: file.size,
        contentType,
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
 * Handle delete file from R2
 */
async function handleDelete(request, env, corsHeaders) {
  try {
    const { key } = await request.json();

    if (!key) {
      return new Response(JSON.stringify({ error: 'File key required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.R2_BUCKET.delete(key);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File deleted successfully',
        key,
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
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const listed = await env.R2_BUCKET.list({
      prefix,
      limit,
    });

    const files = listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      url: `${env.R2_PUBLIC_URL}/${obj.key}`,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        files,
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
    const key = url.pathname.replace('/api/info/', '');

    const object = await env.R2_BUCKET.head(key);

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
        url: `${env.R2_PUBLIC_URL}/${object.key}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  } catch (error) {
    console.error('Info error:', error);
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

    if (!file) {
      return new Response(JSON.stringify({ error: 'No video file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`,
        },
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload video to Cloudflare Stream');
    }

    const data = await response.json();
    const videoId = data.result.uid;
    const streamUrl = `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    const thumbnailUrl = `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        streamUrl,
        thumbnailUrl,
        embedUrl: `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/iframe`,
        status: data.result.status,
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
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get video details');
    }

    const data = await response.json();
    const streamUrl = `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    const thumbnailUrl = `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        streamUrl,
        thumbnailUrl,
        embedUrl: `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/iframe`,
        status: data.result.status,
        duration: data.result.duration,
        created: data.result.created,
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
