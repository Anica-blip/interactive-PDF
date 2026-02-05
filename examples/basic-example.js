/**
 * Basic Usage Examples - Interactive PDF Creator
 * Demonstrates both new PDF creation and Canva template enhancement
 * This will run as is - comprehensive usage examples
 */

import { PDFGenerator, generatePDF } from '../pdf-generator.js';
import fs from 'fs-extra';

// Ensure output directory exists
await fs.ensureDir('./examples/output');

/**
 * EXAMPLE 1: Create New Interactive PDF from Scratch
 */
async function createNewPDF() {
  console.log('\n🚀 EXAMPLE 1: Creating new PDF from scratch...');
  
  try {
    const generator = new PDFGenerator({
      pdf: {
        title: 'Interactive Portfolio',
        author: 'Your Name'
      },
      output: {
        directory: './examples/output',
        filename: 'new-interactive-pdf.pdf'
      }
    });

    await generator
      .initialize()
      .addPage()
      
      // Header
      .addText('My Interactive Portfolio', {
        x: 50, y: 750, size: 24, font: 'Helvetica-Bold'
      })
      
      // Add media with flexible positioning
      .addMedia('./examples/assets/profile-photo.jpg', {
        position: 'top-right',
        size: 'medium',
        caption: 'Profile Photo'
      })
      
      // Interactive form section
      .addText('Contact Information', {
        x: 50, y: 650, size: 16, font: 'Helvetica-Bold'
      })
      
      .addTextField({
        name: 'fullName',
        x: 50, y: 600,
        width: 250, height: 25,
        placeholder: 'Enter your full name'
      })
      
      .addTextField({
        name: 'email',
        x: 50, y: 560,
        width: 250, height: 25,
        placeholder: 'Enter your email'
      })
      
      // Audio button
      .addAudioButton({
        audioUrl: './examples/assets/intro-message.mp3',
        text: '🎵 Play Introduction',
        x: 50, y: 500,
        width: 150, height: 35
      })
      
      // Submit button
      .addButton({
        text: 'Submit Portfolio',
        x: 50, y: 450,
        action: 'this.submitForm()'
      });

    const result = await generator.generate();
    console.log(`✅ New PDF created: ${result.outputPath}`);
    return result;

  } catch (error) {
    console.error(`❌ Example 1 failed: ${error.message}`);
  }
}

/**
 * EXAMPLE 2: Enhance Canva Template with Interactive Elements
 */
async function enhanceCanvaTemplate() {
  console.log('\n🎨 EXAMPLE 2: Enhancing Canva template...');
  
  try {
    const generator = new PDFGenerator({
      output: {
        directory: './examples/output',
        filename: 'canva-enhanced.pdf'
      }
    });

    // Load Canva template
    await generator.initialize({
      templatePdf: './examples/assets/canva-brochure.pdf'  // Your Canva PDF
    });

    const templateInfo = generator.getTemplateInfo();
    console.log(`📄 Loaded template: ${templateInfo.filename} (${templateInfo.pages} pages)`);

    // Work on page 1
    generator.setCurrentPage(1);
    
    // Add video where you designed a frame in Canva
    await generator.addMedia('./examples/assets/product-demo.mp4', {
      x: 150,        // Position where your Canva frame is
      y: 400,
      width: 300,
      height: 200,
      caption: 'Product Demo Video'
    });

    // Add audio button for background music
    await generator.addAudioButton({
      audioUrl: './examples/assets/background-music.mp3',
      text: '🎵 Background Music',
      x: 480,        // Top-right corner
      y: 720,
      width: 100,
      height: 25
    });

    // If multi-page template, work on page 2
    if (templateInfo.pages > 1) {
      generator.setCurrentPage(2);
      
      // Add interactive form on page 2
      generator
        .addTextField({
          name: 'customerName',
          x: 100, y: 300,
          width: 200, height: 25
        })
        .addCheckbox({
          name: 'newsletter',
          x: 100, y: 250,
          label: 'Subscribe to newsletter'
        });
    }

    const result = await generator.generate();
    console.log(`✅ Enhanced template: ${result.outputPath}`);
    console.log(`📊 Added ${result.statistics.elements} interactive elements`);
    console.log(`🎬 Added ${result.statistics.media} media items`);
    return result;

  } catch (error) {
    console.error(`❌ Example 2 failed: ${error.message}`);
    if (error.message.includes('not found')) {
      console.log('💡 Place your Canva PDF at: ./examples/assets/canva-brochure.pdf');
    }
  }
}

