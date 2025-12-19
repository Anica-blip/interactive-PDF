    const configContent = `/**
 * Configuration settings for Interactive PDF creation
 * Centralizes all PDF generation parameters and validation
 */

// Environment configuration for Cloudflare deployment
export const ENV_CONFIG = {
  r2: {
    publicUrl: typeof process !== 'undefined' && process.env?.R2_PUBLIC_URL 
      ? process.env.R2_PUBLIC_URL 
      : 'https://files.3c-public-library.org',
    accountId: typeof process !== 'undefined' && process.env?.R2_ACCOUNT_ID 
      ? process.env.R2_ACCOUNT_ID 
      : '',
    accessKeyId: typeof process !== 'undefined' && process.env?.R2_ACCESS_KEY_ID 
      ? process.env.R2_ACCESS_KEY_ID 
      : '',
    secretAccessKey: typeof process !== 'undefined' && process.env?.R2_SECRET_ACCESS_KEY 
      ? process.env.R2_SECRET_ACCESS_KEY 
      : '',
    bucketName: typeof process !== 'undefined' && process.env?.R2_BUCKET_NAME 
      ? process.env.R2_BUCKET_NAME 
      : '3c-library-files'
  },
  supabase: {
    url: typeof process !== 'undefined' && process.env?.SUPABASE_URL 
      ? process.env.SUPABASE_URL 
      : '${url}',
    anonKey: typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY 
      ? process.env.SUPABASE_ANON_KEY 
      : '${anonKey}',
    serviceKey: typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_KEY 
      ? process.env.SUPABASE_SERVICE_KEY 
      : '${serviceKey}'
  },
  app: {
    name: 'Interactive PDF Builder',
    domain: 'builder.3c-public-library.org',
    version: '1.0.0',
    environment: typeof process !== 'undefined' && process.env?.ENVIRONMENT 
      ? process.env.ENVIRONMENT 
      : 'development'
  }
};

export const DEFAULT_CONFIG = {
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

  page: {
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    },
    orientation: 'portrait'
  },

  interactive: {
    buttons: {
      fontSize: 12,
      fontColor: '#FFFFFF',
      backgroundColor: '#007BFF',
      borderColor: '#0056B3',
      borderWidth: 1,
      cornerRadius: 4,
      padding: 8
    },
    
    textFields: {
      fontSize: 12,
      fontColor: '#000000',
      backgroundColor: '#FFFFFF',
      borderColor: '#CCCCCC',
      borderWidth: 1,
      cornerRadius: 2,
      padding: 4
    },

    checkboxes: {
      size: 16,
      checkColor: '#007BFF',
      borderColor: '#CCCCCC',
      borderWidth: 1
    },

    links: {
      color: '#007BFF',
      underline: true,
      fontSize: 12
    }
  },

  media: {
    supportedVideo: ['.mp4', '.webm', '.mov'],
    supportedAudio: ['.mp3', '.wav', '.m4a'],
    supportedImages: ['.jpg', '.jpeg', '.png', '.gif'],
    
    video: {
      width: 400,
      height: 300,
      thumbnailText: 'Click to play video'
    },
    
    audio: {
      width: 300,
      height: 50,
      thumbnailText: 'Click to play audio'
    },

    maxFileSize: 50 * 1024 * 1024,
    embedAsAttachment: true,
    createThumbnails: true
  },

  output: {
    filename: 'interactive-document.pdf',
    directory: './output',
    overwrite: true,
    compress: true,
    preserveMetadata: true
  },

  validation: {
    strictMode: true,
    warnOnUnsupported: true,
    validateMediaFiles: true,
    maxPages: 1000,
    maxInteractiveElements: 500
  },

  actions: {
    enableJavaScript: true,
    maxActionLength: 10000,
    allowedMethods: [
      'this.print',
      'this.resetForm',
      'this.submitForm',
      'app.alert',
      'app.response'
    ]
  }
};

export const PAGE_SIZES = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [420.94, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
  Tabloid: [792, 1224]
};

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

window.export function validateConfig(userConfig = {}) {
  const config = mergeDeep(DEFAULT_CONFIG, userConfig);
  
  if (typeof config.page.size === 'string') {
    if (!PAGE_SIZES[config.page.size.toUpperCase()]) {
      throw new Error(\`Unsupported page size: \${config.page.size}\`);
    }
  } else if (Array.isArray(config.page.size)) {
    if (config.page.size.length !== 2 || 
        !config.page.size.every(dim => typeof dim === 'number' && dim > 0)) {
      throw new Error('Custom page size must be [width, height] with positive numbers');
    }
  }

  const margins = config.page.margins;
  if (margins.top < 0 || margins.bottom < 0 || margins.left < 0 || margins.right < 0) {
    throw new Error('Page margins must be non-negative');
  }

  if (config.media.maxFileSize <= 0) {
    throw new Error('Media file size limit must be positive');
  }

  if (config.validation.maxPages <= 0 || config.validation.maxInteractiveElements <= 0) {
    throw new Error('Page and element limits must be positive');
  }

  return config;
}

window.function mergeDeep(target, source) {
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

window.export function getPageDimensions(size, orientation = 'portrait') {
  let dimensions;
  
  if (typeof size === 'string') {
    dimensions = PAGE_SIZES[size.toUpperCase()];
    if (!dimensions) {
      throw new Error(\`Unknown page size: \${size}\`);
    }
  } else if (Array.isArray(size)) {
    dimensions = [...size];
  } else {
    throw new Error('Page size must be string or array');
  }
  
  if (orientation === 'landscape') {
    return [dimensions[1], dimensions[0]];
  }
  
  return dimensions;
}`;

    // Create and download file
    const blob = new Blob([configContent], { type: 'text/javascript' });
    const url_download = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url_download;
    a.download = 'config.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url_download);
    
    showStatus('✅ config.js downloaded! Replace your existing file and refresh.', 'success');
    
    setTimeout(() => {
        closeSupabaseModal();
    }, 2000);
});

