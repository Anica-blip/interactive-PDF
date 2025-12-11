/**
 * COMPLETE WORKFLOW - Canva PDF to Social Media Ready URL
 * This will run as is - complete solution for your use case
 */

import { PDFGenerator } from './pdf-generator.js';
import { PDFStorageManager } from './pdf-storage-manager.js';

async function processCanvaForSocialMedia() {
  console.log('🚀 COMPLETE WORKFLOW: Canva PDF → Interactive PDF → Social Media URL');
  
  try {
    // STEP 1: Initialize storage manager with your Cloudflare R2 config
    const storage = new PDFStorageManager({
      r2: {
        endpoint: process.env.R2_ENDPOINT || 'https://<account-id>.r2.cloudflarestorage.com',
        region: 'auto',
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: '3c-library-files',
        publicUrl: 'https://files.3c-public-library.org'
      }
    });

    // Test connection first
    const connected = await storage.testConnection();
    if (!connected) {
      throw new Error('Cloudflare R2 connection failed - check your credentials');
    }

    // STEP 2: Initialize PDF generator (no local file output needed)
    const generator = new PDFGenerator();

    // STEP 3: Load your Canva PDF
    console.log('📄 Loading Canva template...');
    await generator.initialize({ 
      templatePdf: './private-assets/YOUR_ACTUAL_FILENAME.pdf'  // <- Replace with your real PDF filename
    });

    const templateInfo = generator.getTemplateInfo();
    console.log(`📋 Template loaded: ${templateInfo.filename} (${templateInfo.pages} pages)`);

    // STEP 4: Add interactive elements where you designed frames
    generator.setCurrentPage(1);
    
    // Add media where your Canva frame is positioned
    await generator.addMedia('./private-assets/your-video.mp4', {
      x: 150,        // Position where your Canva frame is
      y: 400,
      width: 300,
      height: 200
    });

    // Add audio button
    await generator.addAudioButton({
      audioUrl: './private-assets/your-audio.mp3',
      text: '🎵 Play Audio',
      x: 50,
      y: 50,
      width: 120,
      height: 30
    });

    // STEP 5: COMPLETE WORKFLOW - Generate and upload to cloud
    console.log('🔄 Generating and uploading to Cloudflare R2...');
    const result = await storage.processAndStore(generator, templateInfo.filename);

    // STEP 6: YOUR SHAREABLE URLS
    console.log('✅ SUCCESS! PDF ready for social media:');
    console.log(`   📱 Social Media URL: ${result.accessUrls.shareUrl}`);
    console.log(`   🌐 Browser URL: ${result.accessUrls.browserUrl}`);
    console.log(`   📎 Direct Link: ${result.accessUrls.directUrl}`);
    console.log(`   📊 File Size: ${(result.uploadResult.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   📁 Cloud Storage: ${result.cloudFilename}`);

    // STEP 7: Original Canva PDF can now be deleted if you want
    console.log('\n💡 Your original Canva PDF can now be safely deleted.');
    console.log('   The interactive PDF is self-contained and permanently accessible.');

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Common issues and solutions
    if (error.message.includes('not found')) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Make sure your Canva PDF file exists in the project directory');
      console.log('2. Check the filename matches exactly (case-sensitive)');
      console.log('3. Ensure the PDF is not corrupted');
    }
    
    if (error.message.includes('Failed to load')) {
      console.log('\n💡 PDF LOADING ISSUES:');
      console.log('1. Try re-downloading the PDF from Canva');
      console.log('2. Ensure PDF is not password-protected');
      console.log('3. Check PDF file size (very large files may have issues)');
    }
  }
}

// Run the workflow
processCanvaForSocialMedia();
