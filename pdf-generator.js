/**
 * Main PDF Generator - Orchestrates all components
 * Follows structured workflow: Spec → Design → Build → Test → Integrate
 * This will run as is - complete interactive PDF creation system
 */

import { PDFCreator } from './pdf-creator.js';
import { InteractiveElements } from './interactive-elements.js';
import { MediaEmbedder } from './media-embedder.js';
import { validateConfig, DEFAULT_CONFIG } from './config.js';
import fs from 'fs-extra';
import path from 'path';

export class PDFGenerator {
  constructor(config = {}) {
    // Law 1: Verification First - Validate config before proceeding
    this.config = validateConfig(config);
    
    // Initialize core components
    this.pdfCreator = new PDFCreator(this.config);
    this.interactiveElements = null;
    this.mediaEmbedder = null;
    
    // Generation state
    this.isInitialized = false;
    this.generationStats = {
      startTime: null,
      endTime: null,
      pages: 0,
      elements: 0,
      mediaItems: 0,
      fileSize: 0
    };
    
    console.log('PDF Generator initialized with validated configuration');
  }

  /**
   * STEP 1: SPEC - Initialize PDF document and prepare for content
   * @param {Object} documentOptions - Document-level settings
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async initialize(documentOptions = {}) {
    try {
      this.generationStats.startTime = new Date();
      
      // Initialize PDF document
      await this.pdfCreator.initialize();
      
      // Initialize interactive systems
      this.interactiveElements = new InteractiveElements(this.pdfCreator);
      this.mediaEmbedder = new MediaEmbedder(this.pdfCreator);
      
      // Apply document-level options
      if (documentOptions.title) this.config.pdf.title = documentOptions.title;
      if (documentOptions.author) this.config.pdf.author = documentOptions.author;
      if (documentOptions.subject) this.config.pdf.subject = documentOptions.subject;
      
      this.isInitialized = true;
      console.log('✅ SPEC COMPLETE: PDF document initialized');
      return this;
      
    } catch (error) {
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * STEP 2: DESIGN - Add page with specified layout
   * @param {Object} pageOptions - Page configuration
   * @returns {PDFGenerator} - Chainable interface
   */
  addPage(pageOptions = {}) {
    this.validateInitialized();
    
    try {
      const page = this.pdfCreator.addPage(pageOptions);
      this.generationStats.pages++;
      
      console.log(`✅ DESIGN: Page ${this.generationStats.pages} added`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add page: ${error.message}`);
    }
  }

  /**
   * STEP 3: BUILD - Add content to current page
   * Comprehensive content addition with validation
   */

  /**
   * Add text content with flexible formatting
   * @param {string} text - Text content
   * @param {Object} options - Text formatting options
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async addText(text, options = {}) {
    this.validateInitialized();
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text content is required and must be a string');
    }

    try {
      const result = await this.pdfCreator.addText(text, options);
      console.log(`✅ BUILD: Text added (${result.lines} lines, ${result.width}x${result.height})`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add text: ${error.message}`);
    }
  }

  /**
   * Add image with flexible positioning and sizing
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Image options
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async addImage(imagePath, options = {}) {
    this.validateInitialized();
    
    try {
      const result = await this.pdfCreator.addImage(imagePath, options);
      console.log(`✅ BUILD: Image added (${result.width}x${result.height})`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add image: ${error.message}`);
    }
  }

  /**
   * Add any type of media with maximum flexibility
   * @param {string} mediaPath - Path to media file
   * @param {Object} options - Media options
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async addMedia(mediaPath, options = {}) {
    this.validateInitialized();
    
    try {
      const result = await this.mediaEmbedder.embedMedia(mediaPath, options);
      this.generationStats.mediaItems++;
      console.log(`✅ BUILD: Media added - ${result.type} (${result.dimensions?.width || 'auto'}x${result.dimensions?.height || 'auto'})`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add media: ${error.message}`);
    }
  }

  /**
   * Add interactive text field
   * @param {Object} options - Text field configuration
   * @returns {PDFGenerator} - Chainable interface
   */
  addTextField(options = {}) {
    this.validateInitialized();
    
    try {
      const textField = this.interactiveElements.addTextField(options);
      this.generationStats.elements++;
      console.log(`✅ BUILD: Text field added - ${textField.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add text field: ${error.message}`);
    }
  }

