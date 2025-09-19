/**
 * Configuration settings for Interactive PDF creation
 * Centralizes all PDF generation parameters and validation
 */

export const DEFAULT_CONFIG = {
  // PDF Document Settings
  pdf: {
    title: 'Interactive PDF Document',
    author: 'Interactive PDF Creator',
    subject: 'Generated with Interactive PDF Library',
    creator: 'Interactive PDF v1.0.0',
    producer: 'PDF-lib',
    creationDate: new Date(),
    modificationDate: new Date(),
    keywords: ['interactive', 'pdf', 'multimedia']
  },

  // Page Configuration
  page: {
    size: 'A4', // A4, Letter, Legal, or custom [width, height]
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    },
    orientation: 'portrait' // 'portrait' or 'landscape'
  },

  // Interactive Elements Defaults
  interactive: {
    // Button styling
    buttons: {
      fontSize: 12,
      fontColor: '#FFFFFF',
      backgroundColor: '#007BFF',
      borderColor: '#0056B3',
      borderWidth: 1,
      cornerRadius: 4,
      padding: 8
    },
    
    // Text field styling
    textFields: {
      fontSize: 12,
      fontColor: '#000000',
      backgroundColor: '#FFFFFF',
      borderColor: '#CCCCCC',
      borderWidth: 1,
      cornerRadius: 2,
      padding: 4
    },

    // Checkbox styling
    checkboxes: {
      size: 16,
      checkColor: '#007BFF',
      borderColor: '#CCCCCC',
      borderWidth: 1
    },

    // Link styling
    links: {
      color: '#007BFF',
      underline: true,
      fontSize: 12
    }
  },

  // Media Configuration
  media: {
    // Supported file types
    supportedVideo: ['.mp4', '.webm', '.mov'],
    supportedAudio: ['.mp3', '.wav', '.m4a'],
    supportedImages: ['.jpg', '.jpeg', '.png', '.gif'],
    
    // Default dimensions for media placeholders
    video: {
      width: 400,
      height: 300,
      thumbnailText: '▶ Click to play video'
    },
    
    audio: {
      width: 300,
      height: 50,
      thumbnailText: '🔊 Click to play audio'
    },

    // File size limits (in bytes)
    maxFileSize: 50 * 1024 * 1024, // 50MB
    
    // Embedding options
    embedAsAttachment: true, // Embed files as PDF attachments
    createThumbnails: true   // Create visual thumbnails for media
  },

  // Output Configuration
  output: {
    filename: 'interactive-document.pdf',
    directory: './output',
    overwrite: true,
    compress: true, // Enable PDF compression
    preserveMetadata: true
  },

  // Validation Rules
  validation: {
    strictMode: true, // Throw errors on invalid configurations
    warnOnUnsupported: true, // Log warnings for unsupported features
    validateMediaFiles: true, // Check if media files exist and are valid
    maxPages: 1000, // Maximum number of pages allowed
    maxInteractiveElements: 500 // Maximum interactive elements per page
  },

  // JavaScript Actions Configuration
  actions: {
    enableJavaScript: true, // Allow JavaScript actions in PDF
    maxActionLength: 10000, // Maximum characters in JavaScript action
    allowedMethods: [
      'this.print',
      'this.resetForm',
      'this.submitForm',
      'app.alert',
      'app.response'
    ]
  }
};

/**
 * Page size constants in points (1 point = 1/72 inch)
 */
export const PAGE_SIZES = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [420.94, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
  Tabloid: [792, 1224]
};

/**
 * Font constants for PDF generation
 */
export const FONTS = {
  HELVETICA: 'Helvetica',
  HELVETICA_BOLD: 'Helvetica-Bold',
  HELVETICA_OBLIQUE: 'Helvetica-Oblique',
  HELVETICA_BOLD_OBLIQUE: 'Helvetica-BoldOblique',
  TIMES_ROMAN: 'Times-Roman',
  TIMES_BOLD: 'Times-Bold',
  TIMES_ITALIC: 'Times-Italic',
  TIMES_BOLD_ITALIC: 'Times-BoldItalic',
  COURIER: 'Courier',
  COURIER_BOLD: 'Courier-Bold',
  COURIER_OBLIQUE: 'Courier-Oblique',
  COURIER_BOLD_OBLIQUE: 'Courier-BoldOblique'
};

/**
 * Color constants in RGB format
 */
export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  RED: '#FF0000',
  GREEN: '#00FF00',
  BLUE: '#0000FF',
  GRAY: '#808080',
  LIGHT_GRAY: '#D3D3D3',
  DARK_GRAY: '#A9A9A9',
  PRIMARY: '#007BFF',
  SUCCESS: '#28A745',
  WARNING: '#FFC107',
  DANGER: '#DC3545',
  INFO: '#17A2B8'
};

/**
 * Validates and merges user configuration with defaults
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} - Merged and validated configuration
 */
export function validateConfig(userConfig = {}) {
  const config = mergeDeep(DEFAULT_CONFIG, userConfig);
  
  // Validate page size
  if (typeof config.page.size === 'string') {
    if (!PAGE_SIZES[config.page.size.toUpperCase()]) {
      throw new Error(`Unsupported page size: ${config.page.size}`);
    }
  } else if (Array.isArray(config.page.size)) {
    if (config.page.size.length !== 2 || 
        !config.page.size.every(dim => typeof dim === 'number' && dim > 0)) {
      throw new Error('Custom page size must be [width, height] with positive numbers');
    }
  }

  // Validate margins
  const margins = config.page.margins;
  if (margins.top < 0 || margins.bottom < 0 || margins.left < 0 || margins.right < 0) {
    throw new Error('Page margins must be non-negative');
  }

  // Validate file size limit
  if (config.media.maxFileSize <= 0) {
    throw new Error('Media file size limit must be positive');
  }

  // Validate page limits
  if (config.validation.maxPages <= 0 || config.validation.maxInteractiveElements <= 0) {
    throw new Error('Page and element limits must be positive');
  }

  return config;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} - Merged object
 */
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Get page dimensions based on size and orientation
 * @param {string|Array} size - Page size identifier or custom dimensions
 * @param {string} orientation - 'portrait' or 'landscape'
 * @returns {Array} - [width, height] in points
 */
export function getPageDimensions(size, orientation = 'portrait') {
  let dimensions;
  
  if (typeof size === 'string') {
    dimensions = PAGE_SIZES[size.toUpperCase()];
    if (!dimensions) {
      throw new Error(`Unknown page size: ${size}`);
    }
  } else if (Array.isArray(size)) {
    dimensions = [...size];
  } else {
    throw new Error('Page size must be string or array');
  }
  
  // Swap dimensions for landscape
  if (orientation === 'landscape') {
    return [dimensions[1], dimensions[0]];
  }
  
  return dimensions;
}
