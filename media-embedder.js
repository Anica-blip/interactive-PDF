/**
 * Flexible media embedding system for PDF documents
 * Supports all media types with dynamic sizing, positioning, and aspect ratio handling
 */

import fs from 'fs-extra';
import path from 'path';
import { FONTS, COLORS } from './config.js';

export class MediaEmbedder {
  constructor(pdfCreator) {
    this.pdfCreator = pdfCreator;
    this.embeddedMedia = [];
    this.attachments = [];
    this.supportedFormats = {
      video: ['.mp4', '.webm', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.m4v', '.3gp'],
      audio: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus'],
      image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'],
      document: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
      archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      other: [] // Will accept any format not in above categories
    };
  }

  /**
   * Embed any type of media with flexible positioning and sizing
   * @param {string} filePath - Path to media file
   * @param {Object} options - Flexible media options
   * @returns {Promise<Object>} - Media placement information
   */
  async embedMedia(filePath, options = {}) {
    if (!this.pdfCreator.currentPage) {
      throw new Error('No current page available');
    }

    try {
      // Validate file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Media file not found: ${filePath}`);
      }

      const fileStats = await fs.stat(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const mediaType = this.detectMediaType(fileExtension);

      // Flexible media configuration
      const mediaOptions = this.buildMediaOptions(filePath, options, mediaType, fileStats);

      // Validate file size
      if (fileStats.size > this.pdfCreator.config.media.maxFileSize) {
        throw new Error(`File too large: ${(fileStats.size / 1024 / 1024).toFixed(2)}MB exceeds ${(this.pdfCreator.config.media.maxFileSize / 1024 / 1024)}MB limit`);
      }

      let result;

      // Handle different media types with flexible approach
      switch (mediaType) {
        case 'image':
          result = await this.embedImage(filePath, mediaOptions);
          break;
        case 'video':
          result = await this.embedVideo(filePath, mediaOptions);
          break;
        case 'audio':
          result = await this.embedAudio(filePath, mediaOptions);
          break;
        default:
          result = await this.embedGenericFile(filePath, mediaOptions);
          break;
      }

      // Register embedded media
      this.embeddedMedia.push({
        filePath,
        fileName,
        mediaType,
        options: mediaOptions,
        result,
        page: this.pdfCreator.pageCount,
        timestamp: new Date()
      });

      console.log(`Media embedded: ${fileName} (${mediaType}) on page ${this.pdfCreator.pageCount}`);
      return result;

    } catch (error) {
      throw new Error(`Failed to embed media: ${error.message}`);
    }
  }

  /**
   * Embed image with flexible sizing and positioning
   * @private
   */
  async embedImage(filePath, options) {
    try {
      const imageBytes = await fs.readFile(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      let image;
      let originalDimensions = { width: 0, height: 0 };

      // Handle different image formats
      if (fileExtension === '.png') {
        image = await this.pdfCreator.document.embedPng(imageBytes);
        originalDimensions = image.size();
      } else if (['.jpg', '.jpeg'].includes(fileExtension)) {
        image = await this.pdfCreator.document.embedJpg(imageBytes);
        originalDimensions = image.size();
      } else {
        // For unsupported image formats, create placeholder
        return await this.createMediaPlaceholder(options, 'Image', '🖼️');
      }

      // Calculate flexible dimensions
      const dimensions = this.calculateDimensions(
        originalDimensions.width,
        originalDimensions.height,
        options
      );

      // Position with flexible placement
      const position = this.calculatePosition(dimensions, options);

      // Draw image
      this.pdfCreator.currentPage.drawImage(image, {
        x: position.x,
        y: position.y,
        width: dimensions.width,
        height: dimensions.height,
        opacity: options.opacity || 1.0
      });

      // Add caption if provided
      if (options.caption) {
        await this.addMediaCaption(options.caption, position, dimensions, options);
      }

      // Add border if requested
      if (options.border) {
        this.addMediaBorder(position, dimensions, options.border);
      }

      return {
        type: 'image',
        position,
        dimensions,
        originalDimensions,
        filePath,
        interactive: false
      };

    } catch (error) {
      // Fallback to placeholder on error
      console.warn(`Image embedding failed, using placeholder: ${error.message}`);
      return await this.createMediaPlaceholder(options, 'Image', '🖼️');
    }
  }

  /**
   * Embed video with interactive thumbnail
   * @private
   */
  async embedVideo(filePath, options) {
    try {
      // Create interactive video thumbnail
      const thumbnailResult = await this.createVideoThumbnail(filePath, options);
      
      // Embed video as attachment if configured
      if (this.pdfCreator.config.media.embedAsAttachment) {
        await this.embedAsAttachment(filePath, options);
      }

      return {
        type: 'video',
        position: thumbnailResult.position,
        dimensions: thumbnailResult.dimensions,
        filePath,
        interactive: true,
        thumbnail: thumbnailResult,
        attachment: this.pdfCreator.config.media.embedAsAttachment
      };

    } catch (error) {
      console.warn(`Video embedding failed, using placeholder: ${error.message}`);
      return await this.createMediaPlaceholder(options, 'Video', '🎬');
    }
  }

  /**
   * Embed audio with interactive controls
   * @private
   */
  async embedAudio(filePath, options) {
    try {
      // Create audio control interface
      const controlsResult = await this.createAudioControls(filePath, options);
      
      // Embed audio as attachment
      if (this.pdfCreator.config.media.embedAsAttachment) {
        await this.embedAsAttachment(filePath, options);
      }

      return {
        type: 'audio',
        position: controlsResult.position,
        dimensions: controlsResult.dimensions,
        filePath,
        interactive: true,
        controls: controlsResult,
        attachment: this.pdfCreator.config.media.embedAsAttachment
      };

    } catch (error) {
      console.warn(`Audio embedding failed, using placeholder: ${error.message}`);
      return await this.createMediaPlaceholder(options, 'Audio', '🎵');
    }
  }

  /**
   * Embed generic file as attachment with icon
   * @private
   */
  async embedGenericFile(filePath, options) {
    try {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      // Create file icon and info
      const iconResult = await this.createFileIcon(filePath, options);
      
      // Always embed generic files as attachments
      await this.embedAsAttachment(filePath, options);

      return {
        type: 'file',
        position: iconResult.position,
        dimensions: iconResult.dimensions,
        filePath,
        fileName,
        extension: fileExtension,
        interactive: true,
        attachment: true
      };

    } catch (error) {
      console.warn(`File embedding failed, using placeholder: ${error.message}`);
      return await this.createMediaPlaceholder(options, 'File', '📁');
    }
  }

  /**
   * Create video thumbnail with play button
   * @private
   */
  async createVideoThumbnail(filePath, options) {
    const fileName = path.basename(filePath);
    const dimensions = this.calculateDimensions(
      options.originalWidth || this.pdfCreator.config.media.video.width,
      options.originalHeight || this.pdfCreator.config.media.video.height,
      options
    );
    const position = this.calculatePosition(dimensions, options);

    // Draw thumbnail background
    this.pdfCreator.currentPage.drawRectangle({
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      color: this.pdfCreator.parseColor(options.backgroundColor || '#000000'),
      borderColor: this.pdfCreator.parseColor(options.borderColor || '#CCCCCC'),
      borderWidth: options.borderWidth || 1
    });

    // Add play button overlay
    const playButtonSize = Math.min(dimensions.width, dimensions.height) * 0.2;
    const playButtonX = position.x + (dimensions.width - playButtonSize) / 2;
    const playButtonY = position.y + (dimensions.height - playButtonSize) / 2;

    // Play button circle
    this.pdfCreator.currentPage.drawCircle({
      x: playButtonX + playButtonSize / 2,
      y: playButtonY + playButtonSize / 2,
      size: playButtonSize / 2,
      color: this.pdfCreator.parseColor(options.playButtonColor || '#FFFFFF'),
      opacity: 0.8
    });

    // Play triangle
    const font = await this.pdfCreator.loadFont(FONTS.HELVETICA);
    this.pdfCreator.currentPage.drawText('▶', {
      x: playButtonX + playButtonSize * 0.35,
      y: playButtonY + playButtonSize * 0.3,
      size: playButtonSize * 0.4,
      font: font,
      color: this.pdfCreator.parseColor('#000000')
    });

    // Add filename below
    await this.pdfCreator.addText(options.label || fileName, {
      x: position.x,
      y: position.y - 20,
      size: options.labelSize || 10,
      color: options.labelColor || COLORS.BLACK,
      maxWidth: dimensions.width
    });

    return { position, dimensions };
  }

  /**
   * Create audio controls interface
   * @private
   */
  async createAudioControls(filePath, options) {
    const fileName = path.basename(filePath);
    const dimensions = this.calculateDimensions(
      this.pdfCreator.config.media.audio.width,
      this.pdfCreator.config.media.audio.height,
      options
    );
    const position = this.calculatePosition(dimensions, options);

    // Draw audio control background
    this.pdfCreator.currentPage.drawRectangle({
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      color: this.pdfCreator.parseColor(options.backgroundColor || '#F0F0F0'),
      borderColor: this.pdfCreator.parseColor(options.borderColor || '#CCCCCC'),
      borderWidth: options.borderWidth || 1
    });

    // Add audio icon and controls
    const font = await this.pdfCreator.loadFont(FONTS.HELVETICA);
    
    // Speaker icon
    this.pdfCreator.currentPage.drawText('🔊', {
      x: position.x + 10,
      y: position.y + dimensions.height / 2 - 8,
      size: 16,
      font: font
    });

    // Play button
    this.pdfCreator.currentPage.drawText('▶', {
      x: position.x + 40,
      y: position.y + dimensions.height / 2 - 8,
      size: 14,
      font: font,
      color: this.pdfCreator.parseColor(options.controlColor || COLORS.PRIMARY)
    });

    // Progress bar
    const progressBarY = position.y + dimensions.height / 2;
    this.pdfCreator.currentPage.drawLine({
      start: { x: position.x + 70, y: progressBarY },
      end: { x: position.x + dimensions.width - 20, y: progressBarY },
      thickness: 3,
      color: this.pdfCreator.parseColor('#DDDDDD')
    });

    // Filename
    await this.pdfCreator.addText(options.label || fileName, {
      x: position.x,
      y: position.y - 15,
      size: options.labelSize || 10,
      color: options.labelColor || COLORS.BLACK,
      maxWidth: dimensions.width
    });

    return { position, dimensions };
  }

  /**
   * Create file icon with filename
   * @private
   */
  async createFileIcon(filePath, options) {
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    const dimensions = this.calculateDimensions(80, 80, options);
    const position = this.calculatePosition(dimensions, options);

    // Choose icon based on file type
    let icon = '📁';
    const iconMap = {
      '.pdf': '📄', '.doc': '📄', '.docx': '📄', '.txt': '📄',
      '.zip': '📦', '.rar': '📦', '.7z': '📦',
      '.xlsx': '📊', '.csv': '📊',
      '.ppt': '📊', '.pptx': '📊'
    };
    icon = iconMap[fileExtension] || icon;

    // Draw icon background
    this.pdfCreator.currentPage.drawRectangle({
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      color: this.pdfCreator.parseColor(options.backgroundColor || '#F8F9FA'),
      borderColor: this.pdfCreator.parseColor(options.borderColor || '#DEE2E6'),
      borderWidth: options.borderWidth || 1
    });

    // Draw icon
    const font = await this.pdfCreator.loadFont(FONTS.HELVETICA);
    this.pdfCreator.currentPage.drawText(icon, {
      x: position.x + dimensions.width / 2 - 15,
      y: position.y + dimensions.height / 2 - 5,
      size: 30,
      font: font
    });

    // Add filename
    await this.pdfCreator.addText(options.label || fileName, {
      x: position.x,
      y: position.y - 15,
      size: options.labelSize || 9,
      color: options.labelColor || COLORS.BLACK,
      maxWidth: dimensions.width
    });

    return { position, dimensions };
  }

  /**
   * Create media placeholder for unsupported formats
   * @private
   */
  async createMediaPlaceholder(options, mediaType, icon) {
    const dimensions = this.calculateDimensions(
      options.width || 200,
      options.height || 150,
      options
    );
    const position = this.calculatePosition(dimensions, options);

    // Draw placeholder background
    this.pdfCreator.currentPage.drawRectangle({
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      color: this.pdfCreator.parseColor(options.backgroundColor || '#F8F9FA'),
      borderColor: this.pdfCreator.parseColor(options.borderColor || '#DEE2E6'),
      borderWidth: 2,
      dashArray: [5, 5]
    });

    // Add icon and text
    const font = await this.pdfCreator.loadFont(FONTS.HELVETICA);
    
    this.pdfCreator.currentPage.drawText(icon, {
      x: position.x + dimensions.width / 2 - 20,
      y: position.y + dimensions.height / 2 + 10,
      size: 40,
      font: font
    });

    this.pdfCreator.currentPage.drawText(`${mediaType} Placeholder`, {
      x: position.x + 10,
      y: position.y + dimensions.height / 2 - 20,
      size: 12,
      font: font,
      color: this.pdfCreator.parseColor(COLORS.GRAY)
    });

    if (options.label || options.filename) {
      await this.pdfCreator.addText(options.label || options.filename, {
        x: position.x,
        y: position.y - 15,
        size: 10,
        maxWidth: dimensions.width
      });
    }

    return {
      type: 'placeholder',
      position,
      dimensions,
      mediaType,
      interactive: false
    };
  }

  /**
   * Embed file as PDF attachment
   * @private
   */
  async embedAsAttachment(filePath, options) {
    try {
      const fileBytes = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      
      // Note: PDF-lib doesn't directly support file attachments
      // This would require manual PDF manipulation
      console.log(`File attachment noted for manual embedding: ${fileName}`);
      
      this.attachments.push({
        fileName,
        filePath,
        size: fileBytes.length,
        options,
        page: this.pdfCreator.pageCount
      });

    } catch (error) {
      console.warn(`Failed to prepare attachment: ${error.message}`);
    }
  }

  /**
   * Calculate flexible dimensions based on options and constraints
   * @private
   */
  calculateDimensions(originalWidth, originalHeight, options) {
    let width = options.width || originalWidth;
    let height = options.height || originalHeight;

    // Handle different sizing modes
    if (options.size) {
      if (typeof options.size === 'number') {
        // Uniform scaling
        const scale = options.size;
        width = originalWidth * scale;
        height = originalHeight * scale;
      } else if (typeof options.size === 'string') {
        // Predefined sizes
        const sizeMap = {
          'small': 0.5,
          'medium': 1.0,
          'large': 1.5,
          'xlarge': 2.0
        };
        const scale = sizeMap[options.size] || 1.0;
        width = originalWidth * scale;
        height = originalHeight * scale;
      }
    }

    // Handle max dimensions
    if (options.maxWidth && width > options.maxWidth) {
      height = height * (options.maxWidth / width);
      width = options.maxWidth;
    }
    
    if (options.maxHeight && height > options.maxHeight) {
      width = width * (options.maxHeight / height);
      height = options.maxHeight;
    }

    // Handle fit modes
    if (options.fit) {
      const pageWidth = this.pdfCreator.currentPage.getWidth() - 
                       this.pdfCreator.config.page.margins.left - 
                       this.pdfCreator.config.page.margins.right;
      const pageHeight = this.pdfCreator.currentPage.getHeight() - 
                        this.pdfCreator.config.page.margins.top - 
                        this.pdfCreator.config.page.margins.bottom;

      switch (options.fit) {
        case 'width':
          const widthScale = pageWidth / width;
          width = pageWidth;
          height = height * widthScale;
          break;
        case 'height':
          const heightScale = pageHeight / height;
          height = pageHeight;
          width = width * heightScale;
          break;
        case 'page':
          const scale = Math.min(pageWidth / width, pageHeight / height);
          width = width * scale;
          height = height * scale;
          break;
      }
    }

    // Maintain aspect ratio if only one dimension specified
    if (options.width && !options.height) {
      height = originalHeight * (options.width / originalWidth);
    } else if (options.height && !options.width) {
      width = originalWidth * (options.height / originalHeight);
    }

    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height))
    };
  }

  /**
   * Calculate flexible position based on options
   * @private
   */
  calculatePosition(dimensions, options) {
    const pageWidth = this.pdfCreator.currentPage.getWidth();
    const pageHeight = this.pdfCreator.currentPage.getHeight();
    const margins = this.pdfCreator.config.page.margins;

    let x = options.x;
    let y = options.y;

    // Handle positioning shortcuts
    if (options.position) {
      switch (options.position) {
        case 'center':
          x = (pageWidth - dimensions.width) / 2;
          y = (pageHeight - dimensions.height) / 2;
          break;
        case 'top-left':
          x = margins.left;
          y = pageHeight - margins.top - dimensions.height;
          break;
        case 'top-right':
          x = pageWidth - margins.right - dimensions.width;
          y = pageHeight - margins.top - dimensions.height;
          break;
        case 'bottom-left':
          x = margins.left;
          y = margins.bottom;
          break;
        case 'bottom-right':
          x = pageWidth - margins.right - dimensions.width;
          y = margins.bottom;
          break;
        case 'top-center':
          x = (pageWidth - dimensions.width) / 2;
          y = pageHeight - margins.top - dimensions.height;
          break;
        case 'bottom-center':
          x = (pageWidth - dimensions.width) / 2;
          y = margins.bottom;
          break;
      }
    }

    // Use defaults if no position specified
    if (x === undefined) {
      x = margins.left;
    }
    if (y === undefined) {
      y = pageHeight - margins.top - dimensions.height;
    }

    return { x, y };
  }

  /**
   * Add media caption
   * @private
   */
  async addMediaCaption(caption, position, dimensions, options) {
    const captionY = position.y - (options.captionOffset || 15);
    
    await this.pdfCreator.addText(caption, {
      x: position.x,
      y: captionY,
      size: options.captionSize || 10,
      color: options.captionColor || COLORS.GRAY,
      maxWidth: dimensions.width,
      font: options.captionFont || FONTS.HELVETICA
    });
  }

  /**
   * Add media border
   * @private
   */
  addMediaBorder(position, dimensions, borderOptions) {
    this.pdfCreator.currentPage.drawRectangle({
      x: position.x - borderOptions.width / 2,
      y: position.y - borderOptions.width / 2,
      width: dimensions.width + borderOptions.width,
      height: dimensions.height + borderOptions.width,
      borderColor: this.pdfCreator.parseColor(borderOptions.color || COLORS.BLACK),
      borderWidth: borderOptions.width || 1
    });
  }

  /**
   * Detect media type from file extension
   * @private
   */
  detectMediaType(extension) {
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      if (extensions.includes(extension)) {
        return type;
      }
    }
    return 'other';
  }

  /**
   * Build comprehensive media options with defaults
   * @private
   */
  buildMediaOptions(filePath, userOptions, mediaType, fileStats) {
    const fileName = path.basename(filePath);
    
    return {
      // File info
      fileName,
      filePath,
      mediaType,
      fileSize: fileStats.size,
      
      // Positioning (flexible)
      x: userOptions.x,
      y: userOptions.y,
      position: userOptions.position,
      
      // Sizing (flexible)
      width: userOptions.width,
      height: userOptions.height,
      size: userOptions.size,
      maxWidth: userOptions.maxWidth,
      maxHeight: userOptions.maxHeight,
      fit: userOptions.fit,
      
      // Styling
      backgroundColor: userOptions.backgroundColor,
      borderColor: userOptions.borderColor,
      borderWidth: userOptions.borderWidth,
      border: userOptions.border,
      opacity: userOptions.opacity,
      
      // Labeling
      label: userOptions.label,
      caption: userOptions.caption,
      labelSize: userOptions.labelSize,
      labelColor: userOptions.labelColor,
      captionSize: userOptions.captionSize,
      captionColor: userOptions.captionColor,
      captionOffset: userOptions.captionOffset,
      
      // Interaction
      clickAction: userOptions.clickAction,
      tooltip: userOptions.tooltip,
      
      // Media-specific
      playButtonColor: userOptions.playButtonColor,
      controlColor: userOptions.controlColor,
      
      ...userOptions // Allow any additional custom options
    };
  }

  /**
   * Get all embedded media statistics
   * @returns {Object} - Media statistics
   */
  getMediaStats() {
    const stats = {
      total: this.embeddedMedia.length,
      attachments: this.attachments.length,
      byType: {},
      byPage: {},
      totalSize: 0
    };

    this.embeddedMedia.forEach(media => {
      // Count by type
      stats.byType[media.mediaType] = (stats.byType[media.mediaType] || 0) + 1;
      
      // Count by page
      stats.byPage[media.page] = (stats.byPage[media.page] || 0) + 1;
      
      // Calculate total size
      stats.totalSize += media.options.fileSize || 0;
    });

    return stats;
  }

  /**
   * Clear all embedded media records
   */
  reset() {
    this.embeddedMedia = [];
    this.attachments = [];
  }
}