  /**
   * Add interactive checkbox
   * @param {Object} options - Checkbox configuration
   * @returns {PDFGenerator} - Chainable interface
   */
  addCheckbox(options = {}) {
    this.validateInitialized();
    
    try {
      const checkbox = this.interactiveElements.addCheckbox(options);
      this.generationStats.elements++;
      console.log(`✅ BUILD: Checkbox added - ${checkbox.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add checkbox: ${error.message}`);
    }
  }

  /**
   * Add dropdown/select field
   * @param {Object} options - Dropdown configuration
   * @returns {PDFGenerator} - Chainable interface
   */
  addDropdown(options = {}) {
    this.validateInitialized();
    
    try {
      const dropdown = this.interactiveElements.addDropdown(options);
      this.generationStats.elements++;
      console.log(`✅ BUILD: Dropdown added - ${dropdown.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add dropdown: ${error.message}`);
    }
  }

  /**
   * Add radio button group
   * @param {Object} options - Radio group configuration
   * @returns {PDFGenerator} - Chainable interface
   */
  addRadioGroup(options = {}) {
    this.validateInitialized();
    
    try {
      const radioGroup = this.interactiveElements.addRadioGroup(options);
      this.generationStats.elements++;
      console.log(`✅ BUILD: Radio group added - ${radioGroup.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add radio group: ${error.message}`);
    }
  }

