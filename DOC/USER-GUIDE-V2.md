# 🎨 Interactive PDF Creator v2 - User Guide

## 🚀 Quick Start

### 1. Start the Server
```bash
npm start
```

### 2. Open in Browser
```
http://localhost:3000
```

## 📖 Complete Workflow

### Step 1: Add Pages
1. Click **"Add Page"** button in the sidebar
2. Add as many pages as you need (up to 100+)
3. Navigate between pages using the thumbnails

### Step 2: Upload Page Backgrounds
1. Click on a page thumbnail to select it
2. Click **"Upload PNG/JPG"** under "Page Background"
3. Select your Canva-exported PNG image
4. The background will appear on that page

### Step 3: Build Your Asset Library
Click the buttons to add media:

#### **Video**
- Choose: 1 = Paste URL, 2 = Upload file
- **URLs**: YouTube, Vimeo, direct .mp4 links
- **Files**: Upload .mp4, .mov, etc.

#### **Audio**
- Choose: 1 = Paste URL, 2 = Upload file
- **URLs**: Direct .mp3, .wav links
- **Files**: Upload audio files

#### **GIF/Image**
- Choose: 1 = Paste URL, 2 = Upload file
- **URLs**: Direct .gif, .png, .jpg links
- **Files**: Upload image files

#### **Link**
- Paste any URL
- Enter display text

### Step 4: Add Elements to Pages
**Two ways to add:**

1. **Click** an asset in the library → Adds to current page
2. **Drag** an asset from library → Drop on page

### Step 5: Position & Resize
- **Drag** elements to move them
- **Drag corner handle** to resize
- **Hover** to see delete button
- Elements stay within page boundaries

### Step 6: Generate PDF
1. Click **"Generate PDF"** (top right)
2. Wait for processing
3. Click **"Download PDF"** or **"Open in Browser"**

## 🎯 Features

### Multi-Page Support
- ✅ Add unlimited pages
- ✅ Each page has its own background
- ✅ Each page has its own elements
- ✅ Easy page navigation
- ✅ Delete pages (except last one)

### Asset Library
- ✅ Store all your media in one place
- ✅ Reuse assets across pages
- ✅ Upload files or paste URLs
- ✅ Visual thumbnails
- ✅ Easy management

### Interactive Elements
- ✅ **Videos**: Clickable boxes that open video URLs
- ✅ **Audio**: Clickable audio player links
- ✅ **GIFs**: Clickable animated images
- ✅ **Links**: Clickable text links

### Visual Editor
- ✅ Drag and drop positioning
- ✅ Resize with handles
- ✅ Real-time preview
- ✅ See exactly what you're building

## 💡 Tips & Tricks

### Exporting from Canva
1. Design your pages in Canva
2. **Export as PNG** (not PDF!)
3. Export each page separately:
   - page1.png
   - page2.png
   - page3.png
4. Upload them in order

### Organizing Assets
- Name your assets clearly
- Upload all assets before building pages
- Reuse assets across multiple pages
- Delete unused assets to keep library clean

### Positioning Elements
- **Top of page**: Y = near top
- **Bottom of page**: Y = near bottom
- **Center**: Drag to middle
- Use grid mentally: divide page into sections

### File Sizes
- **PNG backgrounds**: Keep under 2MB each
- **Total PDF**: ~5-10MB for 10 pages
- **Media**: Stored as links, not embedded (keeps PDF small)

### Best Practices
1. **Plan first**: Sketch your layout
2. **Upload backgrounds**: Do all pages first
3. **Add assets**: Build your library
4. **Place elements**: Work page by page
5. **Test**: Generate and check PDF

## 🔧 Settings

### PDF Title
- Shows in PDF viewer title bar
- Used for filename

### Author
- PDF metadata
- Your name or company

### Page Size
- **A4**: 595 x 842 px (European standard)
- **Letter**: 612 x 792 px (US standard)
- **Legal**: 612 x 1008 px (US legal)

### Orientation
- **Portrait**: Tall (default)
- **Landscape**: Wide

## 📱 How Interactive Elements Work

### In the PDF
When someone opens your PDF:

1. **Videos**: See a box with "Click to play" → Opens video URL
2. **Audio**: See audio icon → Opens audio URL
3. **GIFs**: See preview → Opens full GIF
4. **Links**: See blue text → Opens website

### Compatibility
- ✅ **Adobe Acrobat**: Full support
- ✅ **Chrome/Firefox**: Good support
- ✅ **Edge**: Good support
- ⚠️ **Preview (Mac)**: Basic support
- ⚠️ **Mobile**: Varies by app

## 🎓 Example Workflow

### Creating a 5-Page Course Module

1. **Design in Canva**
   - Page 1: Cover page
   - Page 2: Introduction
   - Page 3: Lesson content
   - Page 4: Video tutorial
   - Page 5: Resources

2. **Export**
   - Export each page as PNG
   - Name: module1-page1.png, module1-page2.png, etc.

3. **In PDF Creator**
   - Add 5 pages
   - Upload PNG backgrounds (one per page)
   - Add assets:
     - Tutorial video URL
     - Resource links
     - Audio narration

4. **Build Pages**
   - Page 1: Just background (cover)
   - Page 2: Just background (intro)
   - Page 3: Background + text elements
   - Page 4: Background + video element
   - Page 5: Background + multiple links

5. **Generate**
   - Click Generate PDF
   - Download
   - Test in PDF viewer
   - Share with students!

## 🆘 Troubleshooting

### "Page background not showing"
- Make sure file is PNG or JPG
- Check file size (under 5MB)
- Try re-uploading

### "Elements not clickable in PDF"
- Open in Adobe Acrobat Reader
- Some viewers have limited support
- Make sure URLs are valid

### "PDF too large"
- Compress PNG backgrounds before uploading
- Use online tools like TinyPNG
- Consider fewer pages per PDF

### "Asset won't upload"
- Check file format
- Try pasting URL instead
- Refresh page and try again

### "Can't drag elements"
- Make sure you're on the active page
- Click page thumbnail first
- Try clicking element before dragging

## 🎉 You're Ready!

**Start creating your interactive PDFs now!**

1. `npm start`
2. Open http://localhost:3000
3. Add a page
4. Upload a background
5. Add some elements
6. Generate!

---

**Need help?** Check the other documentation files:
- **QUICKSTART.md** - Fast setup
- **SETUP.md** - Detailed installation
- **DEPLOYMENT.md** - Deploy to production
- **HOW-TO-USE.md** - Original version guide

**Happy creating! 🚀**
