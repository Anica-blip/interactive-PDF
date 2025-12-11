/**
 * Cloudflare Worker for Interactive PDF Builder
 * Handles PDF generation, uploads to R2, and API endpoints
 * Domain: api.3c-public-library.org/pdf/*
 * Updated: December 11, 2024 - Fixed route patterns to match SETUP.md
 * Deploy: GitHub Actions with wrangler
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
      if (path === '/health' && request.method === 'GET') {
        return handleHealthCheck(env, corsHeaders);
      }

      // Generate multi-page PDF with interactive elements
      if (path === '/generate-pdf-multipage' && request.method === 'POST') {
        return await handleGeneratePDFMultipage(request, env, corsHeaders);
      }

      // Upload PDF to R2
      if (path === '/upload-pdf' && request.method === 'POST') {
        return await handlePDFUpload(request, env, corsHeaders);
      }

      // Upload media (images, videos, audio) to R2
      if (path === '/upload-media' && request.method === 'POST') {
        return await handleMediaUpload(request, env, corsHeaders);
      }

      // Upload video to Cloudflare Stream
      if (path === '/upload-stream' && request.method === 'POST') {
        return await handleStreamUpload(request, env, corsHeaders);
      }

      // Get Stream video details
      if (path.startsWith('/stream/') && request.method === 'GET') {
        const videoId = path.replace('/stream/', '');
        return await handleGetStreamVideo(videoId, env, corsHeaders);
      }

      // Delete Stream video
      if (path.startsWith('/stream/') && request.method === 'DELETE') {
        const videoId = path.replace('/stream/', '');
        return await handleDeleteStreamVideo(videoId, env, corsHeaders);
      }

      // Delete file from R2
      if (path === '/delete' && request.method === 'DELETE') {
        return await handleDelete(request, env, corsHeaders);
      }

      // List files in R2
      if (path === '/list' && request.method === 'GET') {
        return await handleList(request, env, corsHeaders);
      }

      // Get file info from R2
      if (path.startsWith('/info/') && request.method === 'GET') {
        return await handleInfo(request, env, corsHeaders);
      }

      // Save project to Supabase
      if (path === '/save-project' && request.method === 'POST') {
        return await handleSaveProject(request, env, corsHeaders);
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
 * Generate multi-page PDF with interactive elements
 */
