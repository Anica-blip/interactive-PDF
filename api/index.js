import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { randomUUID } from 'crypto';

// Cloudflare R2 Configuration (S3-compatible)
const r2Config = {
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || '3c-library-files',
  publicUrl: process.env.R2_PUBLIC_URL || 'https://files.3c-public-library.org',
  defaultFolder: 'interactive-pdfs'
};

// Initialize S3 client for R2 (S3-compatible API)
let s3Client = null;
if (r2Config.accessKeyId && r2Config.secretAccessKey && r2Config.endpoint) {
  s3Client = new S3Client({
    endpoint: r2Config.endpoint,
    region: r2Config.region,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey
    },
    forcePathStyle: true
  });
}

const pdfStore = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  if (pathname === '/api/health' && req.method === 'GET') {
    return healthCheck(req, res);
  }
  
  if (pathname === '/api/generate-pdf' && req.method === 'POST') {
    return generatePDF(req, res);
  }
  
  if (pathname === '/api/generate-pdf-multipage' && req.method === 'POST') {
    return generateMultiPagePDF(req, res);
  }
  
  if (pathname.startsWith('/api/view/') && req.method === 'GET') {
    const pdfId = pathname.split('/').pop();
    return servePDF(req, res, pdfId);
  }

  if (pathname === '/api' && req.method === 'GET') {
    return res.status(200).json({ 
      status: 'active', 
      message: 'Interactive PDF Creator API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /api/health',
        generatePdf: 'POST /api/generate-pdf',
        viewPdf: 'GET /api/view/{id}'
      }
    });
  }

  return res.status(404).json({ error: 'Not found' });
}

