# Cloudflare Pages Setup - Interactive PDF

## 🎯 How Dashboard-library Does It (THE RIGHT WAY)

Dashboard-library deploys Pages by **connecting Cloudflare directly to GitHub** - NO GitHub Actions needed!

---

## ✅ Setup Instructions (One-Time)

### **Step 1: Go to Cloudflare Dashboard**
https://dash.cloudflare.com

### **Step 2: Create Pages Project**
1. Click **Workers & Pages** (left sidebar)
2. Click **Create application**
3. Click **Pages** tab
4. Click **Connect to Git**

### **Step 3: Connect Repository**
1. Select **GitHub**
2. If prompted, authorize Cloudflare to access GitHub
3. Select repository: **`Anica-blip/interactive-PDF`**
4. Click **Begin setup**

### **Step 4: Configure Build Settings**
```
Project name: interactive-pdf
Production branch: main
Build command: (leave empty)
Build output directory: public
```

### **Step 5: Environment Variables (if needed)**
Add these in **Settings** → **Environment variables**:
- `R2_PUBLIC_URL` = `https://files.3c-public-library.org`
- (Any other env vars your frontend needs)

### **Step 6: Save and Deploy**
Click **Save and Deploy**

---

## 🚀 How It Works After Setup

```
You push to GitHub → Cloudflare auto-detects → Deploys public/ folder → Live!
```

**No GitHub Actions needed!**  
**No workflow files!**  
**Just like Dashboard-library!**

---

## 📋 What's Deployed

**Worker (via GitHub Actions):**
- `worker.js` → Deploys to `api.3c-public-library.org/pdf/*`
- Uses `.github/workflows/cloudflare-worker.yml`

**Pages (via Cloudflare Direct Git):**
- `public/` folder → Deploys to `interactive-pdf.pages.dev`
- Auto-deploys on every push
- No workflow file needed

---

## ✅ Advantages

- ✅ **Simpler** - No GitHub Actions for Pages
- ✅ **Faster** - Direct Cloudflare integration
- ✅ **Reliable** - No authentication issues
- ✅ **Same as Dashboard-library** - Proven working method

---

## 🎯 After Setup

Every time you `git push`:
- Worker deploys via GitHub Actions ✅
- Pages deploys automatically via Cloudflare ✅
- Both work independently, no conflicts!
