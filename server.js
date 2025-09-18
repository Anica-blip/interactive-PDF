{
  "version": 2,
  "name": "interactive-pdf-creator",
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  }
}

// Wasabi Configuration from environment
const wasabiConfig = {
  endpoint: process.env.VITE_WASABI_ENDPOINT,
  region: process.env.VITE_WASABI_REGION,
  accessKeyId: process.env.VITE_WASABI_ACCESS_KEY,
  secretAccessKey: process.env.VITE_WASABI_SECRET_KEY,
  bucketName: process.env.VITE_WASABI_PUBLIC_BUCKET.split('/')[0], // Extract bucket name
  bucketPath: process.env.VITE_WASABI_PUBLIC_BUCKET.split('/').slice(1).join('/') // Extract path
};

// Initialize Wasabi client
const s3Client = new S3Client({
  endpoint: wasabiConfig.endpoint,
  region: wasabiConfig.region,
  credentials: {
    accessKeyId: wasabiConfig.accessKeyId,
    secretAccessKey: wasabiConfig.secretAccessKey
  },
  forcePathStyle: true
});

// In-memory storage for PDF metadata (use database in production)
const pdfStore = new Map();

/**
 * Main API handler for Vercel
 */
export default async function handler(req, res) {
  // Enable CORS for your dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route handling
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  if (pathname === '/api/generate-pdf' && req.method === 'POST') {
    return await generatePDF(req, res);
  }
  
  if (pathname.startsWith('/api/view/') && req.method === 'GET') {
    const pdfId = pathname.split('/').pop();
    return await servePDF(req, res, pdfId);
  }
  
  if (pathname === '/api/health' && req.method === 'GET') {
    return await healthCheck(req, res);
  }

  // Default response
  res.status(404).json({ error: 'Not found' });
}

/**
 * Generate interactive PDF and upload to Wasabi
 */
async function generatePDF(req, res) {
  try {
    console.log('Processing PDF generation request...');

    // Parse multipart form data (simplified for Vercel)
    const body = await parseMultipartData(req);
    const { pdfName, elements, originalPdf, mediaFiles } = body;

    if (!originalPdf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original PDF is required' 
      });
    }

    // Initialize PDF generator
    const generator = new PDFGenerator({
      output: { directory: '/tmp', filename: 'temp.pdf' }
    });

    // Create temporary PDF file for processing
    const tempPdfPath = `/tmp/original-${Date.now()}.pdf`;
    await writeFile(tempPdfPath, originalPdf);

    // Load Canva template
    await generator.initialize({
      templatePdf: tempPdfPath
    });

    // Add interactive elements
    const parsedElements = JSON.parse(elements || '[]');
    
    for (const element of parsedElements) {
      generator.setCurrentPage(element.page);

      switch (element.type) {
        case 'video':
          if (element.mediaIndex !== undefined && mediaFiles[element.mediaIndex]) {
            const mediaPath = `/tmp/media-${Date.now()}-${element.mediaIndex}`;
            await writeFile(mediaPath, mediaFiles[element.mediaIndex]);
            await generator.addMedia(mediaPath, {
              x: element.x, y: element.y,
              width: element.width, height: element.height
            });
          }
          break;

        case 'audio':
          if (element.mediaIndex !== undefined && mediaFiles[element.mediaIndex]) {
            const mediaPath = `/tmp/media-${Date.now()}-${element.mediaIndex}`;
            await writeFile(mediaPath, mediaFiles[element.mediaIndex]);
            await generator.addAudioButton({
              audioUrl: mediaPath,
              text: element.text,
              x: element.x, y: element.y,
              width: element.width || 120,
              height: element.height || 30
            });
          }
          break;

        case 'textField':
          generator.addTextField({
            name: element.name,
            x: element.x, y: element.y,
            width: element.width || 200,
            height: element.height || 25,
            placeholder: element.placeholder
          });
          break;
      }
    }

    // Generate enhanced PDF
    console.log('Generating interactive PDF...');
    const pdfBuffer = await generator.generateBuffer();

    // Upload to Wasabi with public access
    const uniqueId = crypto.randomUUID();
    const cloudFilename = `${wasabiConfig.bucketPath}/interactive-pdfs/${uniqueId}.pdf`;
    
    console.log('Uploading to Wasabi...');
    await uploadToWasabi(pdfBuffer, cloudFilename);

    // Store PDF metadata
    const pdfData = {
      id: uniqueId,
      name: pdfName,
      filename: cloudFilename,
      created: new Date(),
      size: pdfBuffer.length,
      elements: parsedElements.length
    };
    
    pdfStore.set(uniqueId, pdfData);

    // Generate browser-viewable URL
    const browserUrl = `${wasabiConfig.endpoint}/${wasabiConfig.bucketName}/${cloudFilename}`;
    const apiViewUrl = `https://${req.headers.host}/api/view/${uniqueId}`;

    console.log(`PDF generated successfully: ${uniqueId}`);

    res.json({
      success: true,
      id: uniqueId,
      browserUrl: browserUrl,      // Direct Wasabi URL - opens in browser
      apiViewUrl: apiViewUrl,      // API route URL - alternative access
      name: pdfName,
      size: pdfBuffer.length,
      elements: parsedElements.length,
      message: 'PDF generated and uploaded successfully'
    });

  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Serve PDF from Wasabi (alternative to direct URL)
 */
