/**
 * Main PDF Generator - Orchestrates all components
 * NOW SUPPORTS: Loading Canva PDFs as templates for interactive enhancement
 * This will run as is - complete interactive PDF creation system
 */

import { PDFCreator } from './pdf-creator.js';
import { InteractiveElements } from './interactive-elements.js';
import { MediaEmbedder } from './media-embedder.js';
import { validateConfig, DEFAULT_CONFIG } from './config.js';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs-extra';
import path from 'path';

export class PDFGenerator {
  constructor(config = {}) {
    this.config = validateConfig(config);
    
    this.pdfCreator = new PDFCreator(this.config);
    this.interactiveElements = null;
    this.mediaEmbedder = null;
    
    this.isTemplateLoaded = false;
    this.templatePath = null;
    
    this.isInitialized = false;
    this.generationStats = {
      startTime: null,
      endTime: null,
      pages: 0,
      elements: 0,
      mediaItems: 0,
      fileSize: 0,
      templateUsed: false
    };
    
    console.log('PDF Generator initialized with validated configuration');
  }

  async initialize(documentOptions = {}) {
    try {
      this.generationStats.startTime = new Date();
      
      if (documentOptions.templatePdf) {
        await this.loadTemplate(documentOptions.templatePdf);
      } else {
        await this.pdfCreator.initialize();
      }
      
      this.interactiveElements = new InteractiveElements(this.pdfCreator);
      this.mediaEmbedder = new MediaEmbedder(this.pdfCreator);
      
      if (documentOptions.title) this.config.pdf.title = documentOptions.title;
      if (documentOptions.author) this.config.pdf.author = documentOptions.author;
      if (documentOptions.subject) this.config.pdf.subject = documentOptions.subject;
      
      this.isInitialized = true;
      
      if (this.isTemplateLoaded) {
        console.log(`SPEC COMPLETE: PDF template loaded (${this.generationStats.pages} pages)`);
      } else {
        console.log('SPEC COMPLETE: PDF document initialized');
      }
      
      return this;
      
    } catch (error) {
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  async loadTemplate(templatePath) {
    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template PDF not found: ${templatePath}`);
    }

    try {
      const templateBytes = await fs.readFile(templatePath);
      const loadedPdf = await PDFDocument.load(templateBytes);
      
      this.pdfCreator.document = loadedPdf;
      
      const pageCount = loadedPdf.getPageCount();
      this.generationStats.pages = pageCount;
      
      this.isTemplateLoaded = true;
      this.templatePath = templatePath;
      this.generationStats.templateUsed = true;
      
      if (pageCount > 0) {
        this.pdfCreator.currentPage = loadedPdf.getPage(0);
        this.pdfCreator.currentPageIndex = 0;
      }
      
      console.log(`Template loaded: ${path.basename(templatePath)} (${pageCount} pages)`);
      
    } catch (error) {
      throw new Error(`Failed to load template PDF: ${error.message}`);
    }
  }

  addPage(pageOptions = {}) {
    this.validateInitialized();
    
    try {
      if (this.isTemplateLoaded) {
        console.warn('Adding new page to template. Consider using setCurrentPage() instead.');
      }
      
      const page = this.pdfCreator.addPage(pageOptions);
      this.generationStats.pages++;
      
      console.log(`DESIGN: Page ${this.generationStats.pages} added`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add page: ${error.message}`);
    }
  }

  setCurrentPage(pageNumber) {
    this.validateInitialized();
    
    const maxPages = this.isTemplateLoaded ? 
      this.pdfCreator.document.getPageCount() : 
      this.generationStats.pages;
      
    if (pageNumber < 1 || pageNumber > maxPages) {
      throw new Error(`Page number ${pageNumber} out of range (1-${maxPages})`);
    }
    
    const pageIndex = pageNumber - 1;
    this.pdfCreator.currentPage = this.pdfCreator.document.getPage(pageIndex);
    this.pdfCreator.currentPageIndex = pageIndex;
    
    console.log(`Current page set to: ${pageNumber}${this.isTemplateLoaded ? ' (template page)' : ''}`);
    return this;
  }