  /**
   * Add interactive button
   * @param {Object} options - Button configuration  
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async addButton(options = {}) {
    this.validateInitialized();
    
    try {
      const button = await this.interactiveElements.addButton(options);
      this.generationStats.elements++;
      console.log(`✅ BUILD: Button added - ${button.name}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add button: ${error.message}`);
    }
  }

  /**
   * Add hyperlink
   * @param {Object} options - Link configuration
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async addLink(options = {}) {
    this.validateInitialized();
    
    try {
      const link = await this.interactiveElements.addLink(options);
      this.generationStats.elements++;
      console.log(`✅ BUILD: Link added - ${link.url}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add link: ${error.message}`);
    }
  }

  /**
   * STEP 4: TEST - Validate PDF structure and content
   * @returns {Object} - Validation results
   */
  validateDocument() {
    this.validateInitialized();
    
    try {
      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        stats: this.getDocumentStatistics()
      };

      // Check page count
      if (validation.stats.pages === 0) {
        validation.errors.push('Document has no pages');
        validation.isValid = false;
      }

      // Check page limits
      if (validation.stats.pages > this.config.validation.maxPages) {
        validation.errors.push(`Page count exceeds limit: ${validation.stats.pages}/${this.config.validation.maxPages}`);
        validation.isValid = false;
      }

      // Check element limits per page
      const elementStats = this.interactiveElements?.getElementsStats() || { byPage: {} };
      Object.entries(elementStats.byPage).forEach(([page, count]) => {
        if (count > this.config.validation.maxInteractiveElements) {
          validation.warnings.push(`Page ${page} has ${count} interactive elements (limit: ${this.config.validation.maxInteractiveElements})`);
        }
      });

      // Check media file sizes
      const mediaStats = this.mediaEmbedder?.getMediaStats() || { totalSize: 0 };
      if (mediaStats.totalSize > this.config.media.maxFileSize * 10) { // 10x limit for total
        validation.warnings.push(`Total media size may affect PDF performance: ${(mediaStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
      }

      // Check JavaScript actions
      if (this.config.actions.enableJavaScript && validation.stats.elements > 0) {
        validation.warnings.push('JavaScript actions require manual PDF editing after generation');
      }

      console.log(`✅ TEST: Document validation ${validation.isValid ? 'PASSED' : 'FAILED'}`);
      console.log(`   Pages: ${validation.stats.pages}, Elements: ${validation.stats.elements}, Media: ${validation.stats.media}`);
      
      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings);
      }
      
      if (validation.errors.length > 0) {
        console.error('Validation errors:', validation.errors);
      }

      return validation;
      
    } catch (error) {
      throw new Error(`Document validation failed: ${error.message}`);
    }
  }

  /**
   * STEP 5: INTEGRATE - Generate final PDF with all content
   * @param {string} outputPath - Path for output PDF file
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generation results
   */
  async generate(outputPath = null, options = {}) {
    this.validateInitialized();
    
    try {
      // Step 4: Test - Validate before generation
      const validation = this.validateDocument();
      
      if (!validation.isValid && this.config.validation.strictMode) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare output path
      const finalOutputPath = outputPath || 
                             path.join(this.config.output.directory, this.config.output.filename);
      
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(finalOutputPath));
      
      // Check for existing file
      if (!this.config.output.overwrite && await fs.pathExists(finalOutputPath)) {
        throw new Error(`Output file already exists: ${finalOutputPath}`);
      }

      // Generate PDF bytes
      console.log('🔄 INTEGRATE: Generating PDF bytes...');
      const pdfBytes = await this.pdfCreator.document.save({
        useObjectStreams: this.config.output.compress,
        addDefaultPage: false,
        objectsPerTick: 50 // Performance optimization
      });

      // Write to file
      await fs.writeFile(finalOutputPath, pdfBytes);
      
      // Update statistics
      this.generationStats.endTime = new Date();
      this.generationStats.fileSize = pdfBytes.length;
      
      // Calculate generation time
      const generationTime = this.generationStats.endTime - this.generationStats.startTime;
      
      const result = {
        success: true,
        outputPath: finalOutputPath,
        fileSize: pdfBytes.length,
        fileSizeMB: (pdfBytes.length / 1024 / 1024).toFixed(2),
        generationTime: `${generationTime}ms`,
        statistics: this.getDocumentStatistics(),
        validation,
        pdfBytes: options.returnBytes ? pdfBytes : null
      };

      console.log('✅ INTEGRATE COMPLETE: PDF generated successfully');
      console.log(`   Output: ${finalOutputPath}`);
      console.log(`   Size: ${result.fileSizeMB}MB`);
      console.log(`   Time: ${result.generationTime}`);
      console.log(`   Pages: ${result.statistics.pages}`);
      console.log(`   Elements: ${result.statistics.elements}`);
      console.log(`   Media: ${result.statistics.media}`);

      return result;
      
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate and return PDF as buffer (without saving to file)
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateBuffer(options = {}) {
    this.validateInitialized();
    
    try {
      const validation = this.validateDocument();
      
      if (!validation.isValid && this.config.validation.strictMode) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      }

      console.log('🔄 Generating PDF buffer...');
      const pdfBytes = await this.pdfCreator.document.save({
        useObjectStreams: this.config.output.compress,
        addDefaultPage: false
      });

      this.generationStats.endTime = new Date();
      this.generationStats.fileSize = pdfBytes.length;
      
      console.log(`✅ PDF buffer generated: ${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB`);
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      throw new Error(`PDF buffer generation failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive document statistics
   * @returns {Object} - Document statistics
   */
  getDocumentStatistics() {
    const baseStats = this.pdfCreator.getDocumentStats();
    const elementStats = this.interactiveElements?.getElementsStats() || { total: 0, byType: {}, byPage: {} };
    const mediaStats = this.mediaEmbedder?.getMediaStats() || { total: 0, byType: {}, totalSize: 0 };

    return {
      pages: baseStats.pageCount,
      fonts: baseStats.fontsLoaded,
      elements: elementStats.total,
      elementsByType: elementStats.byType,
      media: mediaStats.total,
      mediaByType: mediaStats.byType,
      mediaSizeMB: (mediaStats.totalSize / 1024 / 1024).toFixed(2),
      generationTime: this.generationStats.endTime ? 
                     `${this.generationStats.endTime - this.generationStats.startTime}ms` : 'In progress',
      fileSizeMB: this.generationStats.fileSize ? 
                 (this.generationStats.fileSize / 1024 / 1024).toFixed(2) : 'Not generated'
    };
  }

  /**
   * Get current page information
   * @returns {Object} - Current page details
   */
  getCurrentPageInfo() {
    this.validateInitialized();
    return this.pdfCreator.getCurrentPageInfo();
  }

  /**
   * Set current page for content addition
   * @param {number} pageNumber - Page number (1-based)
   * @returns {PDFGenerator} - Chainable interface
   */
  setCurrentPage(pageNumber) {
    this.validateInitialized();
    this.pdfCreator.setCurrentPage(pageNumber);
    console.log(`Current page set to: ${pageNumber}`);
    return this;
  }

  /**
   * Create a template/preset configuration
   * @param {string} templateName - Template identifier
   * @returns {Object} - Template configuration
   */
  static createTemplate(templateName) {
    const templates = {
      'form': {
        pdf: {
          title: 'Interactive Form',
          subject: 'Form Template'
        },
        page: {
          size: 'A4',
          margins: { top: 72, bottom: 72, left: 72, right: 72 }
        },
        interactive: {
          buttons: { backgroundColor: '#007BFF' },
          textFields: { borderColor: '#007BFF' }
        }
      },
      
      'presentation': {
        pdf: {
          title: 'Interactive Presentation',
          subject: 'Presentation Template'
        },
        page: {
          size: 'A4',
          orientation: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        },
        media: {
          video: { width: 600, height: 450 }
        }
      },
      
      'brochure': {
        pdf: {
          title: 'Interactive Brochure',
          subject: 'Marketing Material'
        },
        page: {
          size: 'A4',
          margins: { top: 36, bottom: 36, left: 36, right: 36 }
        },
        interactive: {
          links: { color: '#DC3545' }
        }
      }
    };

    return templates[templateName] || DEFAULT_CONFIG;
  }

  /**
   * Batch operation: Add multiple content items
   * @param {Array} contentItems - Array of content configurations
   * @returns {Promise<PDFGenerator>} - Chainable interface
   */
  async addContent(contentItems) {
    this.validateInitialized();
    
    if (!Array.isArray(contentItems)) {
      throw new Error('Content items must be an array');
    }

    for (const item of contentItems) {
      const { type, ...options } = item;
      
      try {
        switch (type) {
          case 'page':
            this.addPage(options);
            break;
          case 'text':
            await this.addText(item.content || item.text, options);
            break;
          case 'image':
            await this.addImage(item.path || item.src, options);
            break;
          case 'media':
            await this.addMedia(item.path || item.src, options);
            break;
          case 'textField':
            this.addTextField(options);
            break;
          case 'checkbox':
            this.addCheckbox(options);
            break;
          case 'dropdown':
            this.addDropdown(options);
            break;
          case 'radioGroup':
            this.addRadioGroup(options);
            break;
          case 'button':
            await this.addButton(options);
            break;
          case 'link':
            await this.addLink(options);
            break;
          default:
            console.warn(`Unknown content type: ${type}`);
        }
      } catch (error) {
        throw new Error(`Failed to add ${type}: ${error.message}`);
      }
    }

    console.log(`✅ Batch content added: ${contentItems.length} items`);
    return this;
  }

  /**
   * Validate that PDF generator is initialized
   * @private
   */
  validateInitialized() {
    if (!this.isInitialized) {
      throw new Error('PDF Generator not initialized. Call initialize() first.');
    }
  }

  /**
   * Reset generator for new document
   */
  reset() {
    this.pdfCreator = new PDFCreator(this.config);
    this.interactiveElements = null;
    this.mediaEmbedder = null;
    this.isInitialized = false;
    this.generationStats = {
      startTime: null,
      endTime: null,
      pages: 0,
      elements: 0,
      mediaItems: 0,
      fileSize: 0
    };
    console.log('PDF Generator reset for new document');
  }
}

/**
 * Convenience function for quick PDF generation
 * @param {Object} config - PDF configuration
 * @param {Array} content - Content items array
 * @param {string} outputPath - Output file path
 * @returns {Promise<Object>} - Generation results
 */
export async function generatePDF(config = {}, content = [], outputPath = null) {
  const generator = new PDFGenerator(config);
  
  try {
    await generator.initialize();
    
    // Add a default page if no page content specified
    if (!content.some(item => item.type === 'page')) {
      generator.addPage();
    }
    
    await generator.addContent(content);
    
    return await generator.generate(outputPath);
    
  } catch (error) {
    throw new Error(`Quick PDF generation failed: ${error.message}`);
  }
}

// Export default configuration for easy access
export { DEFAULT_CONFIG, validateConfig } from './config.js';