async function servePDF(req, res, pdfId) {
  try {
    const pdfData = pdfStore.get(pdfId);

    if (!pdfData) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    console.log(`Serving PDF: ${pdfId}`);

    // Fetch PDF from Wasabi
    const pdfBuffer = await fetchFromWasabi(pdfData.filename);
    
    // Serve with proper headers for browser viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // Open in browser
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading PDF'
    });
  }
}

/**
 * Health check endpoint
 */
async function healthCheck(req, res) {
  try {
    // Test Wasabi connection
    const testParams = {
      Bucket: wasabiConfig.bucketName,
      MaxKeys: 1
    };

    await s3Client.send(new ListObjectsCommand(testParams));

    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        wasabi: 'connected',
        pdfs: pdfStore.size
      },
      config: {
        bucket: wasabiConfig.bucketName,
        region: wasabiConfig.region,
        endpoint: wasabiConfig.endpoint
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

/**
 * Upload PDF to Wasabi with public read access
 */
async function uploadToWasabi(pdfBuffer, filename) {
  const uploadParams = {
    Bucket: wasabiConfig.bucketName,
    Key: filename,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    ContentDisposition: 'inline', // Force browser viewing
    ACL: 'public-read', // Make publicly accessible
    Metadata: {
      'upload-timestamp': Date.now().toString(),
      'generated-by': 'interactive-pdf-creator'
    }
  };

  const command = new PutObjectCommand(uploadParams);
  await s3Client.send(command);
}

/**
 * Fetch PDF from Wasabi
 */
async function fetchFromWasabi(filename) {
  const getParams = {
    Bucket: wasabiConfig.bucketName,
    Key: filename
  };
  
  const command = new GetObjectCommand(getParams);
  const result = await s3Client.send(command);
  
  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of result.Body) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Parse multipart form data (simplified for Vercel)
 */
async function parseMultipartData(req) {
  // This is a simplified parser - in production use a proper multipart library
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  
  const buffer = Buffer.concat(chunks);
  // Parse the multipart data (simplified)
  // In production, use formidable or similar library
  
  return {
    pdfName: 'interactive-pdf',
    elements: '[]',
    originalPdf: buffer.slice(0, 1000), // Simplified - extract actual PDF data
    mediaFiles: []
  };
}

/**
 * Write file helper for Vercel /tmp directory
 */
async function writeFile(path, data) {
  const fs = await import('fs/promises');
  await fs.writeFile(path, data);
}
