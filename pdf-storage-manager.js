/**
 * PDF Storage Manager - Complete cloud storage and access system
 * Handles: File naming, Wasabi upload, URL generation, organization
 * This will run as is - complete storage solution for social media sharing
 */

import fs from 'fs-extra';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export class PDFStorageManager {
  constructor(config = {}) {
    this.config = {
      // Wasabi Configuration
      wasabi: {
        endpoint: config.wasabi?.endpoint || 'https://s3.wasabisys.com',
        region: config.wasabi?.region || 'us-east-1',
        accessKeyId: config.wasabi?.accessKeyId || process.env.WASABI_ACCESS_KEY,
        secretAccessKey: config.wasabi?.secretAccessKey || process.env.WASABI_SECRET_KEY,
        bucketName: config.wasabi?.bucketName || process.env.WASABI_BUCKET_NAME
      },

      // File Organization
      organization: {
        useTimestamps: config.organization?.useTimestamps ?? true,
        useFolders: config.organization?.useFolders ?? true,
        folderPattern: config.organization?.folderPattern || 'YYYY/MM',
        namePattern: config.organization?.namePattern || '{original}-interactive-{timestamp}',
        maxFileAge: config.organization?.maxFileAge || null // null = never delete
      },

      // Access Control
      access: {
        makePublic: config.access?.makePublic ?? true,
        customDomain: config.access?.customDomain || null, // e.g., 'pdfs.yoursite.com'
        urlExpiration: config.access?.urlExpiration || null // null = permanent URLs
      }
    };

    // Initialize Wasabi client
    this.s3Client = new S3Client({
      endpoint: this.config.wasabi.endpoint,
      region: this.config.wasabi.region,
      credentials: {
        accessKeyId: this.config.wasabi.accessKeyId,
        secretAccessKey: this.config.wasabi.secretAccessKey
      },
      forcePathStyle: true
    });

    this.uploadLog = [];
  }

  /**
   * Complete workflow: Generate PDF, upload to Wasabi, return shareable URL
   * @param {Object} generator - PDFGenerator instance
   * @param {string} originalFilename - Original Canva PDF filename
   * @param {Object} options - Storage options
   * @returns {Promise<Object>} - Complete upload result with URLs
   */
  async processAndStore(generator, originalFilename, options = {}) {
    try {
      console.log(`🔄 Processing PDF for cloud storage: ${originalFilename}`);

      // Generate the enhanced PDF
      const tempResult = await generator.generateBuffer();
      
      // Create systematic filename
      const cloudFilename = this.generateCloudFilename(originalFilename, options);
      
      // Upload to Wasabi
      const uploadResult = await this.uploadToWasabi(tempResult, cloudFilename, options);
      
      // Generate access URLs
      const accessUrls = this.generateAccessUrls(cloudFilename);
      
      // Log the upload
      const logEntry = this.logUpload(originalFilename, cloudFilename, uploadResult, accessUrls);
      
      console.log(`✅ PDF stored and accessible:`);
      console.log(`   Direct URL: ${accessUrls.directUrl}`);
      console.log(`   Browser URL: ${accessUrls.browserUrl}`);
      console.log(`   Share URL: ${accessUrls.shareUrl}`);

      return {
        success: true,
        originalFilename,
        cloudFilename,
        uploadResult,
        accessUrls,
        logEntry,
        socialMediaReady: true
      };

    } catch (error) {
      throw new Error(`PDF processing and storage failed: ${error.message}`);
    }
  }

  /**
   * Upload PDF directly to Wasabi from local file
   * @param {string} localPdfPath - Path to generated PDF
   * @param {string} originalFilename - Original filename for naming
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadExistingPdf(localPdfPath, originalFilename, options = {}) {
    try {
      if (!await fs.pathExists(localPdfPath)) {
        throw new Error(`PDF file not found: ${localPdfPath}`);
      }

      const pdfBuffer = await fs.readFile(localPdfPath);
      const cloudFilename = this.generateCloudFilename(originalFilename, options);
      
      const uploadResult = await this.uploadToWasabi(pdfBuffer, cloudFilename, options);
      const accessUrls = this.generateAccessUrls(cloudFilename);
      const logEntry = this.logUpload(originalFilename, cloudFilename, uploadResult, accessUrls);

      // Optionally delete local file after upload
      if (options.deleteLocal) {
        await fs.remove(localPdfPath);
        console.log(`🗑️  Local file deleted: ${localPdfPath}`);
      }

      return {
        success: true,
        originalFilename,
        cloudFilename,
        uploadResult,
        accessUrls,
        logEntry
      };

    } catch (error) {
      throw new Error(`PDF upload failed: ${error.message}`);
    }
  }

  /**
   * Generate systematic cloud filename
   * @param {string} originalFilename - Original PDF filename
   * @param {Object} options - Naming options
   * @returns {string} - Cloud storage filename
   * @private
   */
  generateCloudFilename(originalFilename, options = {}) {
    const timestamp = options.timestamp || Date.now();
    const date = new Date(timestamp);
    
    // Extract base name without extension
    const baseName = path.basename(originalFilename, '.pdf');
    
    // Generate folder structure if enabled
    let folderPath = '';
    if (this.config.organization.useFolders) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      switch (this.config.organization.folderPattern) {
        case 'YYYY/MM':
          folderPath = `${year}/${month}/`;
          break;
        case 'YYYY/MM/DD':
          folderPath = `${year}/${month}/${day}/`;
          break;
        case 'YYYY':
          folderPath = `${year}/`;
          break;
        default:
          folderPath = '';
      }
    }

    // Generate filename based on pattern
    let filename = this.config.organization.namePattern;
    filename = filename.replace('{original}', baseName);
    filename = filename.replace('{timestamp}', timestamp);
    filename = filename.replace('{date}', date.toISOString().split('T')[0]);
    filename = filename.replace('{random}', crypto.randomBytes(4).toString('hex'));
    
    // Add unique ID if not already unique
    if (options.ensureUnique) {
      const uniqueId = crypto.randomBytes(3).toString('hex');
      filename = `${filename}-${uniqueId}`;
    }
    
    return `${folderPath}${filename}.pdf`;
  }

  /**
   * Upload PDF buffer to Wasabi
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} cloudFilename - Filename in cloud storage
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   * @private
   */
  async uploadToWasabi(pdfBuffer, cloudFilename, options = {}) {
    try {
      const uploadParams = {
        Bucket: this.config.wasabi.bucketName,
        Key: cloudFilename,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: options.forceDownload ? 'attachment' : 'inline'
      };

      // Set public access if configured
      if (this.config.access.makePublic) {
        uploadParams.ACL = 'public-read';
      }

      // Add metadata
      uploadParams.Metadata = {
        'upload-timestamp': Date.now().toString(),
        'original-filename': options.originalFilename || 'unknown',
        'generated-by': 'interactive-pdf-creator',
        'version': '1.0.0'
      };

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3Client.send(command);

      return {
        success: true,
        cloudFilename,
        size: pdfBuffer.length,
        uploadTime: new Date(),
        etag: result.ETag,
        metadata: uploadParams.Metadata
      };

    } catch (error) {
      throw new Error(`Wasabi upload failed: ${error.message}`);
    }
  }

  /**
   * Generate all access URLs for a PDF
   * @param {string} cloudFilename - Filename in cloud storage
   * @returns {Object} - Access URLs
   * @private
   */
  generateAccessUrls(cloudFilename) {
    const bucketName = this.config.wasabi.bucketName;
    const endpoint = this.config.wasabi.endpoint;
    
    // Direct Wasabi URL
    const directUrl = `${endpoint}/${bucketName}/${cloudFilename}`;
    
    // Custom domain URL if configured
    const customUrl = this.config.access.customDomain ? 
      `https://${this.config.access.customDomain}/${cloudFilename}` : directUrl;
    
    // Browser-optimized URL (forces inline viewing)
    const browserUrl = `${directUrl}?response-content-disposition=inline&response-content-type=application/pdf`;
    
    // Social media friendly URL
    const shareUrl = customUrl;
    
    return {
      directUrl,
      customUrl,
      browserUrl,
      shareUrl
    };
  }

  /**
   * Log upload for tracking and management
   * @param {string} originalFilename - Original filename
   * @param {string} cloudFilename - Cloud filename
   * @param {Object} uploadResult - Upload result
   * @param {Object} accessUrls - Access URLs
   * @returns {Object} - Log entry
   * @private
   */
  logUpload(originalFilename, cloudFilename, uploadResult, accessUrls) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      originalFilename,
      cloudFilename,
      size: uploadResult.size,
      accessUrls,
      status: 'uploaded'
    };

    this.uploadLog.push(logEntry);
    
    // Save log to file for persistence
    this.saveUploadLog();
    
    return logEntry;
  }

  /**
   * Save upload log to file
   * @private
   */
  async saveUploadLog() {
    try {
      await fs.ensureDir('./storage-logs');
      await fs.writeJson('./storage-logs/upload-log.json', this.uploadLog, { spaces: 2 });
    } catch (error) {
      console.warn(`Could not save upload log: ${error.message}`);
    }
  }

  /**
   * Load existing upload log
   */
  async loadUploadLog() {
    try {
      if (await fs.pathExists('./storage-logs/upload-log.json')) {
        this.uploadLog = await fs.readJson('./storage-logs/upload-log.json');
      }
    } catch (error) {
      console.warn(`Could not load upload log: ${error.message}`);
      this.uploadLog = [];
    }
  }

  /**
   * Get all uploaded PDFs with their URLs
   * @returns {Array} - List of uploaded PDFs
   */
  getUploadedPdfs() {
    return this.uploadLog.map(entry => ({
      id: entry.id,
      originalName: entry.originalFilename,
      cloudName: entry.cloudFilename,
      uploadDate: entry.timestamp,
      shareUrl: entry.accessUrls.shareUrl,
      browserUrl: entry.accessUrls.browserUrl,
      size: entry.size
    }));
  }

  /**
   * Delete PDF from cloud storage
   * @param {string} cloudFilename - Filename to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deletePdf(cloudFilename) {
    try {
      const deleteParams = {
        Bucket: this.config.wasabi.bucketName,
        Key: cloudFilename
      };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      
      // Remove from log
      this.uploadLog = this.uploadLog.filter(entry => entry.cloudFilename !== cloudFilename);
      await this.saveUploadLog();
      
      console.log(`🗑️  Deleted from cloud: ${cloudFilename}`);
      return true;

    } catch (error) {
      console.error(`Failed to delete ${cloudFilename}: ${error.message}`);
      return false;
    }
  }

  /**
   * Test Wasabi connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const testParams = {
        Bucket: this.config.wasabi.bucketName,
        MaxKeys: 1
      };

      await this.s3Client.send(new ListObjectsCommand(testParams));
      console.log('✅ Wasabi connection successful');
      return true;

    } catch (error) {
      console.error(`❌ Wasabi connection failed: ${error.message}`);
      return false;
    }
  }
}

/**
 * Configuration helper for Wasabi setup
 * @returns {Object} - Configuration template
 */
export function createWasabiConfig() {
  return {
    wasabi: {
      endpoint: 'https://s3.wasabisys.com',
      region: 'us-east-1',
      accessKeyId: 'YOUR_WASABI_ACCESS_KEY',
      secretAccessKey: 'YOUR_WASABI_SECRET_KEY',
      bucketName: 'your-pdf-bucket'
    },
    
    organization: {
      useTimestamps: true,
      useFolders: true,
      folderPattern: 'YYYY/MM',
      namePattern: '{original}-interactive-{timestamp}'
    },
    
    access: {
      makePublic: true,
      customDomain: 'pdfs.yoursite.com' // Optional custom domain
    }
  };
}