  getTemplateInfo() {
    if (!this.isTemplateLoaded) {
      return { isLoaded: false };
    }
    
    return {
      isLoaded: true,
      path: this.templatePath,
      pages: this.pdfCreator.document.getPageCount(),
      currentPage: this.pdfCreator.currentPageIndex + 1,
      filename: path.basename(this.templatePath)
    };
  }

  async addText(text, options = {}) {
    this.validateInitialized();
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text content is required and must be a string');
    }

    try {
      const result = await this.pdfCreator.addText(text, options);
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Text added${pageInfo} (${result.lines} lines, ${result.width}x${result.height})`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add text: ${error.message}`);
    }
  }

  async addImage(imagePath, options = {}) {
    this.validateInitialized();
    
    try {
      const result = await this.pdfCreator.addImage(imagePath, options);
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Image added${pageInfo} (${result.width}x${result.height})`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add image: ${error.message}`);
    }
  }

  async addMedia(mediaPath, options = {}) {
    this.validateInitialized();
    
    try {
      const result = await this.mediaEmbedder.embedMedia(mediaPath, options);
      this.generationStats.mediaItems++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Media added${pageInfo} - ${result.type} (${result.dimensions?.width || 'auto'}x${result.dimensions?.height || 'auto'})`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add media: ${error.message}`);
    }
  }

  async addAudioButton(options = {}) {
    this.validateInitialized();
    
    const audioOptions = {
      text: options.text || 'Play Audio',
      x: options.x || 100,
      y: options.y || 100,
      width: options.width || 120,
      height: options.height || 30,
      backgroundColor: options.backgroundColor || '#28A745',
      fontColor: options.fontColor || '#FFFFFF',
      action: `app.alert('Audio: ${options.audioUrl || 'No URL provided'}');`,
      audioUrl: options.audioUrl
    };

    try {
      const button = await this.interactiveElements.addButton(audioOptions);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Audio button added${pageInfo} - ${button.name}`);
      
      if (options.audioUrl) {
        console.log(`NOTE: Audio URL stored (${options.audioUrl}). Actual playback depends on PDF viewer support.`);
      }
      
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add audio button: ${error.message}`);
    }
  }

  addTextField(options = {}) {
    this.validateInitialized();
    
    try {
      const textField = this.interactiveElements.addTextField(options);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Text field added${pageInfo} - ${textField.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add text field: ${error.message}`);
    }
  }

  addCheckbox(options = {}) {
    this.validateInitialized();
    
    try {
      const checkbox = this.interactiveElements.addCheckbox(options);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Checkbox added${pageInfo} - ${checkbox.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add checkbox: ${error.message}`);
    }
  }

  addDropdown(options = {}) {
    this.validateInitialized();
    
    try {
      const dropdown = this.interactiveElements.addDropdown(options);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Dropdown added${pageInfo} - ${dropdown.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add dropdown: ${error.message}`);
    }
  }

  addRadioGroup(options = {}) {
    this.validateInitialized();
    
    try {
      const radioGroup = this.interactiveElements.addRadioGroup(options);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Radio group added${pageInfo} - ${radioGroup.getName()}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add radio group: ${error.message}`);
    }
  }

  async addButton(options = {}) {
    this.validateInitialized();
    
    try {
      const button = await this.interactiveElements.addButton(options);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Button added${pageInfo} - ${button.name}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add button: ${error.message}`);
    }
  }

  async addLink(options = {}) {
    this.validateInitialized();
    
    try {
      const link = await this.interactiveElements.addLink(options);
      this.generationStats.elements++;
      const pageInfo = this.isTemplateLoaded ? ` on template page ${this.pdfCreator.currentPageIndex + 1}` : '';
      console.log(`BUILD: Link added${pageInfo} - ${link.url}`);
      return this;
      
    } catch (error) {
      throw new Error(`Failed to add link: ${error.message}`);
    }
  }

  validateDocument() {
    this.validateInitialized();
    
    try {
      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        stats: this.getDocumentStatistics(),
        templateInfo: this.getTemplateInfo()
      };

      if (validation.stats.pages === 0) {
        validation.errors.push('Document has no pages');
        validation.isValid = false;
      }

      if (this.isTemplateLoaded) {
        validation.warnings.push('Template PDF loaded - ensure interactive elements are positioned correctly');
        
        if (validation.stats.elements === 0 && validation.stats.media === 0) {
          validation.warnings.push('No interactive elements added to template');
        }
      }

      if (validation.stats.pages > this.config.validation.maxPages) {
        validation.errors.push(`Page count exceeds limit: ${validation.stats.pages}/${this.config.validation.maxPages}`);
        validation.isValid = false;
      }

      const elementStats = this.interactiveElements?.getElementsStats() || { byPage: {} };
      Object.entries(elementStats.byPage).forEach(([page, count]) => {
        if (count > this.config.validation.maxInteractiveElements) {
          validation.warnings.push(`Page ${page} has ${count} interactive elements (limit: ${this.config.validation.maxInteractiveElements})`);
        }
      });

      const mediaStats = this.mediaEmbedder?.getMediaStats() || { totalSize: 0 };
      if (mediaStats.totalSize > this.config.media.maxFileSize * 10) {
        validation.warnings.push(`Total media size may affect PDF performance: ${(mediaStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
      }

      const buttonCount = elementStats.byType?.button || 0;
      if (buttonCount > 0) {
        validation.warnings.push('Audio/button playback requires PDF viewer support - test in target environment');
      }

      console.log(`TEST: Document validation ${validation.isValid ? 'PASSED' : 'FAILED'}`);
      if (this.isTemplateLoaded) {
        console.log(`   Template: ${validation.templateInfo.filename} (${validation.templateInfo.pages} pages)`);
      }
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

  async generate(outputPath = null, options = {}) {
    this.validateInitialized();
    
    try {
      const validation = this.validateDocument();
      
      if (!validation.isValid && this.config.validation.strictMode) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      }

      const finalOutputPath = outputPath || 
                             path.join(this.config.output.directory, this.config.output.filename);
      
      if (this.isTemplateLoaded && !outputPath) {
        const templateName = path.basename(this.templatePath, '.pdf');
        const enhancedFilename = `${templateName}-interactive.pdf`;
        const enhancedPath = path.join(this.config.output.directory, enhancedFilename);
        console.log(`Suggestion: Consider output path: ${enhancedPath}`);
      }
      
      await fs.ensureDir(path.dirname(finalOutputPath));
      
      if (!this.config.output.overwrite && await fs.pathExists(finalOutputPath)) {
        throw new Error(`Output file already exists: ${finalOutputPath}`);
      }

      console.log(`INTEGRATE: Generating ${this.isTemplateLoaded ? 'enhanced template' : 'new'} PDF...`);
      const pdfBytes = await this.pdfCreator.document.save({
        useObjectStreams: this.config.output.compress,
        addDefaultPage: false,
        objectsPerTick: 50
      });

      await fs.writeFile(finalOutputPath, pdfBytes);
      
      this.generationStats.endTime = new Date();
      this.generationStats.fileSize = pdfBytes.length;
      
      const generationTime = this.generationStats.endTime - this.generationStats.startTime;
      
      const result = {
        success: true,
        outputPath: finalOutputPath,
        fileSize: pdfBytes.length,
        fileSizeMB: (pdfBytes.length / 1024 / 1024).toFixed(2),
        generationTime: `${generationTime}ms`,
        statistics: this.getDocumentStatistics(),
        validation,
        templateInfo: this.getTemplateInfo(),
        pdfBytes: options.returnBytes ? pdfBytes : null
      };

      console.log('INTEGRATE COMPLETE: PDF generated successfully');
      console.log(`   Output: ${finalOutputPath}`);
      console.log(`   Size: ${result.fileSizeMB}MB`);
      console.log(`   Time: ${result.generationTime}`);
      if (this.isTemplateLoaded) {
        console.log(`   Template: ${result.templateInfo.filename}`);
      }
      console.log(`   Pages: ${result.statistics.pages}`);
      console.log(`   Elements: ${result.statistics.elements}`);
      console.log(`   Media: ${result.statistics.media}`);

      return result;
      
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async generateBuffer(options = {}) {
    this.validateInitialized();
    
    try {
      const validation = this.validateDocument();
      
      if (!validation.isValid && this.config.validation.strictMode) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      }

      console.log(`Generating ${this.isTemplateLoaded ? 'enhanced template' : 'new'} PDF buffer...`);
      const pdfBytes = await this.pdfCreator.document.save({
        useObjectStreams: this.config.output.compress,
        addDefaultPage: false
      });

      this.generationStats.endTime = new Date();
      this.generationStats.fileSize = pdfBytes.length;
      
      console.log(`PDF buffer generated: ${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB`);
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      throw new Error(`PDF buffer generation failed: ${error.message}`);
    }
  }

  getDocumentStatistics() {
    const baseStats = this.pdfCreator.getDocumentStats();
    const elementStats = this.interactiveElements?.getElementsStats() || { total: 0, byType: {}, byPage: {} };
    const mediaStats = this.mediaEmbedder?.getMediaStats() || { total: 0, byType: {}, totalSize: 0 };

    return {
      pages: this.isTemplateLoaded ? this.pdfCreator.document.getPageCount() : baseStats.pageCount,
      fonts: baseStats.fontsLoaded,
      elements: elementStats.total,
      elementsByType: elementStats.byType,
      media: mediaStats.total,
      mediaByType: mediaStats.byType,
      mediaSizeMB: (mediaStats.totalSize / 1024 / 1024).toFixed(2),
      templateUsed: this.isTemplateLoaded,
      generationTime: this.generationStats.endTime ? 
                     `${this.generationStats.endTime - this.generationStats.startTime}ms` : 'In progress',
      fileSizeMB: this.generationStats.fileSize ? 
                 (this.generationStats.fileSize / 1024 / 1024).toFixed(2) : 'Not generated'
    };
  }

  getCurrentPageInfo() {
    this.validateInitialized();
    const baseInfo = this.pdfCreator.getCurrentPageInfo();
    
    if (this.isTemplateLoaded) {
      return {
        ...baseInfo,
        isTemplateSource: true,
        templatePath: this.templatePath,
        currentPageNumber: this.pdfCreator.currentPageIndex + 1,
        totalPages: this.pdfCreator.document.getPageCount()
      };
    }
    
    return baseInfo;
  }

  static createTemplate(templateName) {
    const templates = {
      'form': {
        pdf: { title: 'Interactive Form', subject: 'Form Template' },
        page: { size: 'A4', margins: { top: 72, bottom: 72, left: 72, right: 72 } },
        interactive: { buttons: { backgroundColor: '#007BFF' }, textFields: { borderColor: '#007BFF' } }
      },
      'presentation': {
        pdf: { title: 'Interactive Presentation', subject: 'Presentation Template' },
        page: { size: 'A4', orientation: 'landscape', margins: { top: 50, bottom: 50, left: 50, right: 50 } },
        media: { video: { width: 600, height: 450 } }
      },
      'brochure': {
        pdf: { title: 'Interactive Brochure', subject: 'Marketing Material' },
        page: { size: 'A4', margins: { top: 36, bottom: 36, left: 36, right: 36 } },
        interactive: { links: { color: '#DC3545' } }
      }
    };

    return templates[templateName] || DEFAULT_CONFIG;
  }

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
          case 'audioButton':
            await this.addAudioButton(options);
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

    console.log(`Batch content added: ${contentItems.length} items`);
    return this;
  }

  validateInitialized() {
    if (!this.isInitialized) {
      throw new Error('PDF Generator not initialized. Call initialize() first.');
    }
  }

  reset() {
    this.pdfCreator = new PDFCreator(this.config);
    this.interactiveElements = null;
    this.mediaEmbedder = null;
    this.isInitialized = false;
    this.isTemplateLoaded = false;
    this.templatePath = null;
    this.generationStats = {
      startTime: null,
      endTime: null,
      pages: 0,
      elements: 0,
      mediaItems: 0,
      fileSize: 0,
      templateUsed: false
    };
    console.log('PDF Generator reset for new document');
  }
}

export async function generatePDF(config = {}, content = [], outputPath = null, templatePdf = null) {
  const generator = new PDFGenerator(config);
  
  try {
    await generator.initialize({ templatePdf });
    
    if (!templatePdf && !content.some(item => item.type === 'page')) {
      generator.addPage();
    }
    
    await generator.addContent(content);
    
    return await generator.generate(outputPath);
    
  } catch (error) {
    throw new Error(`Quick PDF generation failed: ${error.message}`);
  }
}

export { DEFAULT_CONFIG, validateConfig } from './config.js';
