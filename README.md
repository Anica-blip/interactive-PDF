# Interactive PDF Creator

A powerful JavaScript library for creating interactive PDF documents with embedded multimedia elements, form controls, and clickable actions. Generates actual downloadable PDF files that work in browsers and PDF viewers without requiring HTML interfaces.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![PDF-lib](https://img.shields.io/badge/powered%20by-PDF--lib-blue)](https://pdf-lib.js.org/)

## ✨ Features

### 🎯 Interactive Elements
- **Form Fields**: Text inputs, checkboxes, dropdowns, radio groups
- **Buttons**: Clickable buttons with JavaScript actions  
- **Links**: Hyperlink annotations with custom styling
- **Validation**: Built-in form validation and required field support

### 🎬 Multimedia Support
- **All Media Types**: Videos, audio, images, documents, archives
- **Flexible Positioning**: Exact coordinates, shortcuts, or smart positioning
- **Dynamic Sizing**: Scale, fit-to-page, aspect ratio preservation
- **Interactive Thumbnails**: Video thumbnails with play buttons, audio controls

### 📄 PDF Generation
- **Professional PDFs**: Full PDF specification compliance
- **Multiple Page Sizes**: A4, Letter, Legal, custom dimensions
- **Font System**: All standard PDF fonts with caching
- **Compression**: Optimized file sizes with quality preservation

### ⚙️ Developer Experience
- **Chainable API**: Fluent interface for intuitive coding
- **TypeScript Ready**: Full type definitions included
- **Error Handling**: Comprehensive validation and debugging
- **Template System**: Pre-configured templates for common use cases

## 🚀 Quick Start

### Installation

```bash
npm install interactive-pdf
```

### Basic Usage

```javascript
import { PDFGenerator } from 'interactive-pdf';

// Create a simple interactive form
const generator = new PDFGenerator({
  pdf: {
    title: 'My Interactive Form',
    author: 'Your Name'
  }
});

await generator
  .initialize()
  .addPage()
  .addText('Welcome to Interactive PDF!', { 
    size: 24, 
    x: 50, 
    y: 750 
  })
  .addTextField({ 
    name: 'username',
    x: 50, 
    y: 700,
    width: 200,
    placeholder: 'Enter your name'
  })
  .addButton({ 
    text: 'Submit',
    x: 50, 
    y: 650,
    action: 'this.submitForm()'
  })
  .generate('./output/my-form.pdf');

console.log('✅ Interactive PDF created!');
```

### Quick Generation Function

```javascript
import { generatePDF } from 'interactive-pdf';

const result = await generatePDF(
  { pdf: { title: 'Quick PDF' } },
  [
    { type: 'page' },
    { type: 'text', content: 'Hello World!', x: 100, y: 700 },
    { type: 'image', path: './logo.png', x: 100, y: 600 }
  ],
  './quick-pdf.pdf'
);

console.log(`PDF generated: ${result.fileSizeMB}MB`);
```

## 📖 API Documentation

### PDFGenerator Class

#### Constructor
```javascript
const generator = new PDFGenerator(config);
```

#### Core Methods

##### `initialize(documentOptions)`
Initialize the PDF document with metadata.
```javascript
await generator.initialize({
  title: 'My Document',
  author: 'John Doe',
  subject: 'Interactive PDF Demo'
});
```

##### `addPage(options)`
Add a new page with specified layout.
```javascript
generator.addPage({
  size: 'A4',           // 'A4', 'Letter', 'Legal', or [width, height]
  orientation: 'portrait', // 'portrait' or 'landscape'
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});
```

##### `addText(text, options)`
Add formatted text content.
```javascript
await generator.addText('Your text here', {
  x: 100,               // X coordinate
  y: 700,               // Y coordinate
  size: 14,             // Font size
  font: 'Helvetica',    // Font family
  color: '#000000',     // Text color
  maxWidth: 400,        // Text wrapping width
  lineHeight: 1.2       // Line spacing
});
```

##### `addMedia(filePath, options)`
Add any type of media with flexible positioning and sizing.
```javascript
await generator.addMedia('./video.mp4', {
  x: 100,               // Exact coordinates
  y: 400,
  width: 400,           // Exact dimensions
  height: 300,
  
  // OR use flexible positioning
  position: 'center',   // 'center', 'top-left', 'bottom-right', etc.
  
  // OR use flexible sizing
  size: 'large',        // 'small', 'medium', 'large', 'xlarge'
  fit: 'width',         // 'width', 'height', 'page'
  maxWidth: 500,        // Constraint-based sizing
  
  // Styling options
  caption: 'My Video',
  border: { width: 2, color: '#000000' },
  backgroundColor: '#F0F0F0'
});
```

##### Interactive Elements

```javascript
// Text Input Field
generator.addTextField({
  name: 'email',
  x: 100, y: 300,
  width: 200, height: 25,
  placeholder: 'Enter email',
  required: true,
  multiline: false
});

// Checkbox
generator.addCheckbox({
  name: 'newsletter',
  x: 100, y: 250,
  label: 'Subscribe to newsletter',
  labelPosition: 'right',
  checked: false
});

// Dropdown
generator.addDropdown({
  name: 'country',
  x: 100, y: 200,
  options: ['USA', 'Canada', 'UK', 'Other'],
  defaultValue: 'USA'
});

// Radio Group
generator.addRadioGroup({
  name: 'plan',
  x: 100, y: 150,
  options: [
    { value: 'basic', label: 'Basic Plan' },
    { value: 'premium', label: 'Premium Plan' }
  ],
  direction: 'vertical',
  spacing: 25
});

// Button with Action
await generator.addButton({
  text: 'Submit Form',
  x: 100, y: 100,
  width: 120, height: 30,
  action: 'this.submitForm()',
  backgroundColor: '#007BFF',
  fontColor: '#FFFFFF'
});

// Hyperlink
await generator.addLink({
  text: 'Visit our website',
  url: 'https://example.com',
  x: 100, y: 50,
  color: '#007BFF',
  underline: true
});
```

##### `generate(outputPath, options)`
Generate the final PDF file.
```javascript
const result = await generator.generate('./output/document.pdf', {
  returnBytes: false  // Set to true to also return PDF bytes
});

console.log(`Generated: ${result.outputPath}`);
console.log(`Size: ${result.fileSizeMB}MB`);
console.log(`Pages: ${result.statistics.pages}`);
```

##### `generateBuffer()`
Generate PDF as buffer without saving to file.
```javascript
const pdfBuffer = await generator.generateBuffer();
// Use buffer for streaming, database storage, etc.
```

## 💡 Examples

### Complete Interactive Form
```javascript
import { PDFGenerator } from 'interactive-pdf';

const generator = new PDFGenerator({
  pdf: { title: 'Registration Form' }
});

await generator.initialize()
  .addPage()
  
  // Header
  .addText('Registration Form', { 
    x: 50, y: 750, size: 24, font: 'Helvetica-Bold' 
  })
  
  // Personal Information Section
  .addText('Personal Information', { 
    x: 50, y: 700, size: 16, font: 'Helvetica-Bold' 
  })
  
  .addText('Full Name:', { x: 50, y: 670, size: 12 })
  .addTextField({ 
    name: 'fullName', x: 150, y: 665, width: 300, height: 25 
  })
  
  .addText('Email:', { x: 50, y: 630, size: 12 })
  .addTextField({ 
    name: 'email', x: 150, y: 625, width: 300, height: 25 
  })
  
  // Preferences
  .addText('Preferences', { 
    x: 50, y: 580, size: 16, font: 'Helvetica-Bold' 
  })
  
  .addCheckbox({ 
    name: 'newsletter', x: 50, y: 550, 
    label: 'Subscribe to newsletter' 
  })
  
  .addText('Preferred Contact:', { x: 50, y: 510, size: 12 })
  .addRadioGroup({
    name: 'contact_method',
    x: 50, y: 480,
    options: ['Email', 'Phone', 'Mail'],
    direction: 'horizontal',
    spacing: 80
  })
  
  // Submit Button
  .addButton({ 
    text: 'Submit Registration', 
    x: 50, y: 400,
    width: 150, height: 35,
    action: 'this.submitForm()'
  })
  
  .generate('./forms/registration.pdf');
```

### Flexible Media Positioning
```javascript
// Different ways to position media
await generator
  // Exact coordinates
  .addMedia('./image1.jpg', { x: 100, y: 400 })
  
  // Position shortcuts
  .addMedia('./image2.jpg', { position: 'center' })
  .addMedia('./image3.jpg', { position: 'top-right' })
  
  // Flexible sizing
  .addMedia('./video.mp4', { 
    fit: 'width',           // Fit to page width
    maxHeight: 400          // But limit height
  })
  
  // Constraint-based
  .addMedia('./large-image.png', {
    maxWidth: 500,          // Maximum width
    size: 0.8               // Scale to 80% if under limit
  })
  
  // Smart positioning with styling
  .addMedia('./audio.mp3', {
    position: 'bottom-center',
    caption: 'Background Music',
    border: { width: 1, color: '#CCCCCC' }
  });
```

## 🎯 Media Flexibility Examples

The media system supports maximum flexibility for all file types:

### Video Files
```javascript
// Vertical video (mobile)
.addMedia('./vertical-video.mp4', {
  width: 300, height: 500,
  position: 'center'
})

// Widescreen video
.addMedia('./widescreen.mp4', {
  fit: 'width',
  maxHeight: 400
})

// Small preview
.addMedia('./preview.mp4', {
  size: 'small',
  x: 50, y: 100
})
```

### Images & GIFs
```javascript
// Small GIF animation
.addMedia('./animation.gif', {
  size: 0.5,              // 50% of original
  position: 'top-right'
})

// Large hero image
.addMedia('./hero.jpg', {
  fit: 'page',            // Fit entire page
  opacity: 0.8
})

// Thumbnail gallery
.addMedia('./thumb1.png', { x: 50, y: 300, width: 100, height: 100 })
.addMedia('./thumb2.png', { x: 160, y: 300, width: 100, height: 100 })
```

### Any File Type
```javascript
// Documents
.addMedia('./document.pdf', { position: 'center' })
.addMedia('./spreadsheet.xlsx', { x: 100, y: 200 })

// Archives
.addMedia('./files.zip', { position: 'bottom-left' })

// Audio files
.addMedia('./music.mp3', { 
  position: 'bottom-center',
  width: 400, height: 60
})
```

## 🔧 Advanced Usage

### Configuration System
```javascript
const config = {
  // PDF Document Settings
  pdf: {
    title: 'Interactive Document',
    author: 'Your Name',
    subject: 'Generated PDF',
    keywords: ['interactive', 'pdf', 'form']
  },

  // Page Configuration
  page: {
    size: 'A4',           // A4, Letter, Legal, or [width, height]
    orientation: 'portrait',
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  },

  // Interactive Elements Styling
  interactive: {
    buttons: {
      fontSize: 12,
      fontColor: '#FFFFFF',
      backgroundColor: '#007BFF',
      borderColor: '#0056B3',
      cornerRadius: 4
    },
    textFields: {
      fontSize: 12,
      backgroundColor: '#FFFFFF',
      borderColor: '#CCCCCC',
      borderWidth: 1
    }
  },

  // Media Configuration
  media: {
    maxFileSize: 50 * 1024 * 1024, // 50MB limit
    embedAsAttachment: true,
    createThumbnails: true,
    video: { width: 400, height: 300 },
    audio: { width: 300, height: 50 }
  },

  // Output Settings
  output: {
    filename: 'interactive-document.pdf',
    directory: './output',
    overwrite: true,
    compress: true
  },

  // Validation Rules
  validation: {
    strictMode: true,
    maxPages: 1000,
    maxInteractiveElements: 500
  }
};
```

### Batch Content Addition
```javascript
const content = [
  { type: 'page' },
  { type: 'text', content: 'Title', x: 100, y: 700, size: 24 },
  { type: 'image', path: './logo.png', position: 'top-right' },
  { type: 'media', path: './video.mp4', fit: 'width' },
  { type: 'textField', name: 'name', x: 100, y: 400 },
  { type: 'button', text: 'Submit', x: 100, y: 350 }
];

await generator.initialize()
  .addContent(content)
  .generate('./batch-content.pdf');
```

## 🛠️ Development

### Project Structure
```
interactive-pdf/
├── pdf-creator.js          # Core PDF document creation
├── interactive-elements.js # Form fields, buttons, links
├── media-embedder.js       # Flexible media embedding
├── pdf-generator.js        # Main orchestration system
├── config.js              # Configuration management
├── package.json           # Dependencies and scripts
├── README.md              # This file
├── LICENSE                # MIT License
└── examples/              # Usage examples
    ├── basic-form.js
    ├── multimedia-doc.js
    └── advanced-features.js
```

### Running Examples
```bash
npm run examples    # Run all examples
npm start          # Run basic example
npm test           # Run validation tests
```

### Dependencies
- **pdf-lib**: Core PDF creation and manipulation
- **fs-extra**: Enhanced file system operations

## 📝 Important Notes

### JavaScript Actions Limitation
Due to PDF-lib limitations, JavaScript actions in buttons require manual PDF editing after generation. The system creates visual buttons and notes the required JavaScript for manual implementation.

### File Attachments
Media embedding creates visual representations and prepares files for attachment. Actual PDF attachment embedding requires manual post-processing.

### Browser Compatibility
Generated PDFs work in all major PDF viewers and browsers. Interactive elements follow PDF specification standards for maximum compatibility.

## 🚀 Upcoming Features

### 📖 Flipping Pages Experience (Coming Soon!)
- **Book-style Layout**: Side-by-side pages like an open magazine
- **Smooth Transitions**: Animated page flipping with multiple effects
- **Full-screen Mode**: Immersive reading experience
- **Clean Interface**: Hide PDF controls for distraction-free viewing

This will transform your PDFs into engaging, magazine-like experiences!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [PDF-lib](https://pdf-lib.js.org/) - Excellent PDF creation library
- Inspired by the need for true interactive PDF generation in JavaScript

---

**Happy PDF Creating! 🎉**
