# 🎯 Button & Hotspot Guide

## Two New Interactive Elements

### 1. 🔘 Button (Visible)
A styled, visible button that people can click.

**Use Cases:**
- "Download Now" buttons
- "Visit Website" buttons
- "Watch Video" buttons
- "Learn More" buttons
- Call-to-action buttons

**How it looks:**
- **In Editor:** Blue/indigo button with your text
- **In PDF:** Styled button with text (clickable)

### 2. 👆 Hotspot (Invisible)
An invisible clickable area you can place over images or anywhere.

**Use Cases:**
- Clickable product images
- Interactive diagrams
- Hidden Easter eggs
- Image galleries
- Clickable logos

**How it looks:**
- **In Editor:** Orange dashed outline (so you can see it)
- **In PDF:** Completely invisible (but clickable!)

## 🚀 How to Use

### Adding a Button

1. Click **"Add Button"** in Asset Library
2. Enter the URL (where it should go)
3. Enter button text (e.g., "Click Here", "Download", "Visit Site")
4. Button appears in your asset library
5. Click it to add to current page
6. Drag to position, resize as needed

**Example:**
```
URL: https://yourwebsite.com
Text: Visit Our Website
```

### Adding a Hotspot

1. Click **"Add Hotspot (Invisible)"** in Asset Library
2. Enter the URL (where it should go)
3. Enter a name for reference (e.g., "Product 1", "Logo Link")
4. Hotspot appears in your asset library
5. Click it to add to current page
6. Drag over your image/area
7. Resize to cover the exact area you want clickable

**Example:**
```
URL: https://youtube.com/watch?v=abc123
Name: Product Demo Video
```

## 💡 Pro Tips

### Buttons

**✅ Good button text:**
- "Download PDF"
- "Watch Tutorial"
- "Get Started"
- "Learn More"
- "Contact Us"

**❌ Avoid:**
- "Click Here" (not descriptive)
- Very long text (won't fit)
- Special characters

**Sizing:**
- Default: 150px x 50px
- Resize to fit your text
- Keep readable (not too small)

### Hotspots

**Perfect for:**
- Placing over product images → Link to product page
- Placing over logos → Link to company website
- Placing over diagrams → Link to detailed view
- Placing over photos → Link to gallery

**Tips:**
- Make hotspot slightly larger than the image
- Test by clicking in PDF viewer
- Use descriptive names so you remember what they link to
- Can overlap with other elements

## 🎨 Design Examples

### Example 1: Product Catalog Page

```
Background: Canva design with 3 product images

Elements:
1. Hotspot over Product 1 → Links to product page
2. Hotspot over Product 2 → Links to product page
3. Hotspot over Product 3 → Links to product page
4. Button at bottom: "View Full Catalog" → Links to website
```

### Example 2: Course Landing Page

```
Background: Canva design with course info

Elements:
1. Button: "Enroll Now" → Links to enrollment page
2. Button: "Watch Preview" → Links to YouTube video
3. Hotspot over instructor photo → Links to bio
4. Button: "Download Syllabus" → Links to PDF
```

### Example 3: Interactive Infographic

```
Background: Canva infographic design

Elements:
1. Hotspot over each section → Links to detailed article
2. Button at top: "Share This" → Links to social media
3. Hotspot over logo → Links to homepage
4. Button at bottom: "Learn More" → Links to blog
```

## 🔧 Technical Details

### In the PDF

**Buttons:**
- Rendered as colored rectangles with text
- Fully clickable
- Visible to everyone
- Works in all PDF viewers

**Hotspots:**
- Rendered as invisible link annotations
- No visual element in PDF
- Completely transparent
- Works in all PDF viewers

### Compatibility

| Feature | Adobe | Chrome | Firefox | Edge | Preview (Mac) |
|---------|-------|--------|---------|------|---------------|
| Buttons | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hotspots | ✅ | ✅ | ✅ | ✅ | ✅ |

Both work everywhere!

## 🎯 Common Workflows

### Workflow 1: E-commerce Catalog

1. Design product page in Canva
2. Export as PNG
3. Upload as page background
4. Add hotspot over each product image
5. Link hotspots to product pages
6. Add "Shop Now" button at bottom
7. Generate PDF catalog

### Workflow 2: Event Invitation

1. Design invitation in Canva
2. Export as PNG
3. Upload as background
4. Add "RSVP" button → Links to form
5. Add "View Location" button → Links to map
6. Add hotspot over logo → Links to website
7. Generate PDF invitation

### Workflow 3: Interactive Resume

1. Design resume in Canva
2. Export as PNG
3. Upload as background
4. Add hotspot over portfolio section → Links to portfolio
5. Add hotspot over email → Opens email client
6. Add "Download Full CV" button → Links to detailed PDF
7. Generate interactive resume

## 🆘 Troubleshooting

### "Button text not showing"
- Text might be too long
- Resize button to be wider
- Use shorter text

### "Hotspot not clickable in PDF"
- Make sure URL is valid (starts with http:// or https://)
- Test in Adobe Acrobat Reader
- Check hotspot is positioned correctly

### "Can't see hotspot in editor"
- Hotspots have orange dashed border in editor
- They're supposed to be invisible in PDF
- This is normal!

### "Button looks different in PDF"
- PDF buttons are simplified (solid color + text)
- This is normal for PDF format
- Still fully functional

## ✨ Advanced Tips

### Layering
- Hotspots can go OVER images
- Buttons should be on empty space
- Hotspots are invisible, so they won't block view

### Multiple Hotspots
- Add as many as you need
- Can overlap (first one wins)
- Name them clearly for organization

### Button Styling
- Default color: Blue/indigo
- Resize to fit your design
- Keep text readable

### Testing
- Always test in actual PDF viewer
- Click each button/hotspot
- Make sure URLs work

## 🎉 You're Ready!

**Start adding interactive buttons and hotspots to your PDFs!**

1. Open http://localhost:3000
2. Add a page with background
3. Click "Add Button" or "Add Hotspot"
4. Enter URL and text
5. Add to page
6. Position and resize
7. Generate PDF
8. Test the links!

---

**Questions?** Check the main USER-GUIDE-V2.md for more help!
