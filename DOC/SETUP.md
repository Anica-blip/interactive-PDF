# Setup Guide - Interactive PDF Creator

This guide will help you set up and run the Interactive PDF Creator web application.

## 📋 Prerequisites

### Required Software

1. **Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

## 🚀 Installation Steps

### Step 1: Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS (using Homebrew):**
```bash
brew install node
```

**Windows:**
- Download installer from https://nodejs.org/
- Run the installer and follow the prompts

**Verify Installation:**
```bash
node --version  # Should show v16.x.x or higher
npm --version   # Should show 8.x.x or higher
```

### Step 2: Install Project Dependencies

Navigate to the project directory and install dependencies:

```bash
cd /home/acer/CascadeProjects/interactive-PDF-main
npm install
```

This will install:
- `pdf-lib` - PDF creation library
- `fs-extra` - File system utilities
- `@aws-sdk/client-s3` - Cloud storage (optional)

### Step 3: Configure Environment (Optional)

If you want to use Wasabi cloud storage:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Edit the `.env` file with your credentials:
```env
WASABI_ACCESS_KEY=your_access_key_here
WASABI_SECRET_KEY=your_secret_key_here
WASABI_PUBLIC_BUCKET=your_bucket_name
WASABI_DEFAULT_FOLDER=interactive-pdfs
```

**Note:** Cloud storage is optional. The app works without it using in-memory storage.

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
🚀 Interactive PDF Creator Server
================================
📍 Local:    http://localhost:3000
🔧 API:      http://localhost:3000/api
💚 Health:   http://localhost:3000/api/health

Press Ctrl+C to stop
```

### Step 5: Open in Browser

Open your web browser and navigate to:
```
http://localhost:3000
```

You should see the Interactive PDF Creator web interface!

## 🧪 Testing the Installation

### Test 1: Health Check

Open a new terminal and run:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "API is working",
  "services": {
    "api": "operational",
    "wasabi": "not configured",
    "pdfsInMemory": 0
  }
}
```

### Test 2: Generate a Test PDF

```bash
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test PDF",
    "author": "Tester",
    "pageSize": "A4",
    "orientation": "portrait",
    "font": "Helvetica",
    "elements": [
      {
        "type": "text",
        "content": "Hello World!",
        "x": 50,
        "y": 700,
        "size": 24
      }
    ]
  }'
```

You should get a JSON response with a PDF ID and URLs.

### Test 3: Use the Web Interface

1. Open http://localhost:3000 in your browser
2. Click on "Interactive Form" template
3. Click "Generate PDF"
4. You should see success message and download links

## 📁 Project Structure

After installation, your project should look like this:

```
interactive-PDF-main/
├── node_modules/          # Dependencies (created after npm install)
├── public/                # Frontend files
│   ├── index.html        # Web interface
│   └── app.js            # Frontend logic
├── api/                   # Backend API
│   └── index.js          # API handler
├── pdf-generator.js       # Core PDF library
├── pdf-creator.js         # PDF creation
├── interactive-elements.js # Form elements
├── media-embedder.js      # Media handling
├── dev-server.js          # Development server
├── vercel.json           # Vercel config
├── package.json          # Dependencies
├── .env.example          # Environment template
├── .env                  # Your environment (create this)
├── README.md             # Library docs
├── README-WEB.md         # Web app docs
├── DEPLOYMENT.md         # Deployment guide
└── SETUP.md              # This file
```

## 🔧 Troubleshooting

### Issue: "npm: command not found"

**Solution:** Node.js is not installed. Follow Step 1 above.

### Issue: "Cannot find module 'pdf-lib'"

**Solution:** Dependencies not installed. Run:
```bash
npm install
```

### Issue: "Port 3000 is already in use"

**Solution:** Another service is using port 3000. Either:
- Stop the other service
- Or use a different port:
```bash
PORT=3001 npm start
```

### Issue: "CORS error" in browser

**Solution:** Make sure you're accessing via `http://localhost:3000` not `file://`

### Issue: PDF generation fails

**Solution:** Check the browser console and server logs for errors. Common causes:
- Invalid element configuration
- Missing required fields
- Server memory issues

### Issue: Wasabi upload fails

**Solution:** 
- Verify credentials in `.env`
- Check bucket permissions
- The app will still work without Wasabi (in-memory storage)

## 🚀 Next Steps

### For Development
- Read [README-WEB.md](README-WEB.md) for web interface usage
- Read [README.md](README.md) for library API usage
- Explore the templates and customize them

### For Deployment
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options
- Choose a platform (Vercel, Netlify, Railway, etc.)
- Configure environment variables on your platform

### For Customization
- Modify `public/index.html` for UI changes
- Edit `public/app.js` for frontend logic
- Update `api/index.js` for backend changes
- Customize templates in `app.js`

## 📚 Additional Resources

- **PDF-lib Documentation:** https://pdf-lib.js.org/
- **Node.js Documentation:** https://nodejs.org/docs/
- **Vercel Documentation:** https://vercel.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

## 💡 Tips

1. **Development Mode:** Use `npm run dev` for development
2. **Production Mode:** Set `NODE_ENV=production` for production
3. **Logs:** Check server console for detailed logs
4. **Browser DevTools:** Use F12 to debug frontend issues
5. **API Testing:** Use Postman or curl for API testing

## 🆘 Getting Help

If you encounter issues:

1. Check this setup guide
2. Review error messages carefully
3. Check browser console (F12)
4. Check server logs
5. Search for similar issues online
6. Open an issue on GitHub

## ✅ Verification Checklist

Before deploying, verify:

- [ ] Node.js 16+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Server starts without errors (`npm start`)
- [ ] Health check passes
- [ ] Web interface loads
- [ ] Can generate test PDF
- [ ] Environment variables configured (if using Wasabi)
- [ ] All tests pass

## 🎉 Success!

If all tests pass, you're ready to:
- Use the web interface locally
- Deploy to production
- Customize for your needs
- Share with your team

Happy PDF creating! 🚀