/**
 * EXAMPLE 3: Media Flexibility Showcase
 */
async function mediaFlexibilityExample() {
  console.log('\n🎬 EXAMPLE 3: Media flexibility showcase...');
  
  try {
    const generator = new PDFGenerator({
      output: {
        directory: './examples/output',
        filename: 'media-showcase.pdf'
      }
    });

    await generator
      .initialize()
      .addPage()
      
      // Title
      .addText('Media Flexibility Showcase', {
        x: 50, y: 750, size: 20, font: 'Helvetica-Bold'
      })
      
      // Different positioning methods
      .addText('1. Exact Positioning:', { x: 50, y: 700, size: 14, font: 'Helvetica-Bold' })
      .addMedia('./examples/assets/image1.jpg', {
        x: 50, y: 600,          // Exact coordinates
        width: 150, height: 100
      })
      
      .addText('2. Position Shortcuts:', { x: 250, y: 700, size: 14, font: 'Helvetica-Bold' })
      .addMedia('./examples/assets/image2.jpg', {
        position: 'center',      // Automatic centering
        size: 'small'           // Predefined size
      })
      
      .addText('3. Flexible Sizing:', { x: 50, y: 450, size: 14, font: 'Helvetica-Bold' })
      .addMedia('./examples/assets/wide-image.jpg', {
        fit: 'width',           // Fit to page width
        maxHeight: 200,         // But limit height
        y: 350
      })
      
      .addText('4. Video with Controls:', { x: 50, y: 300, size: 14, font: 'Helvetica-Bold' })
      .addMedia('./examples/assets/tutorial.mp4', {
        x: 50, y: 200,
        size: 0.8,              // Scale to 80%
        caption: 'Tutorial Video'
      })
      
      .addText('5. Audio Player:', { x: 350, y: 300, size: 14, font: 'Helvetica-Bold' })
      .addMedia('./examples/assets/music.mp3', {
        position: 'bottom-right',
        width: 200, height: 50
      });

    const result = await generator.generate();
    console.log(`✅ Media showcase: ${result.outputPath}`);
    return result;

  } catch (error) {
    console.error(`❌ Example 3 failed: ${error.message}`);
  }
}

/**
 * EXAMPLE 4: Quick Generation Function
 */
async function quickGenerationExample() {
  console.log('\n⚡ EXAMPLE 4: Quick PDF generation...');
  
  try {
    // Quick generation with content array
    const result = await generatePDF(
      {
        pdf: { title: 'Quick Interactive PDF' },
        output: { directory: './examples/output', filename: 'quick-pdf.pdf' }
      },
      [
        { type: 'page' },
        { 
          type: 'text', 
          content: 'Quick PDF Example', 
          x: 100, y: 700, size: 20, font: 'Helvetica-Bold' 
        },
        {
          type: 'media',
          path: './examples/assets/logo.png',
          position: 'top-right',
          size: 'small'
        },
        {
          type: 'textField',
          name: 'quickInput',
          x: 100, y: 600,
          width: 200, height: 25,
          placeholder: 'Quick input field'
        },
        {
          type: 'audioButton',
          audioUrl: './examples/assets/notification.mp3',
          text: '🔔 Play Sound',
          x: 100, y: 550
        },
        {
          type: 'button',
          text: 'Quick Submit',
          x: 100, y: 500,
          action: 'app.alert("Quick submission!");'
        }
      ]
    );

    console.log(`✅ Quick PDF: ${result.outputPath} (${result.fileSizeMB}MB)`);
    return result;

  } catch (error) {
    console.error(`❌ Example 4 failed: ${error.message}`);
  }
}

/**
 * EXAMPLE 5: Template with Multiple Pages
 */
