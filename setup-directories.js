/**
 * Project Setup Script - Creates all necessary directories
 * This will run as is - ensures proper directory structure
 */

import fs from 'fs-extra';
import path from 'path';

async function setupProjectDirectories() {
  console.log('Setting up Interactive PDF Creator directory structure...');
  
  const directories = [
    // Output directories
    './test-output',
    './examples/output',
    './examples/assets',
    
    // Optional working directories
    './output',
    './assets',
    './temp'
  ];

  try {
    // Create all directories
    for (const dir of directories) {
      await fs.ensureDir(dir);
      console.log(`✅ Created/verified: ${dir}`);
    }

    // Create .gitkeep files to preserve empty directories in git
    const gitkeepDirs = ['./test-output', './examples/output', './output'];
    
    for (const dir of gitkeepDirs) {
      const gitkeepPath = path.join(dir, '.gitkeep');
      if (!await fs.pathExists(gitkeepPath)) {
        await fs.writeFile(gitkeepPath, '# This file keeps the directory in git\n');
        console.log(`📝 Added .gitkeep to: ${dir}`);
      }
    }

    // Create sample README files for asset directories
    await createAssetReadmes();
    
    console.log('\n✅ Project setup complete!');
    console.log('\nDirectory Structure:');
    console.log('interactive-pdf/');
    console.log('├── test-output/           # Test results go here');
    console.log('├── examples/');
    console.log('│   ├── output/           # Example outputs');
    console.log('│   └── assets/           # Sample assets for examples');
    console.log('├── output/               # Default output directory');
    console.log('├── assets/               # Your project assets');
    console.log('└── temp/                 # Temporary files');

    console.log('\n🎯 Next steps:');
    console.log('1. Place your Canva PDF in the project root');
    console.log('2. Run: node test-canva-template.js');
    console.log('3. Check results in test-output/');

  } catch (error) {
    console.error(`❌ Setup failed: ${error.message}`);
    throw error;
  }
}

async function createAssetReadmes() {
  // Create README for examples/assets
  const examplesAssetsReadme = `# Example Assets Directory

Place sample files here for testing the examples:

## Required for Examples:
- \`canva-brochure.pdf\` - Your Canva template to test enhancement
- \`profile-photo.jpg\` - Sample image file
- \`product-demo.mp4\` - Sample video file  
- \`intro-message.mp3\` - Sample audio file
- \`background-music.mp3\` - Background audio
- \`logo.png\` - Company logo

## File Types Supported:
- **Images**: .jpg, .jpeg, .png, .gif, .bmp, .webp
- **Videos**: .mp4, .webm, .mov, .avi, .wmv, .mkv
- **Audio**: .mp3, .wav, .m4a, .aac, .ogg, .flac
- **Documents**: .pdf, .doc, .docx, .txt
- **Archives**: .zip, .rar, .7z, .tar, .gz

## Usage:
\`\`\`javascript
// Reference assets in your code:
await generator.addMedia('./examples/assets/your-file.mp4');
\`\`\`
`;

  // Create README for main assets
  const mainAssetsReadme = `# Project Assets Directory

Place your production assets here:

## Organization Suggestions:
- \`images/\` - Photos, logos, graphics
- \`videos/\` - Video content
- \`audio/\` - Sound files, music
- \`templates/\` - Canva PDFs and other templates
- \`fonts/\` - Custom fonts (if adding font support)

## Best Practices:
1. Use descriptive filenames
2. Keep file sizes reasonable (under 50MB per file)
3. Use web-optimized formats when possible
4. Maintain consistent naming conventions

## Usage:
\`\`\`javascript
// Reference your assets:
await generator.addMedia('./assets/videos/product-demo.mp4');
\`\`\`
`;

  try {
    await fs.writeFile('./examples/assets/README.md', examplesAssetsReadme);
    await fs.writeFile('./assets/README.md', mainAssetsReadme);
    console.log('📚 Created README files for asset directories');
  } catch (error) {
    console.warn(`⚠️  Could not create README files: ${error.message}`);
  }
}

async function checkCurrentStructure() {
  console.log('\n🔍 Current Directory Status:');
  
  const checkDirs = [
    './test-output',
    './examples/output', 
    './examples/assets',
    './output',
    './assets'
  ];

  for (const dir of checkDirs) {
    const exists = await fs.pathExists(dir);
    const status = exists ? '✅ EXISTS' : '❌ MISSING';
    console.log(`   ${status} ${dir}`);
  }
}

// Export for use in other scripts
export { setupProjectDirectories, checkCurrentStructure };

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await checkCurrentStructure();
    await setupProjectDirectories();
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}
