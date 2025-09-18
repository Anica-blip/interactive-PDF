// Diagnostic version - no imports to test basic function execution
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  if (pathname === '/api/' && req.method === 'GET') {
    return res.json({ 
      status: 'active', 
      message: 'Interactive PDF Creator API - Diagnostic Mode',
      timestamp: new Date(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        envVars: {
          hasWasabiKey: !!process.env.WASABI_ACCESS_KEY,
          hasWasabiSecret: !!process.env.WASABI_SECRET_KEY,
          hasWasabiBucket: !!process.env.WASABI_PUBLIC_BUCKET
        }
      }
    });
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return res.json({
      status: 'healthy - diagnostic mode',
      timestamp: new Date(),
      message: 'Basic function execution working'
    });
  }

  if (pathname === '/api/test-imports' && req.method === 'GET') {
    try {
      // Test if we can import the PDF generator
      const { PDFGenerator } = await import('../pdf-generator.js');
      return res.json({
        status: 'success',
        message: 'PDF imports working',
        pdfGenerator: !!PDFGenerator
      });
    } catch (error) {
      return res.json({
        status: 'import_failed',
        error: error.message,
        stack: error.stack
      });
    }
  }

  res.status(404).json({ 
    error: 'Not found',
    availableEndpoints: ['/api/', '/api/health', '/api/test-imports']
  });
}
