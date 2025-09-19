/**
 * Core PDF Creator - Handles basic PDF document operations
 * Works with both new documents and loaded templates
 * This will run as is - core PDF document creation system
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getPageDimensions, FONTS, COLORS } from './config.js';
import fs from 'fs-extra';

export class PDFCreator {
  constructor(config) {
    this.config = config;
    this.document = null;
    this.currentPage = null;
    this.currentPageIndex = 0;
    this.loadedFonts = {};
    this.stats = {
      pageCount: 0,
      fontsLoaded: 0
    };
  }

  async initialize() {
    try {
      this.document = await PDFDocument.create();
      
      this.document.setTitle(this.config.pdf.title);
      this.document.setAuthor(this.config.pdf.author);
      this.document.setSubject(this.config.pdf.subject);
      this.document.setCreator(this.config.pdf.creator);
      this.document.setProducer(this.config.pdf.producer);
      this.document.setCreationDate(this.config.pdf.creationDate);
      this.document.setModificationDate(this.config.pdf.modificationDate);
      
      await this.preloadStandardFonts();
      
      console.log('PDF document initialized with metadata');
      
    } catch (error) {
      throw new Error(`Failed to initialize PDF document: ${error.message}`);
    }
  }

  addPage(options = {}) {
    try {
      const size = options.size || this.config.page.size;
      const orientation = options.orientation || this.config.page.orientation;
      const dimensions = getPageDimensions(size, orientation);
      
      const page = this.document.addPage(dimensions);
      
      this.currentPage = page;
      this.currentPageIndex = this.document.getPageCount() - 1;
      this.stats.pageCount++;
      
      console.log(`Page added: ${dimensions[0]}x${dimensions[1]} (${orientation})`);
      return page;
      
    } catch (error) {
      throw new Error(`Failed to add page: ${error.message}`);
    }
  }

  async addText(text, options = {}) {
    if (!this.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        x = 50,
        y = 750,
        size = 12,
        font = 'Helvetica',
        color = '#000000',
        maxWidth,
        lineHeight = 1.2
      } = options;

      const pdfFont = await this.loadFont(font);
      const textColor = this.parseColor(color);
      
      let textToRender = text;
      let actualWidth = pdfFont.widthOfTextAtSize(text, size);
      let lines = 1;
      
      if (maxWidth && actualWidth > maxWidth) {
        const words = text.split(' ');
        const wrappedLines = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = pdfFont.widthOfTextAtSize(testLine, size);
          
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              wrappedLines.push(currentLine);
              currentLine = word;
            } else {
              wrappedLines.push(word);
            }
          }
        }
        
        if (currentLine) {
          wrappedLines.push(currentLine);
        }
        
        for (let i = 0; i < wrappedLines.length; i++) {
          const lineY = y - (i * size * lineHeight);
          this.currentPage.drawText(wrappedLines[i], {
            x,
            y: lineY,
            size,
            font: pdfFont,
            color: textColor
          });
        }
        
        lines = wrappedLines.length;
        actualWidth = Math.max(...wrappedLines.map(line => 
          pdfFont.widthOfTextAtSize(line, size)
        ));
        
      } else {
        this.currentPage.drawText(text, {
          x,
          y,
          size,
          font: pdfFont,
          color: textColor
        });
      }

      return {
        width: Math.min(actualWidth, maxWidth || actualWidth),
        height: size * lineHeight * lines,
        lines,
        font: font,
        size
      };
      
    } catch (error) {
      throw new Error(`Failed to add text: ${error.message}`);
    }
  }

  async addImage(imagePath, options = {}) {
    if (!this.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const imageBytes = await fs.readFile(imagePath);
      
      let image;
      const ext = imagePath.toLowerCase().split('.').pop();
      
      if (ext === 'png') {
        image = await this.document.embedPng(imageBytes);
      } else if (ext === 'jpg' || ext === 'jpeg') {
        image = await this.document.embedJpg(imageBytes);
      } else {
        throw new Error(`Unsupported image format: ${ext}`);
      }

      const imageDims = image.size();
      
      let { x = 100, y = 600, width, height } = options;
      
      if (!width && !height) {
        width = imageDims.width;
        height = imageDims.height;
      } else if (width && !height) {
        height = (width / imageDims.width) * imageDims.height;
      } else if (height && !width) {
        width = (height / imageDims.height) * imageDims.width;
      }

      this.currentPage.drawImage(image, {
        x,
        y,
        width,
        height
      });

      return {
        width,
        height,
        originalWidth: imageDims.width,
        originalHeight: imageDims.height,
        x,
        y
      };
      
    } catch (error) {
      throw new Error(`Failed to add image: ${error.message}`);
    }
  }

  drawRectangle(options = {}) {
    if (!this.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        x = 100,
        y = 500,
        width = 200,
        height = 100,
        borderColor = '#000000',
        borderWidth = 1,
        fillColor = null,
        opacity = 1
      } = options;

      const drawOptions = {
        x,
        y,
        width,
        height,
        opacity
      };

      if (borderWidth > 0) {
        drawOptions.borderColor = this.parseColor(borderColor);
        drawOptions.borderWidth = borderWidth;
      }

      if (fillColor) {
        drawOptions.color = this.parseColor(fillColor);
      }

      this.currentPage.drawRectangle(drawOptions);

      return { x, y, width, height };
      
    } catch (error) {
      throw new Error(`Failed to draw rectangle: ${error.message}`);
    }
  }

  drawLine(options = {}) {
    if (!this.currentPage) {
      throw new Error('No current page. Add a page first.');
    }

    try {
      const {
        start = { x: 100, y: 500 },
        end = { x: 300, y: 500 },
        thickness = 1,
        color = '#000000',
        opacity = 1
      } = options;

      this.currentPage.drawLine({
        start,
        end,
        thickness,
        color: this.parseColor(color),
        opacity
      });

      return { start, end, thickness };
      
    } catch (error) {
      throw new Error(`Failed to draw line: ${error.message}`);
    }
  }

  async loadFont(fontName) {
    if (this.loadedFonts[fontName]) {
      return this.loadedFonts[fontName];
    }

    try {
      let font;
      
      switch (fontName) {
        case FONTS.HELVETICA:
          font = await this.document.embedFont(StandardFonts.Helvetica);
          break;
        case FONTS.HELVETICA_BOLD:
          font = await this.document.embedFont(StandardFonts.HelveticaBold);
          break;
        case FONTS.HELVETICA_OBLIQUE:
          font = await this.document.embedFont(StandardFonts.HelveticaOblique);
          break;
        case FONTS.HELVETICA_BOLD_OBLIQUE:
          font = await this.document.embedFont(StandardFonts.HelveticaBoldOblique);
          break;
        case FONTS.TIMES_ROMAN:
          font = await this.document.embedFont(StandardFonts.TimesRoman);
          break;
        case FONTS.TIMES_BOLD:
          font = await this.document.embedFont(StandardFonts.TimesRomanBold);
          break;
        case FONTS.TIMES_ITALIC:
          font = await this.document.embedFont(StandardFonts.TimesRomanItalic);
          break;
        case FONTS.TIMES_BOLD_ITALIC:
          font = await this.document.embedFont(StandardFonts.TimesRomanBoldItalic);
          break;
        case FONTS.COURIER:
          font = await this.document.embedFont(StandardFonts.Courier);
          break;
        case FONTS.COURIER_BOLD:
          font = await this.document.embedFont(StandardFonts.CourierBold);
          break;
        case FONTS.COURIER_OBLIQUE:
          font = await this.document.embedFont(StandardFonts.CourierOblique);
          break;
        case FONTS.COURIER_BOLD_OBLIQUE:
          font = await this.document.embedFont(StandardFonts.CourierBoldOblique);
          break;
        default:
          font = await this.document.embedFont(StandardFonts.Helvetica);
          console.warn(`Unknown font '${fontName}', using Helvetica`);
      }
      
      this.loadedFonts[fontName] = font;
      this.stats.fontsLoaded++;
      
      return font;
      
    } catch (error) {
      throw new Error(`Failed to load font '${fontName}': ${error.message}`);
    }
  }

  async preloadStandardFonts() {
    const fontsToLoad = [
      FONTS.HELVETICA,
      FONTS.HELVETICA_BOLD,
      FONTS.TIMES_ROMAN,
      FONTS.COURIER
    ];

    for (const fontName of fontsToLoad) {
      await this.loadFont(fontName);
    }
  }

  parseColor(colorString) {
    if (typeof colorString !== 'string') {
      return rgb(0, 0, 0);
    }

    const hex = colorString.replace('#', '');
    
    if (hex.length !== 6) {
      console.warn(`Invalid color format: ${colorString}, using black`);
      return rgb(0, 0, 0);
    }

    try {
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      return rgb(r, g, b);
      
    } catch (error) {
      console.warn(`Failed to parse color: ${colorString}, using black`);
      return rgb(0, 0, 0);
    }
  }

  getCurrentPageInfo() {
    if (!this.currentPage) {
      return { 
        hasPage: false,
        message: 'No current page'
      };
    }

    const { width, height } = this.currentPage.getSize();
    
    return {
      hasPage: true,
      pageIndex: this.currentPageIndex,
      pageNumber: this.currentPageIndex + 1,
      width,
      height,
      totalPages: this.document.getPageCount()
    };
  }

  setCurrentPage(pageNumber) {
    const totalPages = this.document.getPageCount();
    
    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`Page number ${pageNumber} out of range (1-${totalPages})`);
    }

    const pageIndex = pageNumber - 1;
    this.currentPage = this.document.getPage(pageIndex);
    this.currentPageIndex = pageIndex;
  }

  getDocumentStats() {
    return {
      pageCount: this.document ? this.document.getPageCount() : 0,
      fontsLoaded: this.stats.fontsLoaded,
      currentPage: this.currentPageIndex + 1,
      hasCurrentPage: !!this.currentPage
    };
  }

  getPageMargins() {
    return this.config.page.margins;
  }

  getSafeArea() {
    if (!this.currentPage) {
      return null;
    }

    const { width, height } = this.currentPage.getSize();
    const margins = this.getPageMargins();

    return {
      x: margins.left,
      y: margins.bottom,
      width: width - margins.left - margins.right,
      height: height - margins.top - margins.bottom,
      centerX: width / 2,
      centerY: height / 2
    };
  }
}
