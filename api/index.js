import { PDFGenerator } from '../pdf-generator.js';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const wasabiConfig = {
  endpoint: 'https://s3.eu-west-1.wasabisys.com',
  region: 'eu-west-1',
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
  bucketName: process.env.WASABI_PUBLIC_BUCKET || '3c-public-content',
  defaultFolder: 'coffee-break-chat/interactive-pdfs'
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
    const { pdfName, elements, originalPdf, mediaFiles } = body;

    if (!originalPdf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original PDF is required' 
      });
    }

    const generator = new PDFGenerator({
      output: { directory: '/tmp', filename: 'temp.pdf' }
    });

    const tempPdfPath = `/tmp/original-${Date.now()}.pdf`;
    await writeFile(tempPdfPath, originalPdf);

    await generator.initialize({
      templatePdf: tempPdfPath
    });

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

    console.log('Generating interactive PDF...');
    const pdfBuffer = await generator.generateBuffer();

    const uniqueId = crypto.randomUUID();
    const cloudFilename = `${wasabiConfig.defaultFolder}/${uniqueId}.pdf`;
    
    console.log('Uploading to Wasabi...');
    await uploadToWasabi(pdfBuffer, cloudFilename);

    const pdfData = {
      id: uniqueId,
      name: pdfName,
      filename: cloudFilename,
      created: new Date(),
      size: pdfBuffer.length,
      elements: parsedElements.length
    };
    
    pdfStore.set(uniqueId, pdfData);

    const browserUrl = `${wasabiConfig.endpoint}/${wasabiConfig.bucketName}/${cloudFilename}`;
    const apiViewUrl = `https://${req.headers.host}/api/view/${uniqueId}`;

    console.log(`PDF generated successfully: ${uniqueId}`);

    res.json({
      success: true,
      id: uniqueId,
      browserUrl: browserUrl,
      apiViewUrl: apiViewUrl,
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

    res.send(pdfBuffer);

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
  
  return {
    pdfName: 'interactive-pdf',
    elements: '[]',
    originalPdf: buffer.slice(0, 1000),
    mediaFiles: []
  };
}

async function writeFile(path, data) {
  const fs = await import('fs/promises');
  await fs.writeFile(path, data);
}
