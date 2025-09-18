/**
 * Test Script - Load your Canva PDF and add interactive elements
 * This will run as is - place your Canva PDF in the same directory
 */

import { PDFGenerator } from './pdf-generator.js';

async function testCanvaTemplate() {
  console.log('🔄 Testing Canva PDF template loading...');
  
  try {
    const generator = new PDFGenerator({
      output: {
        directory: './test-output',
        filename: 'canva-enhanced.pdf'
      }
    });

    // STEP 1: Load your Canva PDF
    console.log('📄 Loading Canva template...');
    await generator.initialize({ 
      templatePdf: './your-canva-design.pdf'  // <- Change this to your Canva PDF filename
    });

    // STEP 2: Check what we loaded
    const templateInfo = generator.getTemplateInfo();
    console.log('Template Info:', templateInfo);

    // STEP 3: Set to first page and add test elements
    generator.setCurrentPage(1);
    
    // Add a test video placeholder
    await generator.addMedia('./test-video.mp4', {
      x: 100,
      y: 200,
      width: 300,
      height: 200
    });

    // Add an audio button
    await generator.addAudioButton({
      audioUrl: './test-audio.mp3',
      text: '🔊 Test Audio',
      x: 50,
      y: 50,
      width: 120,
      height: 30
    });

    // Add a text field for testing
    generator.addTextField({
      name: 'testField',
      x: 100,
      y: 400,
      width: 200,
      height: 25,
      placeholder: 'Test input field'
    });

    // STEP 4: Generate the enhanced PDF
    console.log('🔄 Generating enhanced PDF...');
    const result = await generator.generate();

    console.log('✅ SUCCESS! Enhanced PDF created:');
    console.log(`   File: ${result.outputPath}`);
    console.log(`   Size: ${result.fileSizeMB}MB`);
    console.log(`   Original Template: ${templateInfo.filename}`);
    console.log(`   Pages: ${result.statistics.pages}`);
    console.log(`   Interactive Elements Added: ${result.statistics.elements}`);
    console.log(`   Media Items Added: ${result.statistics.media}`);

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

// Run the test
testCanvaTemplate();
