/**
 * Configuration settings for Interactive PDF creation
 * NON-MODULE VERSION - Works with regular <script> tag
 */

// Environment configuration
window.ENV_CONFIG = {
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
      : 'https://cgxjqsbrditbteqhdyus.supabase.co',
    anonKey: typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY 
      ? process.env.SUPABASE_ANON_KEY 
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4',
    serviceKey: typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_KEY 
      ? process.env.SUPABASE_SERVICE_KEY 
      : ''
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

window.DEFAULT_CONFIG = {
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

window.PAGE_SIZES = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [420.94, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
  Tabloid: [792, 1224]
};

window.FONTS = {
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

window.COLORS = {
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

console.log('✅ Config loaded:', window.ENV_CONFIG);
