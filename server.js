/**
 * Backend API for Interactive PDF Web Application
 * Handles PDF processing, Wasabi storage, and serves final PDFs
 * This will run as is - complete backend for your web app
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFGenerator } from './pdf-generator.js';
import { PDFStorageManager } from './pdf-storage-manager.js';
import fs from 'fs-extra';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve your HTML file from public/

// Store for PDF data (in production, use database)
const pdfStore = new Map();

// Initialize storage manager
const storage = new PDFStorageManager({
  wasabi: {
    accessKeyId: process.env.WASABI_ACCESS_KEY,
    secretAccessKey: process.env.WASABI_SECRET_KEY,
    bucketName: process.env.WASABI_BUCKET_NAME
  }
});

/**
 * Serve the main web application
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * API: Generate interactive PDF and save to Wasabi
 */
app.post('/api/generate-pdf', upload.fields([
  { name: 'originalPdf', maxCount: 1 },
  { name: 'file_0' }, { name: 'file_1' }, { name: 'file_2' }, 
  { name: 'file_3' }, { name: 'file_4' }, { name: 'file_5' }
]), async (req, res) => {
  try {
    console.log('🔄 Processing interactive PDF generation request...');
    
    const { pdfName, elements } = req.body;
    const parsedElements = JSON.parse(elements || '[]');
    
    if (!req.files?.originalPdf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original PDF is required' 
      });
    }

    // Create temporary directory for processing
    const tempDir = path.join(__dirname, 'temp', Date.now().toString());
    await fs.ensureDir(tempDir);

    try {
      // Save original PDF temporarily
      const originalPdfPath = path.join(tempDir, 'original.pdf');
      await fs.writeFile(originalPdfPath, req.files.originalPdf[0].buffer);

      // Save uploaded media files temporarily
      const mediaFiles = {};
      for (const [key, files] of Object.entries(req.files)) {
        if (key.startsWith('file_')) {
          const index = key.split('_')[1];
          const mediaPath = path.join(tempDir, `media_${index}_${files[0].originalname}`);
          await fs.writeFile(mediaPath, files[0].buffer);
          mediaFiles[index] = mediaPath;
        }
      }

      // Initialize PDF generator with template
      const generator = new PDFGenerator({
        output: {
          directory: tempDir,
          filename: 'temp-output.pdf'
        }
      });

      await generator.initialize({
        templatePdf: originalPdfPath
      });

      // Add interactive elements
      for (const element of parsedElements) {
        const elementIndex = parsedElements.indexOf(element);
        
        // Set to correct page
        generator.setCurrentPage(element.page);

        switch (element.type) {
          case 'video':
            if (mediaFiles[elementIndex]) {
              await generator.addMedia(mediaFiles[elementIndex], {
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height
              });
            }
            break;

          case 'audio':
            if (mediaFiles[elementIndex]) {
              await generator.addAudioButton({
                audioUrl: mediaFiles[elementIndex],
                text: element.text,
                x: element.x,
                y: element.y,
                width: element.width || 120,
                height: element.height || 30
              });
            }
            break;

          case 'textField':
            generator.addTextField({
              name: element.name,
              x: element.x,
              y: element.y,
              width: element.width || 200,
              height: element.height || 25,
              placeholder: element.placeholder
            });
            break;
        }
      }

      // Generate PDF buffer
      console.log('📄 Generating interactive PDF...');
      const pdfBuffer = await generator.generateBuffer();

      // Upload to Wasabi and get unique ID
      console.log('☁️ Uploading to Wasabi...');
      const uniqueId = crypto.randomUUID();
      const cloudFilename = `interactive-pdfs/${uniqueId}.pdf`;
      
      await storage.uploadToWasabi(pdfBuffer, cloudFilename);

      // Store PDF metadata for serving
      const pdfData = {
        id: uniqueId,
        name: pdfName,
        filename: cloudFilename,
        created: new Date(),
        size: pdfBuffer.length,
        elements: parsedElements.length
      };
      
      pdfStore.set(uniqueId, pdfData);

      // Your web app URL (not Wasabi URL)
      const viewUrl = `${req.protocol}://${req.get('host')}/view/${uniqueId}`;

      console.log(`✅ PDF generated successfully: ${uniqueId}`);

      res.json({
        success: true,
        id: uniqueId,
        viewUrl: viewUrl,
        name: pdfName,
        size: pdfBuffer.length,
        elements: parsedElements.length,
        message: 'PDF generated and saved to cloud storage'
      });

    } finally {
      // Cleanup temp directory
      await fs.remove(tempDir);
    }

  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Serve PDF by unique ID (fetches from Wasabi)
 */
app.get('/view/:id', async (req, res) => {
  try {
    const pdfId = req.params.id;
    const pdfData = pdfStore.get(pdfId);

    if (!pdfData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>PDF Not Found</title></head>
          <body style="font-family: Arial; text-align: center; margin-top: 100px;">
            <h1>PDF Not Found</h1>
            <p>The requested PDF could not be found.</p>
          </body>
        </html>
      `);
    }

    console.log(`📖 Serving PDF: ${pdfId} (${pdfData.name})`);

    // Fetch PDF from Wasabi
    const pdfBuffer = await storage.fetchFromWasabi(pdfData.filename);
    
    // Serve PDF with proper headers for browser viewing
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline', // Open in browser, don't download
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error serving PDF:', error);
    res.status(500).send('Error loading PDF');
  }
});

/**
 * API: Get PDF info by ID
 */
app.get('/api/pdf/:id', (req, res) => {
  const pdfId = req.params.id;
  const pdfData = pdfStore.get(pdfId);

  if (!pdfData) {
    return res.status(404).json({
      success: false,
      message: 'PDF not found'
    });
  }

  res.json({
    success: true,
    data: {
      id: pdfData.id,
      name: pdfData.name,
      created: pdfData.created,
      size: pdfData.size,
      elements: pdfData.elements,
      viewUrl: `${req.protocol}://${req.get('host')}/view/${pdfId}`
    }
  });
});

/**
 * API: List all PDFs
 */
app.get('/api/pdfs', (req, res) => {
  const pdfs = Array.from(pdfStore.values()).map(pdf => ({
    id: pdf.id,
    name: pdf.name,
    created: pdf.created,
    size: pdf.size,
    elements: pdf.elements,
    viewUrl: `${req.protocol}://${req.get('host')}/view/${pdf.id}`
  }));

  res.json({
    success: true,
    count: pdfs.length,
    pdfs: pdfs.sort((a, b) => new Date(b.created) - new Date(a.created))
  });
});

/**
 * API: Delete PDF
 */
app.delete('/api/pdf/:id', async (req, res) => {
  try {
    const pdfId = req.params.id;
    const pdfData = pdfStore.get(pdfId);

    if (!pdfData) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    // Delete from Wasabi
    await storage.deletePdf(pdfData.filename);
    
    // Remove from store
    pdfStore.delete(pdfId);

    console.log(`🗑️ PDF deleted: ${pdfId}`);

    res.json({
      success: true,
      message: 'PDF deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const wasabiConnected = await storage.testConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        wasabi: wasabiConnected ? 'connected' : 'disconnected',
        pdfs: pdfStore.size
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Interactive PDF Creator server running on port ${PORT}`);
  console.log(`📱 Web app: http://localhost:${PORT}`);
  console.log(`🔧 API health: http://localhost:${PORT}/api/health`);
  console.log(`📋 List PDFs: http://localhost:${PORT}/api/pdfs`);
});

export default app;
