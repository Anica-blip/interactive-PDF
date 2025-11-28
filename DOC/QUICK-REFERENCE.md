# ⚡ Quick Reference Card

## 🚀 Start Server
```bash
npm start
# Open: http://localhost:3000
```

## 🎨 Basic Workflow
1. **Add Page** → 2. **Upload Background** → 3. **Add Elements** → 4. **Generate PDF**

## 🎯 Element Types

| Element | Use For | Mode |
|---------|---------|------|
| **Button** | Visible clickable button | Link only |
| **Hotspot** | Invisible clickable area | Link only |
| **Video** | Video content | Link or Embed |
| **Audio** | Audio content | Link or Embed |
| **GIF/Image** | Images, animations | Link or Embed |
| **Link** | Text hyperlinks | Link only |

## 🎚️ Toggle Switch

| Position | Name | Behavior | Best For |
|----------|------|----------|----------|
| ← Left | **Link Mode** | Opens in browser | Public, everyone |
| → Right | **Embed Mode** | Plays in Adobe | Courses, training |

## 📖 Documentation Quick Links

| Guide | For |
|-------|-----|
| **README.md** | Overview, setup, deployment |
| **USER-GUIDE-V2.md** | Complete usage guide |
| **EMBEDDED-MEDIA-GUIDE.md** | Embedded media details |
| **BUTTON-HOTSPOT-GUIDE.md** | Buttons & hotspots |
| **TESTING-CHECKLIST.md** | Testing steps |
| **QUICKSTART.md** | Fast setup |
| **DEPLOYMENT.md** | Deploy to production |

## ⌨️ Keyboard Shortcuts

| Action | How |
|--------|-----|
| **Drag element** | Click & drag |
| **Resize element** | Drag corner handle |
| **Delete element** | Hover → Click trash |
| **Switch page** | Click thumbnail |
| **Add to page** | Click asset in library |

## 🎬 Media URLs

### Link Mode (Works Everywhere)
- ✅ YouTube: `https://youtube.com/watch?v=...`
- ✅ Vimeo: `https://vimeo.com/...`
- ✅ Any URL

### Embedded Mode (Adobe Acrobat)
- ✅ Direct files: `https://yoursite.com/video.mp4`
- ✅ Wasabi URLs: `https://s3.wasabisys.com/...`
- ❌ YouTube (use Link mode)

## 🐛 Quick Fixes

| Problem | Solution |
|---------|----------|
| Server won't start | Check port 3000, try `PORT=3001 npm start` |
| PDF not generating | Check console (F12), ensure ≥1 page |
| Video not playing | Use Adobe Acrobat + Embedded mode |
| Element not showing | Switch pages and back |
| Can't drag element | Click page thumbnail first |

## 📦 Deployment

### Railway (Recommended)
```bash
git push
# → railway.app → Deploy from GitHub
```

### Vercel
```bash
vercel
```

## 💾 Environment Variables

```env
WASABI_ACCESS_KEY=your_key
WASABI_SECRET_KEY=your_secret
WASABI_PUBLIC_BUCKET=your_bucket
WASABI_DEFAULT_FOLDER=interactive-pdfs
```

## 🎯 File Sizes

| Item | Size |
|------|------|
| PDF (10 pages, 5 videos) | ~5-10MB |
| Background PNG | ~1-2MB each |
| Total project | ~50MB |

## 💰 Costs

| Service | Cost |
|---------|------|
| GitHub | Free |
| Railway | Free tier |
| Vercel | Free tier |
| Wasabi | ~$6/month |
| Adobe Reader | Free |

## ✅ Pre-Flight Checklist

Before generating PDF:
- [ ] At least 1 page added
- [ ] Backgrounds uploaded (optional)
- [ ] Elements positioned
- [ ] URLs tested
- [ ] Mode selected (Link/Embed)

## 🎓 Example Use Cases

| Use Case | Setup |
|----------|-------|
| **Training Course** | Embed mode + MP4 videos |
| **Marketing Brochure** | Link mode + YouTube |
| **Product Catalog** | Hotspots over images |
| **Interactive Magazine** | Mix of both modes |

## 📱 Viewer Compatibility

| Viewer | Embedded | Links |
|--------|----------|-------|
| Adobe Acrobat | ✅ Plays | ✅ Works |
| Chrome | ⚠️ Fallback | ✅ Works |
| Firefox | ⚠️ Fallback | ✅ Works |
| Edge | ⚠️ Fallback | ✅ Works |
| Mobile | ⚠️ Varies | ✅ Works |

## 🔗 Important Links

- **Adobe Reader**: https://get.adobe.com/reader/
- **Wasabi**: https://wasabi.com
- **Railway**: https://railway.app
- **Vercel**: https://vercel.com

## 💡 Pro Tips

1. **Export from Canva as PNG**, not PDF
2. **Test in Adobe Acrobat** for embedded media
3. **Use Wasabi** for video hosting
4. **Mix modes** in same PDF
5. **Keep backgrounds under 2MB** each
6. **Name assets clearly** in library
7. **Test URLs** before adding
8. **Save often** (generate PDFs regularly)

## 🎉 That's It!

**Most Common Workflow:**
```
npm start
→ Add page
→ Upload PNG background
→ Toggle to Link mode
→ Add YouTube video
→ Add button
→ Generate PDF
→ Download
→ Done! ✅
```

**Need more help?** Check the full guides in the docs folder!