async function healthCheck(req, res) {
  try {
    let r2Status = 'not configured';
    
    if (s3Client) {
      try {
        const testParams = {
          Bucket: r2Config.bucketName,
          MaxKeys: 1
        };
        await s3Client.send(new ListObjectsCommand(testParams));
        r2Status = 'connected';
      } catch (error) {
        r2Status = 'error: ' + error.message;
      }
    }

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'API is working',
      services: {
        api: 'operational',
        r2: r2Status,
        pdfsInMemory: pdfStore.size
      },
      config: {
        bucket: r2Config.bucketName,
        publicUrl: r2Config.publicUrl,
        hasCredentials: !!(r2Config.accessKeyId && r2Config.secretAccessKey)
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

async function generatePDF(req, res) {
  try {
    // Parse JSON body
    const body = await parseBody(req);
    const { title, author, pageSize, orientation, font, elements } = body;

    if (!elements || elements.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No elements provided' 
      });
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    
    // Set metadata
    pdfDoc.setTitle(title || 'Interactive PDF');
    pdfDoc.setAuthor(author || 'PDF Creator');
    pdfDoc.setCreationDate(new Date());

    // Determine page dimensions
    const pageSizes = {
      'A4': { width: 595, height: 842 },
      'Letter': { width: 612, height: 792 },
      'Legal': { width: 612, height: 1008 }
    };
    
    const size = pageSizes[pageSize] || pageSizes['A4'];
    const dims = orientation === 'landscape' 
      ? { width: size.height, height: size.width }
      : size;

    // Add page
    const page = pdfDoc.addPage([dims.width, dims.height]);
    
    // Embed font
    const fontMap = {
      'Helvetica': StandardFonts.Helvetica,
      'Helvetica-Bold': StandardFonts.HelveticaBold,
      'Times-Roman': StandardFonts.TimesRoman,
      'Courier': StandardFonts.Courier
    };
    
    const pdfFont = await pdfDoc.embedFont(fontMap[font] || StandardFonts.Helvetica);

    // Add elements
    for (const element of elements) {
      try {
        if (element.type === 'text') {
          page.drawText(element.content || '', {
            x: element.x || 50,
            y: element.y || 700,
            size: element.size || 12,
            font: pdfFont,
            color: rgb(0, 0, 0),
            maxWidth: element.maxWidth || 500
          });
        } else if (element.type === 'textField') {
          const form = pdfDoc.getForm();
          const textField = form.createTextField(element.name || `field_${Date.now()}`);
          textField.addToPage(page, {
            x: element.x || 50,
            y: element.y || 500,
            width: element.width || 200,
            height: element.height || 25,
            borderWidth: 1,
            borderColor: rgb(0.7, 0.7, 0.7)
          });
          if (element.placeholder) {
            textField.setText(element.placeholder);
          }
        } else if (element.type === 'button') {
          const form = pdfDoc.getForm();
          const button = form.createButton(element.name || `button_${Date.now()}`);
          button.addToPage(element.text || 'Button', page, {
            x: element.x || 50,
            y: element.y || 500,
            width: element.width || 100,
            height: element.height || 30,
            borderWidth: 1,
            borderColor: rgb(0, 0.5, 1),
            backgroundColor: rgb(0, 0.5, 1),
            font: pdfFont,
            textColor: rgb(1, 1, 1)
          });
        }
      } catch (elementError) {
        console.error(`Error adding element:`, elementError);
        // Continue with other elements
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const uniqueId = randomUUID();
    
    // Try to upload to R2 if configured
    let browserUrl = null;
    if (s3Client) {
      try {
        const cloudFilename = `${r2Config.defaultFolder}/${uniqueId}.pdf`;
        await uploadToR2(pdfBuffer, cloudFilename);
        browserUrl = `${r2Config.publicUrl}/${cloudFilename}`;
      } catch (uploadError) {
        console.error('R2 upload failed:', uploadError);
        // Continue without cloud storage
      }
    }

    // Store PDF in memory
    const pdfData = {
      id: uniqueId,
      name: title || 'interactive-pdf',
      buffer: pdfBuffer,
      created: new Date(),
      size: pdfBuffer.length,
      elements: elements.length
    };
    
    pdfStore.set(uniqueId, pdfData);

    const apiViewUrl = `/api/view/${uniqueId}`;

    return res.status(200).json({
      success: true,
      id: uniqueId,
      browserUrl: browserUrl,
      apiViewUrl: apiViewUrl,
      downloadUrl: apiViewUrl,
      name: pdfData.name,
      size: pdfBuffer.length,
      elements: elements.length,
      message: 'PDF generated successfully'
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
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
        message: 'PDF not found. It may have expired or been removed.'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + pdfData.name + '.pdf"');
    res.setHeader('Content-Length', pdfData.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.status(200).send(pdfData.buffer);

  } catch (error) {
    console.error('PDF serve error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error loading PDF'
    });
  }
}

async function generateMultiPagePDF(req, res) {
  try {
    const body = await parseBody(req);
    const { title, author, pageSize, orientation, pages } = body;

    if (!pages || pages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pages provided' 
      });
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    
    // Set metadata
    pdfDoc.setTitle(title || 'Interactive PDF');
    pdfDoc.setAuthor(author || 'PDF Creator');
    pdfDoc.setCreationDate(new Date());

    // Determine page dimensions
    const pageSizes = {
      'A4': { width: 595, height: 842 },
      'Letter': { width: 612, height: 792 },
      'Legal': { width: 612, height: 1008 }
    };
    
    const size = pageSizes[pageSize] || pageSizes['A4'];
    const dims = orientation === 'landscape' 
      ? { width: size.height, height: size.width }
      : size;

    // Process each page
    for (const pageData of pages) {
      const page = pdfDoc.addPage([dims.width, dims.height]);
      
      // Add background image if provided
      if (pageData.background && pageData.background.startsWith('data:image')) {
        try {
          const base64Data = pageData.background.split(',')[1];
          const imageBytes = Buffer.from(base64Data, 'base64');
          
          let image;
          if (pageData.background.includes('image/png')) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (pageData.background.includes('image/jpeg') || pageData.background.includes('image/jpg')) {
            image = await pdfDoc.embedJpg(imageBytes);
          }
          
          if (image) {
            const scale = Math.min(dims.width / image.width, dims.height / image.height);
            page.drawImage(image, {
              x: 0,
              y: 0,
              width: image.width * scale,
              height: image.height * scale
            });
          }
        } catch (imageError) {
          console.error('Error embedding background image:', imageError);
        }
      }
      
      // Add elements to this page
      if (pageData.elements && pageData.elements.length > 0) {
        const pdfFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const form = pdfDoc.getForm();
        
        for (const element of pageData.elements) {
          try {
            if (element.type === 'button') {
              // Draw visible button
              page.drawRectangle({
                x: element.x || 50,
                y: element.y || 400,
                width: element.width || 150,
                height: element.height || 50,
                color: rgb(0.4, 0.5, 0.9),
                borderColor: rgb(0.3, 0.4, 0.8),
                borderWidth: 2
              });
              
              page.drawText(element.text || 'Click Here', {
                x: element.x + element.width / 2 - (element.text.length * 3),
                y: element.y + element.height / 2 - 5,
                size: 14,
                font: pdfFont,
                color: rgb(1, 1, 1)
              });
              
              // Add link annotation
              page.node.set('Annots', pdfDoc.context.obj([
                pdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [element.x, element.y, element.x + element.width, element.y + element.height],
                  Border: [0, 0, 0],
                  A: {
                    S: 'URI',
                    URI: pdfDoc.context.obj(element.url || '')
                  }
                })
              ]));
            } else if (element.type === 'hotspot') {
              // Invisible clickable area (no visual in PDF)
              page.node.set('Annots', pdfDoc.context.obj([
                pdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [element.x, element.y, element.x + element.width, element.y + element.height],
                  Border: [0, 0, 0],
                  A: {
                    S: 'URI',
                    URI: pdfDoc.context.obj(element.url || '')
                  }
                })
              ]));
            } else if (element.type === 'link') {
              // Create clickable link annotation
              page.drawText(element.text || 'Link', {
                x: element.x || 50,
                y: element.y || 400,
                size: 12,
                font: pdfFont,
                color: rgb(0, 0, 1)
              });
              
              // Add link annotation
              page.node.set('Annots', pdfDoc.context.obj([
                pdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [element.x, element.y, element.x + element.width, element.y + element.height],
                  Border: [0, 0, 1],
                  C: [0, 0, 1],
                  A: {
                    S: 'URI',
                    URI: pdfDoc.context.obj(element.url || '')
                  }
                })
              ]));
            } else if (element.type === 'video' || element.type === 'audio' || element.type === 'gif') {
              
              if (element.embedded && (element.type === 'video' || element.type === 'audio')) {
                // EMBEDDED MODE: RichMedia annotation for Adobe Acrobat
                try {
                  // Draw placeholder/poster
                  page.drawRectangle({
                    x: element.x || 50,
                    y: element.y || 400,
                    width: element.width || 200,
                    height: element.height || 150,
                    color: rgb(0.95, 0.95, 0.95),
                    borderColor: rgb(0.4, 0.5, 0.9),
                    borderWidth: 2
                  });
                  
                  // Draw play icon
                  const centerX = element.x + element.width / 2;
                  const centerY = element.y + element.height / 2;
                  page.drawText('▶', {
                    x: centerX - 10,
                    y: centerY - 10,
                    size: 40,
                    font: pdfFont,
                    color: rgb(0.4, 0.5, 0.9)
                  });
                  
                  page.drawText(element.text || element.type.toUpperCase(), {
                    x: element.x + 10,
                    y: element.y + 10,
                    size: 12,
                    font: pdfFont,
                    color: rgb(0, 0, 0)
                  });
                  
                  page.drawText('Embedded Media (Adobe Acrobat)', {
                    x: element.x + 10,
                    y: element.y + element.height - 20,
                    size: 8,
                    font: pdfFont,
                    color: rgb(0.5, 0.5, 0.5)
                  });
                  
                  // Create RichMedia annotation (works in Adobe Acrobat)
                  const annots = page.node.get('Annots') || pdfDoc.context.obj([]);
                  const annotsArray = Array.isArray(annots) ? annots : [annots];
                  
                  // RichMedia annotation structure
                  const richMediaAnnot = pdfDoc.context.obj({
                    Type: 'Annot',
                    Subtype: 'RichMedia',
                    Rect: [element.x, element.y, element.x + element.width, element.y + element.height],
                    Border: [0, 0, 0],
                    Contents: pdfDoc.context.obj(`${element.type} player`),
                    RichMediaSettings: pdfDoc.context.obj({
                      Type: 'RichMediaSettings',
                      Activation: pdfDoc.context.obj({
                        Type: 'RichMediaActivation',
                        Condition: 'XA' // Explicit activation (click)
                      }),
                      Deactivation: pdfDoc.context.obj({
                        Type: 'RichMediaDeactivation',
                        Condition: 'XD' // Explicit deactivation
                      })
                    }),
                    RichMediaContent: pdfDoc.context.obj({
                      Type: 'RichMediaContent',
                      Assets: pdfDoc.context.obj({
                        Names: [
                          pdfDoc.context.obj(`${element.type}_file`),
                          pdfDoc.context.obj({
                            Type: 'Filespec',
                            F: pdfDoc.context.obj(element.url || ''),
                            UF: pdfDoc.context.obj(element.url || '')
                          })
                        ]
                      })
                    }),
                    // Fallback to link annotation
                    A: {
                      S: 'URI',
                      URI: pdfDoc.context.obj(element.url || '')
                    }
                  });
                  
                  annotsArray.push(richMediaAnnot);
                  page.node.set('Annots', pdfDoc.context.obj(annotsArray));
                  
                } catch (richMediaError) {
                  console.error('RichMedia annotation failed, falling back to link:', richMediaError);
                  // Fallback to simple link
                  addSimpleMediaLink(page, element, pdfFont, pdfDoc);
                }
                
              } else if (element.embedded && element.type === 'gif') {
                // EMBEDDED GIF: Try to embed image directly
                try {
                  if (element.url && element.url.startsWith('data:image')) {
                    const base64Data = element.url.split(',')[1];
                    const imageBytes = Buffer.from(base64Data, 'base64');
                    
                    let image;
                    if (element.url.includes('image/png') || element.url.includes('image/gif')) {
                      image = await pdfDoc.embedPng(imageBytes);
                    } else if (element.url.includes('image/jpeg') || element.url.includes('image/jpg')) {
                      image = await pdfDoc.embedJpg(imageBytes);
                    }
                    
                    if (image) {
                      page.drawImage(image, {
                        x: element.x,
                        y: element.y,
                        width: element.width,
                        height: element.height
                      });
                    }
                  } else {
                    // External GIF URL - show placeholder with link
                    addSimpleMediaLink(page, element, pdfFont, pdfDoc);
                  }
                } catch (gifError) {
                  console.error('GIF embedding failed:', gifError);
                  addSimpleMediaLink(page, element, pdfFont, pdfDoc);
                }
                
              } else {
                // LINK MODE: Simple clickable link (works everywhere)
                addSimpleMediaLink(page, element, pdfFont, pdfDoc);
              }
            }
          } catch (elementError) {
            console.error(`Error adding element:`, elementError);
          }
        }
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const uniqueId = randomUUID();
    
    // Try to upload to R2 if configured
    let browserUrl = null;
    if (s3Client) {
      try {
        const cloudFilename = `${r2Config.defaultFolder}/${uniqueId}.pdf`;
        await uploadToR2(pdfBuffer, cloudFilename);
        browserUrl = `${r2Config.publicUrl}/${cloudFilename}`;
      } catch (uploadError) {
        console.error('R2 upload failed:', uploadError);
        // Continue without cloud storage
      }
    }

    // Store PDF in memory
    const pdfData = {
      id: uniqueId,
      name: title || 'interactive-pdf',
      buffer: pdfBuffer,
      created: new Date(),
      size: pdfBuffer.length,
      pages: pages.length
    };
    
    pdfStore.set(uniqueId, pdfData);

    const apiViewUrl = `/api/view/${uniqueId}`;

    return res.status(200).json({
      success: true,
      id: uniqueId,
      browserUrl: browserUrl,
      apiViewUrl: apiViewUrl,
      downloadUrl: apiViewUrl,
      name: pdfData.name,
      size: pdfBuffer.length,
      pages: pages.length,
      message: `PDF with ${pages.length} pages generated successfully`
    });

  } catch (error) {
    console.error('Multi-page PDF generation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Helper function to add simple media link (fallback mode)
function addSimpleMediaLink(page, element, pdfFont, pdfDoc) {
  page.drawRectangle({
    x: element.x || 50,
    y: element.y || 400,
    width: element.width || 200,
    height: element.height || 150,
    borderColor: rgb(0.4, 0.5, 0.8),
    borderWidth: 2
  });
  
  page.drawText(element.text || element.type.toUpperCase(), {
    x: element.x + 10,
    y: element.y + element.height / 2,
    size: 14,
    font: pdfFont,
    color: rgb(0, 0, 0)
  });
  
  page.drawText('Click to open', {
    x: element.x + 10,
    y: element.y + element.height / 2 - 20,
    size: 10,
    font: pdfFont,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  // Add link annotation
  const annots = page.node.get('Annots') || pdfDoc.context.obj([]);
  const annotsArray = Array.isArray(annots) ? annots : [annots];
  
  annotsArray.push(pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [element.x, element.y, element.x + element.width, element.y + element.height],
    Border: [0, 0, 2],
    C: [0.4, 0.5, 0.8],
    A: {
      S: 'URI',
      URI: pdfDoc.context.obj(element.url || '')
    }
  }));
  
  page.node.set('Annots', pdfDoc.context.obj(annotsArray));
}

async function uploadToR2(pdfBuffer, filename) {
  const uploadParams = {
    Bucket: r2Config.bucketName,
    Key: filename,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    ContentDisposition: 'inline',
    Metadata: {
      'upload-timestamp': Date.now().toString(),
      'generated-by': 'interactive-pdf-creator'
    }
  };

  const command = new PutObjectCommand(uploadParams);
  await s3Client.send(command);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