async function multiPageTemplateExample() {
  console.log('\n📚 EXAMPLE 5: Multi-page template enhancement...');
  
  try {
    const generator = new PDFGenerator({
      output: {
        directory: './examples/output',
        filename: 'multi-page-enhanced.pdf'
      }
    });

    // Load multi-page Canva template
    await generator.initialize({
      templatePdf: './examples/assets/multi-page-template.pdf'
    });

    const info = generator.getTemplateInfo();
    console.log(`📖 Working with ${info.pages} pages`);

    // Enhance each page differently
    for (let page = 1; page <= info.pages; page++) {
      generator.setCurrentPage(page);
      
      switch (page) {
        case 1:
          // Cover page - add intro video
          await generator.addMedia('./examples/assets/intro-video.mp4', {
            position: 'center',
            size: 'large',
            caption: `Welcome Video - Page ${page}`
          });
          break;
          
        case 2:
          // Content page - add audio narration
          await generator.addAudioButton({
            audioUrl: `./examples/assets/narration-page${page}.mp3`,
            text: `🎙️ Page ${page} Narration`,
            position: 'top-right'
          });
          break;
          
        case 3:
          // Form page - add interactive elements
          generator
            .addTextField({
              name: `input_page${page}`,
              x: 100, y: 400,
              width: 250, height: 25,
              placeholder: `Input for page ${page}`
            })
            .addButton({
              text: `Submit Page ${page}`,
              x: 100, y: 350,
              action: `app.alert('Submitted page ${page}');`
            });
          break;
          
        default:
          // Additional pages - add generic media
          await generator.addMedia('./examples/assets/generic-media.jpg', {
            position: 'bottom-center',
            size: 'medium',
            caption: `Media for Page ${page}`
          });
      }
    }

    const result = await generator.generate();
    console.log(`✅ Multi-page enhanced: ${result.outputPath}`);
    console.log(`📊 Enhanced ${info.pages} pages with ${result.statistics.elements} elements`);
    return result;

  } catch (error) {
    console.error(`❌ Example 5 failed: ${error.message}`);
  }
}

/**
 * EXAMPLE 6: Asset Management Demo
 */
async function assetManagementExample() {
  console.log('\n📁 EXAMPLE 6: Asset management demonstration...');
  
  try {
    // Create assets directory structure
    await fs.ensureDir('./examples/assets');
    await fs.ensureDir('./examples/output');

    console.log('📋 Required assets for examples:');
    console.log('   ./examples/assets/canva-brochure.pdf     - Your Canva template');
    console.log('   ./examples/assets/profile-photo.jpg      - Profile image');
    console.log('   ./examples/assets/product-demo.mp4       - Demo video');
    console.log('   ./examples/assets/intro-message.mp3      - Audio file');
    console.log('   ./examples/assets/background-music.mp3   - Background audio');
    console.log('   ./examples/assets/logo.png               - Company logo');
    
    // Check which assets exist
    const requiredAssets = [
      'canva-brochure.pdf',
      'profile-photo.jpg', 
      'product-demo.mp4',
      'intro-message.mp3',
      'background-music.mp3',
      'logo.png'
    ];

    console.log('\n🔍 Asset Status:');
    for (const asset of requiredAssets) {
      const exists = await fs.pathExists(`./examples/assets/${asset}`);
      console.log(`   ${exists ? '✅' : '❌'} ${asset}`);
    }

    console.log('\n💡 To run examples successfully:');
    console.log('1. Place your Canva PDF as: ./examples/assets/canva-brochure.pdf');
    console.log('2. Add sample images, videos, and audio files to ./examples/assets/');
    console.log('3. Run: node examples/basic-example.js');

  } catch (error) {
    console.error(`❌ Asset check failed: ${error.message}`);
  }
}

/**
 * Main execution - run all examples
 */
async function runAllExamples() {
  console.log('🎯 Interactive PDF Creator - Usage Examples');
  console.log('===========================================');

  try {
    // Check and prepare assets
    await assetManagementExample();
    
    // Run examples (comment out ones you don't want to test)
    await createNewPDF();                    // Example 1: New PDF
    await enhanceCanvaTemplate();            // Example 2: Canva template
    await mediaFlexibilityExample();         // Example 3: Media options
    await quickGenerationExample();          // Example 4: Quick generation
    await multiPageTemplateExample();        // Example 5: Multi-page
    
    console.log('\n🎉 All examples completed!');
    console.log('📁 Check ./examples/output/ for generated PDFs');
    
  } catch (error) {
    console.error(`❌ Examples failed: ${error.message}`);
  }
}

// Export functions for individual testing
export {
  createNewPDF,
  enhanceCanvaTemplate,
  mediaFlexibilityExample,
  quickGenerationExample,
  multiPageTemplateExample,
  assetManagementExample
};

// Run all examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
