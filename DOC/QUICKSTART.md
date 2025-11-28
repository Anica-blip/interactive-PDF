# 🚀 Quick Start Guide

Get your Interactive PDF Creator running in 5 minutes!

## ⚡ Super Quick Start

```bash
# 1. Install Node.js (if not installed)
# Visit: https://nodejs.org/

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open browser
# Visit: http://localhost:3000
```

That's it! 🎉

## 🎯 What You Get

### Web Interface
- Beautiful, modern UI
- No coding required
- Template library
- Live preview
- One-click PDF generation

### Three Ways to Use

#### 1️⃣ Web Interface (Easiest)
- Open http://localhost:3000
- Click a template
- Customize elements
- Generate PDF
- Download or view in browser

#### 2️⃣ API Calls
```bash
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"title":"My PDF","elements":[...]}'
```

#### 3️⃣ JavaScript Library
```javascript
import { PDFGenerator } from './pdf-generator.js';

const generator = new PDFGenerator();
await generator.initialize()
  .addPage()
  .addText('Hello World!')
  .generate('./output.pdf');
```

## 📦 What Was Changed

### ✅ Added
- **Frontend:** Modern web interface (`public/index.html`, `public/app.js`)
- **Dev Server:** Local development server (`dev-server.js`)
- **API Handler:** Serverless function (`api/index.js`)
- **Vercel Config:** Ready for deployment (`vercel.json`)
- **Documentation:** Setup, deployment, and usage guides

### 🔄 Modified
- **package.json:** Updated scripts for web app
- **API:** Enhanced to handle JSON requests and serve PDFs

### ✨ Preserved
- **Core Library:** All original PDF generation code intact
- **Examples:** Original examples still work
- **Functionality:** Generate PDFs that open in browsers

## 🌐 Deployment Options

### Vercel (Recommended - 2 minutes)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Railway
```bash
npm install -g @railway/cli
railway up
```

### Self-Hosted
```bash
# Already running with npm start!
# Add nginx/apache for production
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides.

## 🎨 Templates Included

### Interactive Form
- Text fields
- Email validation
- Submit button
- Professional layout

### Document
- Formatted text
- Headers
- Professional typography

### Multimedia
- Media placeholders
- Image support
- Video/audio embedding

## 🔧 Configuration

### Without Cloud Storage (Default)
- No configuration needed
- PDFs served via API
- Works immediately

### With Cloud Storage (Optional)
```bash
cp .env.example .env
# Edit .env with your Wasabi credentials
```

Benefits:
- Permanent storage
- Public URLs
- Better for production

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Detailed installation guide
- **[README-WEB.md](README-WEB.md)** - Web interface documentation
- **[README.md](README.md)** - Library API documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Platform deployment guides

## 🧪 Quick Test

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```

### Test 2: Generate PDF
```bash
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "elements": [
      {"type": "text", "content": "Hello!", "x": 50, "y": 700}
    ]
  }'
```

### Test 3: Web Interface
1. Open http://localhost:3000
2. Click "Interactive Form"
3. Click "Generate PDF"
4. Success! ✅

## 💡 Key Features

### For Users
- ✅ No coding required
- ✅ Beautiful interface
- ✅ Instant preview
- ✅ One-click generation
- ✅ Browser-compatible PDFs

### For Developers
- ✅ REST API
- ✅ JavaScript library
- ✅ Serverless ready
- ✅ Extensible
- ✅ Well documented

### For Deployment
- ✅ Vercel compatible
- ✅ Netlify compatible
- ✅ Self-hostable
- ✅ Docker ready
- ✅ Scalable

## 🎯 Use Cases

- **Forms:** Registration, surveys, applications
- **Documents:** Letters, reports, certificates
- **Invoices:** Professional billing documents
- **Certificates:** Awards, completion certificates
- **Brochures:** Marketing materials
- **Presentations:** Interactive slideshows

## 🔒 Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure cloud storage (optional)
- [ ] Add rate limiting
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test all features
- [ ] Review security settings

## 🆘 Common Issues

### "npm: command not found"
➡️ Install Node.js from https://nodejs.org/

### "Port 3000 in use"
➡️ Use different port: `PORT=3001 npm start`

### "Cannot find module"
➡️ Run: `npm install`

### "PDF not found"
➡️ PDFs in memory expire on restart. Use Wasabi for persistence.

## 🎉 You're Ready!

Your Interactive PDF Creator is now:
- ✅ Installed
- ✅ Running locally
- ✅ Ready to use
- ✅ Ready to deploy

**Next Steps:**
1. Try the web interface
2. Generate your first PDF
3. Customize templates
4. Deploy to production

**Need Help?**
- Check [SETUP.md](SETUP.md) for detailed setup
- Read [README-WEB.md](README-WEB.md) for features
- See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment

---

**Happy PDF Creating! 🚀**

Start now: `npm start` → http://localhost:3000
