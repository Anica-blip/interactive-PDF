import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import handler from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Handle API routes
  if (url.pathname.startsWith('/api')) {
    return handler(req, res);
  }
  
  // Serve static files from public directory
  try {
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    filePath = join(__dirname, 'public', filePath);
    
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    const content = await readFile(filePath);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, serve index.html for SPA routing
      try {
        const indexPath = join(__dirname, 'public', 'index.html');
        const content = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Interactive PDF Creator Server');
  console.log('================================');
  console.log(`📍 Local:    http://localhost:${PORT}`);
  console.log(`🔧 API:      http://localhost:${PORT}/api`);
  console.log(`💚 Health:   http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
