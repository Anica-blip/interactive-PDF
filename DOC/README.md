# 🎨 Interactive PDF Creator - Multi-Page Web App

A powerful web application for creating interactive, multi-page PDFs with embedded multimedia elements, buttons, hotspots, and clickable links. Perfect for creating engaging course materials, interactive brochures, product catalogs, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

### 🎯 Core Features
- **Multi-Page Support** - Create PDFs with unlimited pages (tested up to 100+)
- **PNG/JPG Backgrounds** - Upload custom backgrounds for each page
- **Visual Editor** - Drag-and-drop positioning with real-time preview
- **Asset Library** - Manage all your media in one place
- **Resize Elements** - Drag corner handles to resize any element
- **Page Navigation** - Easy thumbnail navigation between pages

### 🎬 Interactive Elements

**Embedded Media Mode** (Adobe Acrobat):
- **Videos** - Play inside PDF with RichMedia annotations
- **Audio** - Play inside PDF with controls
- **GIFs** - Embed animated images directly

**Link Mode** (Universal):
- **Buttons** - Styled clickable buttons with custom text
- **Hotspots** - Invisible clickable areas (perfect for images)
- **Video Links** - YouTube, Vimeo, direct URLs
- **Audio Links** - MP3, streaming audio
- **Image Links** - GIFs, images, any URL

### 💾 Storage & Deployment
- **Wasabi Integration** - Store PDFs and media files
- **Serverless Ready** - Deploy to Railway, Vercel, Render
- **Small File Sizes** - PDFs store URLs, not files
- **Cloud URLs** - Permanent shareable links

## 🚀 Quick Start

### Installation

```bash
# Clone or download the project
cd interactive-PDF-main

# Install dependencies
npm install

# Start the development server
npm start
```

### Open in Browser

```
http://localhost:3000
```

## 📖 Usage

### 1. Create Your First PDF

1. **Add a Page** - Click "Add Page" button
2. **Upload Background** - Click "Upload PNG/JPG" and select your Canva export
3. **Add Elements** - Use the Asset Library to add videos, buttons, links
4. **Position & Resize** - Drag elements to position, drag corners to resize
5. **Generate PDF** - Click "Generate PDF" button
6. **Download** - Click "Download PDF" or "Open in Browser"

### 2. Using Embedded Media

**Toggle Switch** (top of Asset Library):
- **Left (Link)** - Opens in browser, works everywhere
- **Right (Embed)** - Plays in Adobe Acrobat Reader (free)

**For Training/Courses:**
```
1. Toggle to Embedded
2. Add video with direct MP4 URL
3. Add to page
4. Generate PDF
5. Users open in Adobe Acrobat → Video plays inside PDF!
```

**For Public/Marketing:**
```
1. Toggle to Link
2. Add YouTube video URL
3. Add to page
4. Generate PDF
5. Works in any viewer → Opens in browser
```

### 3. Buttons & Hotspots

**Add Button:**
- Click "Add Button"
- Enter URL and button text
- Add to page, position, resize
- Shows as styled button in PDF

**Add Hotspot:**
- Click "Add Hotspot (Invisible)"
- Enter URL and name
- Position over image/area
- Invisible in PDF but clickable!

## 📁 Project Structure

```
interactive-PDF-main/
├── public/
│   ├── index.html          # Main web interface
│   └── app.js              # Frontend logic
├── api/
│   └── index.js            # PDF generation API
├── dev-server.js           # Local development server
├── config.js               # Wasabi configuration
├── package.json            # Dependencies
├── vercel.json             # Vercel deployment config
└── docs/
    ├── USER-GUIDE-V2.md           # Complete user guide
    ├── EMBEDDED-MEDIA-GUIDE.md    # Embedded media docs
    ├── BUTTON-HOTSPOT-GUIDE.md    # Button/hotspot guide
    ├── TESTING-CHECKLIST.md       # Testing guide
    ├── QUICKSTART.md              # Quick setup
    ├── SETUP.md                   # Detailed setup
    └── DEPLOYMENT.md              # Deployment guide
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Wasabi S3-Compatible Storage (Optional)
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_PUBLIC_BUCKET=your_bucket_name
WASABI_DEFAULT_FOLDER=interactive-pdfs

# Server
PORT=3000
NODE_ENV=development
```

