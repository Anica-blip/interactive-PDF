import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';

const wasabiConfig = {
  endpoint: 'https://s3.eu-west-1.wasabisys.com',
  region: 'eu-west-1',
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
  bucketName: process.env.WASABI_PUBLIC_BUCKET || '3c-public-content',
  defaultFolder: process.env.WASABI_DEFAULT_FOLDER || 'interactive-pdfs'
};

const s3Client = new S3Client({
  endpoint: wasabiConfig.endpoint,
  region: wasabiConfig.region,
  credentials: {
    accessKeyId: wasabiConfig.accessKeyId,
    secretAccessKey: wasabiConfig.secretAccessKey
  },
  forcePathStyle: true
});

const pdfStore = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  if (pathname === '/api/' && req.method === 'GET') {
    return res.json({ 
      status: 'active', 
      message: 'Interactive PDF Creator API',
      timestamp: new Date(),
      endpoints: {
        health: '/api/health',
        generatePdf: 'POST /api/generate-pdf',
        viewPdf: 'GET /api/view/{id}'
      }
    });
  }

  res.status(404).json({ error: 'Not found' });
}

async function generatePDF(req, res) {
  try {
    console.log('Processing PDF generation request...');

    const body = await parseMultipartData(req);
    const { pdfName, elements, originalPdf, mediaFiles, folder } = body;

    if (!originalPdf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original PDF is required' 
      });
    }

    // Load the original PDF using pdf-lib directly
    const existingPdfBytes = Buffer.isBuffer(originalPdf) ? originalPdf : Buffer.from(originalPdf);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Parse interactive elements
    const parsedElements = JSON.parse(elements || '[]');
    
    // Add interactive elements to PDF
    for (const element of parsedElements) {
      if (element.type === 'textField') {
        const form = pdfDoc.getForm();
        const textField = form.createTextField(element.name || `field_${Math.random()}`);
        
        // Set field position and size (simplified)
        const pages = pdfDoc.getPages();
        if (pages[element.page - 1]) {
          textField.addToPage(pages[element.page - 1], {
            x: element.x || 100,
            y: element.y || 100,
            width: element.width || 200,
            height: element.height || 25
          });
        }
      }
    }

    // Generate enhanced PDF buffer
    const pdfBuffer = await pdfDoc.save();
    
    // Upload to Wasabi
    const uniqueId = crypto.randomUUID();
    const targetFolder = folder || wasabiConfig.defaultFolder;
    const cloudFilename = `${targetFolder}/${uniqueId}.pdf`;
    
    console.log('Uploading to Wasabi...');
    await uploadToWasabi(pdfBuffer, cloudFilename);

    // Store PDF metadata
    const pdfData = {
      id: uniqueId,
      name: pdfName || 'interactive-pdf',
      filename: cloudFilename,
      created: new Date(),
      size: pdfBuffer.length,
      elements: parsedElements.length
    };
    
    pdfStore.set(uniqueId, pdfData);

    // Generate URLs
    const browserUrl = `${wasabiConfig.endpoint}/${wasabiConfig.bucketName}/${cloudFilename}`;
    const apiViewUrl = `https://${req.headers.host}/api/view/${uniqueId}`;

    console.log(`PDF generated successfully: ${uniqueId}`);

    res.json({
      success: true,
      id: uniqueId,
      browserUrl: browserUrl,
      apiViewUrl: apiViewUrl,
      name: pdfData.name,
      size: pdfBuffer.length,
      elements: parsedElements.length,
      message: 'PDF generated and uploaded successfully'
    });

  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

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
    const pdfBuffer = await fetchFromWasabi(pdfData.filename);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading PDF'
    });
  }
}

async function healthCheck(req, res) {
  try {
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
        endpoint: wasabiConfig.endpoint,
        defaultFolder: wasabiConfig.defaultFolder
      },
      environment: {
        nodeVersion: process.version,
        hasWasabiCredentials: !!(wasabiConfig.accessKeyId && wasabiConfig.secretAccessKey)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      config: {
        bucket: wasabiConfig.bucketName,
        region: wasabiConfig.region,
        endpoint: wasabiConfig.endpoint
      }
    });
  }
}

async function uploadToWasabi(pdfBuffer, filename) {
  const uploadParams = {
    Bucket: wasabiConfig.bucketName,
    Key: filename,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    ContentDisposition: 'inline',
    ACL: 'public-read',
    Metadata: {
      'upload-timestamp': Date.now().toString(),
      'generated-by': 'interactive-pdf-creator'
    }
  };

  const command = new PutObjectCommand(uploadParams);
  await s3Client.send(command);
}

async function fetchFromWasabi(filename) {
  const getParams = {
    Bucket: wasabiConfig.bucketName,
    Key: filename
  };
  
  const command = new GetObjectCommand(getParams);
  const result = await s3Client.send(command);
  
  const chunks = [];
  for await (const chunk of result.Body) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

async function parseMultipartData(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  
  const buffer = Buffer.concat(chunks);
  
  // Simple parsing for now - in production use proper multipart parser
  return {
    pdfName: 'interactive-pdf',
    elements: '[]',
    originalPdf: buffer,
    mediaFiles: [],
    folder: null
  };
}
