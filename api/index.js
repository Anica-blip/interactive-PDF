import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
      message: 'Interactive PDF Creator API - Media URL Architecture',
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

    const targetFolder = folder || wasabiConfig.defaultFolder;

    const mediaUrls = [];
    if (mediaFiles && mediaFiles.length > 0) {
      for (let i = 0; i < mediaFiles.length; i++) {
        const mediaId = crypto.randomUUID();
        const fileExt = getFileExtension(mediaFiles[i]);
        const mediaFilename = `${targetFolder}/media/${mediaId}${fileExt}`;
        
        await uploadToWasabi(mediaFiles[i], mediaFilename, getContentType(fileExt));
        const mediaUrl = `${wasabiConfig.endpoint}/${wasabiConfig.bucketName}/${mediaFilename}`;
        mediaUrls.push(mediaUrl);
      }
    }

    const existingPdfBytes = Buffer.isBuffer(originalPdf) ? originalPdf : Buffer.from(originalPdf);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const parsedElements = JSON.parse(elements || '[]');
    
    const form = pdfDoc.getForm();
    
    for (const element of parsedElements) {
      const pages = pdfDoc.getPages();
      const page = pages[(element.page || 1) - 1];
      
      if (!page) continue;

      switch (element.type) {
        case 'audio':
          const audioUrl = element.mediaIndex !== undefined ? mediaUrls[element.mediaIndex] : element.audioUrl;
          if (audioUrl) {
            await addAudioButton(pdfDoc, page, helveticaFont, {
              x: element.x || 100,
              y: element.y || 100,
              width: element.width || 120,
              height: element.height || 30,
              text: element.text || '🔊 Play Audio',
              audioUrl: audioUrl
            });
          }
          break;

        case 'video':
          const videoUrl = element.mediaIndex !== undefined ? mediaUrls[element.mediaIndex] : element.videoUrl;
          if (videoUrl) {
            await addVideoLink(pdfDoc, page, helveticaFont, {
              x: element.x || 100,
              y: element.y || 100,
              width: element.width || 200,
              height: element.height || 30,
              text: element.text || '▶️ Play Video',
              videoUrl: videoUrl
            });
          }
          break;

        case 'textField':
          const textField = form.createTextField(element.name || `field_${Math.random()}`);
          textField.addToPage(page, {
            x: element.x || 100,
            y: element.y || 100,
            width: element.width || 200,
            height: element.height || 25
          });
          if (element.placeholder) textField.setText(element.placeholder);
          break;
      }
    }

    const pdfBuffer = await pdfDoc.save();
    
    const uniqueId = crypto.randomUUID();
    const pdfFilename = `${targetFolder}/${uniqueId}.pdf`;
    
    console.log('Uploading enhanced PDF to Wasabi...');
    await uploadToWasabi(pdfBuffer, pdfFilename, 'application/pdf');

    const metadata = {
      id: uniqueId,
      name: pdfName || 'interactive-pdf',
      filename: pdfFilename,
      created: new Date().toISOString(),
      size: pdfBuffer.length,
      elements: parsedElements.length,
      mediaFiles: mediaUrls,
      folder: targetFolder
    };

    const metadataFilename = `${targetFolder}/${uniqueId}.json`;
    await uploadToWasabi(JSON.stringify(metadata, null, 2), metadataFilename, 'application/json');
    
    pdfStore.set(uniqueId, metadata);

    const browserUrl = `${wasabiConfig.endpoint}/${wasabiConfig.bucketName}/${pdfFilename}`;
    const apiViewUrl = `https://${req.headers.host}/api/view/${uniqueId}`;
    const metadataUrl = `${wasabiConfig.endpoint}/${wasabiConfig.bucketName}/${metadataFilename}`;

    console.log(`PDF generated successfully: ${uniqueId}`);

    res.json({
      success: true,
      id: uniqueId,
      browserUrl: browserUrl,
      apiViewUrl: apiViewUrl,
      metadataUrl: metadataUrl,
      name: metadata.name,
      size: pdfBuffer.length,
      elements: parsedElements.length,
      mediaFiles: mediaUrls.length,
      message: 'PDF generated with media URL references and uploaded successfully'
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

async function addAudioButton(pdfDoc, page, font, options) {
  const { x, y, width, height, text, audioUrl } = options;
  
  page.drawRectangle({
    x: x,
    y: y,
    width: width,
    height: height,
    color: rgb(0.2, 0.7, 0.3),
  });

  page.drawText(text, {
    x: x + 5,
    y: y + height/2 - 6,
    size: 10,
    font: font,
    color: rgb(1, 1, 1),
  });

  const form = pdfDoc.getForm();
  const button = form.createButton(`audio_${Date.now()}`);
  button.addToPage(page, { x, y, width, height });
  
  const jsAction = `app.launchURL('${audioUrl}', true);`;
  button.enableReadOnly();
}

async function addVideoLink(pdfDoc, page, font, options) {
  const { x, y, width, height, text, videoUrl } = options;
  
  page.drawRectangle({
    x: x,
    y: y,
    width: width,
    height: height,
    color: rgb(0.1, 0.1, 0.8),
  });

  page.drawText(text, {
    x: x + 5,
    y: y + height/2 - 6,
    size: 10,
    font: font,
    color: rgb(1, 1, 1),
  });

  page.node.set('Annots', pdfDoc.context.obj([
    pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      A: pdfDoc.context.obj({
        Type: 'Action',
        S: 'URI',
        URI: videoUrl
      })
    })
  ]));
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
      architecture: 'Media URLs embedded, files stored separately'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

async function uploadToWasabi(data, filename, contentType = 'application/octet-stream') {
  const uploadParams = {
    Bucket: wasabiConfig.bucketName,
    Key: filename,
    Body: data,
    ContentType: contentType,
    ContentDisposition: contentType === 'application/pdf' ? 'inline' : undefined,
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
    originalPdf: buffer,
    mediaFiles: [],
    folder: null
  };
}

function getFileExtension(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return '.jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return '.png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return '.gif';
  if (buffer.slice(0, 4).toString() === 'ftyp') return '.mp4';
  if (buffer.slice(0, 3).toString() === 'ID3') return '.mp3';
  return '.bin';
}

function getContentType(extension) {
  const types = {
    '.jpg': 'image/jpeg',
    '.png': 'image/png', 
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.bin': 'application/octet-stream'
  };
  return types[extension] || 'application/octet-stream';
}