### Wasabi Setup (Optional)

1. Create account at https://wasabi.com
2. Create a bucket
3. Generate access keys
4. Add to `.env` file
5. PDFs automatically upload to Wasabi

**Without Wasabi:**
- PDFs stored in memory
- Still downloadable
- Works perfectly for testing

## 🌐 Deployment

### Railway (Recommended)

```bash
# Push to GitHub first
git add .
git commit -m "Ready for deployment"
git push

# Deploy to Railway
1. Go to https://railway.app
2. Sign in with GitHub
3. New Project → Deploy from GitHub
4. Select your repo
5. Add environment variables (Wasabi keys)
6. Deploy!
```

### Vercel

```bash
npm install -g vercel
vercel
```

### Render

```bash
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Deploy
```

## 📚 Documentation

- **[USER-GUIDE-V2.md](USER-GUIDE-V2.md)** - Complete usage guide
- **[EMBEDDED-MEDIA-GUIDE.md](EMBEDDED-MEDIA-GUIDE.md)** - Embedded media documentation
- **[BUTTON-HOTSPOT-GUIDE.md](BUTTON-HOTSPOT-GUIDE.md)** - Button & hotspot guide
- **[TESTING-CHECKLIST.md](TESTING-CHECKLIST.md)** - Testing guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment instructions
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide

## 💡 Use Cases

### Training & Courses
- Video lessons embedded in PDF
- Audio narration
- Interactive quizzes
- Resource links

### Marketing & Brochures
- Product videos
- Clickable images
- Website links
- Social media buttons

### Product Catalogs
- Product images with hotspots
- Video demonstrations
- "Buy Now" buttons
- Specification links

### Interactive Magazines
- Embedded multimedia
- Article links
- Advertiser buttons
- Subscription links

## 🎓 Examples

### Example 1: Training Module

```javascript
// In the web interface:
1. Add 5 pages
2. Upload lesson backgrounds
3. Toggle to Embedded mode
4. Add training videos (MP4 from Wasabi)
5. Add quiz buttons
6. Generate PDF
7. Distribute to students
```

### Example 2: Product Catalog

```javascript
// In the web interface:
1. Add pages for each product
2. Upload product images as backgrounds
3. Add hotspots over each product image
4. Link to product pages
5. Add "Shop Now" button at bottom
6. Generate PDF
7. Share with customers
```

## 🆘 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Or use different port
PORT=3001 npm start
```

### PDF not generating
- Check browser console (F12)
- Check server logs in terminal
- Ensure at least 1 page added
- Verify URLs are valid

### Video not playing in PDF
- Use Adobe Acrobat Reader (free)
- Toggle to Embedded mode
- Use direct video URLs (.mp4, not YouTube)
- Or use Link mode for YouTube

### Elements not showing
- Check page is selected (purple border)
- Try switching pages and back
- Refresh browser

## 💰 Cost

- **GitHub** - Free
- **Railway** - Free tier available
- **Vercel** - Free tier available
- **Wasabi** - ~$6/month for storage
- **Adobe Acrobat Reader** - Free for users

**Total: $0-6/month**

## 🤝 Contributing

Contributions welcome! This is a personal project but feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Credits

Built with:
- [pdf-lib](https://pdf-lib.js.org/) - PDF generation
- [Tailwind CSS](https://tailwindcss.com/) - UI styling
- [Font Awesome](https://fontawesome.com/) - Icons
- [Wasabi](https://wasabi.com/) - Cloud storage

## 📞 Support

- **Documentation** - Check the guides in the project
- **Issues** - Open an issue on GitHub
- **Testing** - Use TESTING-CHECKLIST.md

## 🎉 Get Started!

```bash
npm start
# Open http://localhost:3000
# Start creating interactive PDFs!
```

**Happy creating!** 🚀
