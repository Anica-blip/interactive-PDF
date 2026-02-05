/**
 * PDF Storage Manager - Complete cloud storage and access system
 * Handles: File naming, Cloudflare R2 upload, URL generation, organization
 * This will run as is - complete storage solution for social media sharing
 */

import fs from 'fs-extra';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export class PDFStorageManager {
  constructor(config = {}) {
    this.config = {
      r2: {
        endpoint: config.r2?.endpoint || process.env.R2_ENDPOINT || 'https://<account-id>.r2.cloudflarestorage.com',
        region: config.r2?.region || 'auto',
        accessKeyId: config.r2?.accessKeyId || process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: config.r2?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY,
        bucketName: config.r2?.bucketName || process.env.R2_BUCKET_NAME || '3c-library-files',
        publicUrl: config.r2?.publicUrl || process.env.R2_PUBLIC_URL || 'https://files.3c-public-library.org'
      },

      organization: {
        useTimestamps: config.organization?.useTimestamps ?? true,
        useFolders: config.organization?.useFolders ?? true,
        folderPattern: config.organization?.folderPattern || 'YYYY/MM',
        namePattern: config.organization?.namePattern || '{original}-interactive-{timestamp}',
        maxFileAge: config.organization?.maxFileAge || null
      },

      access: {
        makePublic: config.access?.makePublic ?? true,
        customDomain: config.access?.customDomain || null,
        urlExpiration: config.access?.urlExpiration || null
      }
    };

    this.s3Client = new S3Client({
      endpoint: this.config.r2.endpoint,
      region: this.config.r2.region,
      credentials: {
        accessKeyId: this.config.r2.accessKeyId,
        secretAccessKey: this.config.r2.secretAccessKey
      },
      forcePathStyle: true
    });

    this.uploadLog = [];
  }

  async fetchFromR2(cloudFilename) {
    try {
      const getParams = {
        Bucket: this.config.r2.bucketName,
        Key: cloudFilename
      };
      
      const command = new GetObjectCommand(getParams);
      const result = await this.s3Client.send(command);
      
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to fetch from R2: ${error.message}`);
    }
  }

  async processAndStore(generator, originalFilename, options = {}) {
    try {
      console.log(`Processing PDF for cloud storage: ${originalFilename}`);

      const tempResult = await generator.generateBuffer();
      const cloudFilename = this.generateCloudFilename(originalFilename, options);
      const uploadResult = await this.uploadToR2(tempResult, cloudFilename, options);
      const accessUrls = this.generateAccessUrls(cloudFilename);
      const logEntry = this.logUpload(originalFilename, cloudFilename, uploadResult, accessUrls);
      
      console.log(`PDF stored and accessible:`);
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

  async uploadExistingPdf(localPdfPath, originalFilename, options = {}) {
    try {
      if (!await fs.pathExists(localPdfPath)) {
        throw new Error(`PDF file not found: ${localPdfPath}`);
      }

      const pdfBuffer = await fs.readFile(localPdfPath);
      const cloudFilename = this.generateCloudFilename(originalFilename, options);
      
      const uploadResult = await this.uploadToR2(pdfBuffer, cloudFilename, options);
      const accessUrls = this.generateAccessUrls(cloudFilename);
      const logEntry = this.logUpload(originalFilename, cloudFilename, uploadResult, accessUrls);

      if (options.deleteLocal) {
        await fs.remove(localPdfPath);
        console.log(`Local file deleted: ${localPdfPath}`);
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

  generateCloudFilename(originalFilename, options = {}) {
    const timestamp = options.timestamp || Date.now();
    const date = new Date(timestamp);
    
    const baseName = path.basename(originalFilename, '.pdf');
    
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

    let filename = this.config.organization.namePattern;
    filename = filename.replace('{original}', baseName);
    filename = filename.replace('{timestamp}', timestamp);
    filename = filename.replace('{date}', date.toISOString().split('T')[0]);
    filename = filename.replace('{random}', crypto.randomBytes(4).toString('hex'));
    
    if (options.ensureUnique) {
      const uniqueId = crypto.randomBytes(3).toString('hex');
      filename = `${filename}-${uniqueId}`;
    }
    
    return `${folderPath}${filename}.pdf`;
  }

  async uploadToR2(pdfBuffer, cloudFilename, options = {}) {
    try {
      const uploadParams = {
        Bucket: this.config.r2.bucketName,
        Key: cloudFilename,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: options.forceDownload ? 'attachment' : 'inline'
      };

      // R2 doesn't use ACL for public access - it's configured at bucket level
      // Public access is controlled via bucket settings in Cloudflare dashboard

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
      throw new Error(`R2 upload failed: ${error.message}`);
    }
  }

  generateAccessUrls(cloudFilename) {
    const publicUrl = this.config.r2.publicUrl;
    
    // Cloudflare R2 public URL (via custom domain)
    const directUrl = `${publicUrl}/${cloudFilename}`;
    
    const customUrl = this.config.access.customDomain ? 
      `https://${this.config.access.customDomain}/${cloudFilename}` : directUrl;
    
    const browserUrl = `${directUrl}?response-content-disposition=inline&response-content-type=application/pdf`;
    
    const shareUrl = customUrl;
    
    return {
      directUrl,
      customUrl,
      browserUrl,
      shareUrl
    };
  }

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
    this.saveUploadLog();
    
    return logEntry;
  }

  async saveUploadLog() {
    try {
      await fs.ensureDir('./storage-logs');
      await fs.writeJson('./storage-logs/upload-log.json', this.uploadLog, { spaces: 2 });
    } catch (error) {
      console.warn(`Could not save upload log: ${error.message}`);
    }
  }

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

  async deletePdf(cloudFilename) {
    try {
      const deleteParams = {
        Bucket: this.config.r2.bucketName,
        Key: cloudFilename
      };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      
      this.uploadLog = this.uploadLog.filter(entry => entry.cloudFilename !== cloudFilename);
      await this.saveUploadLog();
      
      console.log(`Deleted from R2: ${cloudFilename}`);
      return true;

    } catch (error) {
      console.error(`Failed to delete ${cloudFilename}: ${error.message}`);
      return false;
    }
  }

  async testConnection() {
    try {
      const testParams = {
        Bucket: this.config.r2.bucketName,
        MaxKeys: 1
      };

      await this.s3Client.send(new ListObjectsCommand(testParams));
      console.log('Cloudflare R2 connection successful');
      return true;

    } catch (error) {
      console.error(`R2 connection failed: ${error.message}`);
      return false;
    }
  }
}

export function createR2Config() {
  return {
    r2: {
      endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'YOUR_R2_ACCESS_KEY_ID',
      secretAccessKey: 'YOUR_R2_SECRET_ACCESS_KEY',
      bucketName: '3c-library-files',
      publicUrl: 'https://files.3c-public-library.org'
    },
    
    organization: {
      useTimestamps: true,
      useFolders: true,
      folderPattern: 'YYYY/MM',
      namePattern: '{original}-interactive-{timestamp}'
    },
    
    access: {
      makePublic: true,
      customDomain: 'files.3c-public-library.org'
    }
  };
}