async function handleGeneratePDFMultipage(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { title, author, pages: pageData, pageSize, orientation, settings } = data;

    if (!pageData || pageData.length === 0) {
      return new Response(JSON.stringify({ error: 'No pages provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Import pdf-lib dynamically
    const { PDFDocument, StandardFonts, rgb } = await import('https://cdn.skypack.dev/pdf-lib@^1.17.1');

    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Set document metadata
    pdfDoc.setTitle(title || 'Interactive PDF');
    pdfDoc.setAuthor(author || 'Interactive PDF Creator');
    pdfDoc.setCreator('3C Public Library - Interactive PDF Builder');
    pdfDoc.setProducer('Cloudflare Workers + pdf-lib');
    pdfDoc.setCreationDate(new Date());

    // Page size configurations (in points: 1 inch = 72 points)
    const pageSizes = {
      'A4': { width: 595.28, height: 841.89 },
      'Letter': { width: 612, height: 792 },
      'Legal': { width: 612, height: 1008 },
      'A3': { width: 841.89, height: 1190.55 },
      'Tabloid': { width: 792, height: 1224 }
    };

    const finalPageSize = pageSize || settings?.pageSize || 'A4';
    const finalOrientation = orientation || settings?.orientation || 'portrait';
    const size = pageSizes[finalPageSize] || pageSizes.A4;
    
    const pageWidth = finalOrientation === 'landscape' ? size.height : size.width;
    const pageHeight = finalOrientation === 'landscape' ? size.width : size.height;

    // Process each page
    for (let i = 0; i < pageData.length; i++) {
      const pageInfo = pageData[i];
      
      // Add page to document
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // If page has a background image/PDF, we'd embed it here
      if (pageInfo.background) {
        try {
          // Handle base64 data URLs
          let bgBytes;
          if (pageInfo.background.startsWith('data:')) {
            // Extract base64 data from data URL
            const base64Data = pageInfo.background.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            bgBytes = bytes.buffer;
          } else {
            // Fetch from URL
            const bgResponse = await fetch(pageInfo.background);
            if (bgResponse.ok) {
              bgBytes = await bgResponse.arrayBuffer();
            }
          }

          if (bgBytes) {
            // Determine image type from data URL or URL
            const isPng = pageInfo.background.includes('png');
            const bgImage = isPng
              ? await pdfDoc.embedPng(bgBytes)
              : await pdfDoc.embedJpg(bgBytes);
            
            page.drawImage(bgImage, {
              x: 0,
              y: 0,
              width: pageWidth,
              height: pageHeight,
            });
          }
        } catch (bgError) {
          console.error('Failed to embed background:', bgError);
        }
      }

      // Add interactive elements to this page
      if (pageInfo.elements && pageInfo.elements.length > 0) {
        const form = pdfDoc.getForm();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const element of pageInfo.elements) {
          const { type, x, y, width, height, text, url, name, placeholder } = element;

          try {
            switch (type) {
              case 'text':
                // Draw text on page
                page.drawText(text || '', {
                  x: x || 50,
                  y: y || 50,
                  size: element.fontSize || 12,
                  font: font,
                  color: rgb(0, 0, 0),
                });
                break;

              case 'image':
                // Draw image (if URL provided)
                if (element.imageUrl) {
                  try {
                    const imgResponse = await fetch(element.imageUrl);
                    if (imgResponse.ok) {
                      const imgBytes = await imgResponse.arrayBuffer();
                      const image = element.imageUrl.toLowerCase().endsWith('.png')
                        ? await pdfDoc.embedPng(imgBytes)
                        : await pdfDoc.embedJpg(imgBytes);
                      
                      page.drawImage(image, {
                        x: x || 50,
                        y: y || 50,
                        width: width || 100,
                        height: height || 100,
                      });
                    }
                  } catch (imgError) {
                    console.error('Failed to embed image:', imgError);
                  }
                }
                break;

              case 'textField':
                // Create text field
                const textField = form.createTextField(name || `field_${i}_${Math.random()}`);
                textField.addToPage(page, {
                  x: x || 50,
                  y: y || 50,
                  width: width || 200,
                  height: height || 25,
                  borderWidth: 1,
                  backgroundColor: rgb(1, 1, 1),
                  borderColor: rgb(0.7, 0.7, 0.7),
                });
                if (placeholder) {
                  textField.setText('');
                }
                break;

              case 'button':
                // Draw button as rectangle with text
                page.drawRectangle({
                  x: x || 50,
                  y: y || 50,
                  width: width || 100,
                  height: height || 30,
                  color: rgb(0.4, 0.49, 0.91),
                  borderColor: rgb(0, 0.34, 0.7),
                  borderWidth: 1,
                });
                page.drawText(text || 'Button', {
                  x: (x || 50) + 10,
                  y: (y || 50) + (height || 30) / 2 - 5,
                  size: element.fontSize || 12,
                  font: font,
                  color: rgb(1, 1, 1),
                });
                break;

              case 'link':
                // Create clickable link annotation
                if (url) {
                  page.drawText(text || url, {
                    x: x || 50,
                    y: y || 50,
                    size: element.fontSize || 12,
                    font: font,
                    color: rgb(0, 0, 0.8),
                  });
                  
                  // Add link annotation
                  page.node.set('Annots', pdfDoc.context.obj([
                    pdfDoc.context.obj({
                      Type: 'Annot',
                      Subtype: 'Link',
                      Rect: [x || 50, y || 50, (x || 50) + (width || 100), (y || 50) + (height || 20)],
                      Border: [0, 0, 0],
                      A: {
                        Type: 'Action',
                        S: 'URI',
                        URI: url,
                      },
                    })
                  ]));
                }
                break;

              case 'video':
              case 'audio':
                // Create media annotation (clickable link to media)
                if (element.mediaUrl) {
                  page.drawRectangle({
                    x: x || 50,
                    y: y || 50,
                    width: width || 200,
                    height: height || 150,
                    color: rgb(0.9, 0.9, 0.9),
                    borderColor: rgb(0.5, 0.5, 0.5),
                    borderWidth: 2,
                  });
                  
                  const mediaText = type === 'video' ? '▶ Video' : '♪ Audio';
                  page.drawText(mediaText, {
                    x: (x || 50) + (width || 200) / 2 - 30,
                    y: (y || 50) + (height || 150) / 2,
                    size: 20,
                    font: font,
                    color: rgb(0.3, 0.3, 0.3),
                  });
                }
                break;
            }
          } catch (elementError) {
            console.error(`Failed to add element ${type}:`, elementError);
          }
        }
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const sanitizedTitle = (title || 'interactive-pdf').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `interactive-pdfs/flipbooks/${sanitizedTitle}-${timestamp}-${randomStr}.pdf`;

    // Upload to R2
    await env.R2_BUCKET.put(filename, pdfBytes, {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        originalName: `${title || 'interactive-pdf'}.pdf`,
        uploadedAt: new Date().toISOString(),
        pageCount: pageData.length.toString(),
        type: 'interactive-pdf-multipage',
        generatedBy: 'pdf-builder',
      },
    });

    // Get public URL
    const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        browserUrl: publicUrl,
        filename: filename,
        pageCount: pageData.length,
        size: pdfBytes.length,
        message: `${pageData.length}-page interactive PDF generated successfully`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate multi-page PDF'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
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
    const filename = url.pathname.replace('/info/', '');

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
    const project = Array.isArray(savedProject) ? savedProject[0] : savedProject;

    return new Response(
      JSON.stringify({
        success: true,
        id: project.id,
        project: project,
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
