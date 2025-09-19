import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { randomUUID } from 'crypto';

const wasabiConfig = {
  endpoint: 'https://s3.eu-west-1.wasabisys.com',
  region: 'eu-west-1',
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
  bucketName: process.env.WASABI_PUBLIC_BUCKET || '3c-public-content',
  defaultFolder: process.env.WASABI_DEFAULT_FOLDER || 'interactive-pdfs'
};

const s3Client = new S3Client({
  endpoint: wasabiConfig.endpoint,
  region: wasabiConfig.region,
  credentials: {
    accessKeyId: wasabiConfig.accessKeyId,
    secretAccessKey: wasabiConfig.secretAccessKey
  },
  forcePathStyle: true
});

const pdfStore = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  if (pathname === '/api/health' && req.method === 'GET') {
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'API is working'
    });
  }

  return res.status(404).json({ error: 'Not found' });
}
