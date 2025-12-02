# Deployment Architecture - Interactive PDF Builder

## 🎯 THE CORRECT SETUP (Final - Do Not Change)

This document defines how the Interactive PDF Builder deploys to Cloudflare.  
**This is the proven working method used by Dashboard-library.**

---

## 📋 Two-Part Deployment System

### **Part 1: Worker (Backend API)**
**Deploys via:** GitHub Actions  
**File:** `.github/workflows/cloudflare-worker.yml`  
**Deploys:** `worker.js`  
**Destination:** `api.3c-public-library.org/pdf/*`  

**How it works:**
```
git push → GitHub Actions → cloudflare/wrangler-action@v3 → Cloudflare Worker
```

**Authentication:** Uses GitHub Secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)

---

### **Part 2: Pages (Frontend)**
**Deploys via:** Cloudflare Dashboard → Direct Git Connection  
**File:** NO workflow file needed!  
**Deploys:** `public/` folder  
**Destination:** `interactive-pdf.pages.dev` (or custom domain)  

**How it works:**
```
git push → Cloudflare detects changes → Auto-deploys public/ folder
```

**Authentication:** Set up once in Cloudflare Dashboard (connected to GitHub repo directly)

---

## ✅ Why This Setup

### **Worker via GitHub Actions:**
- ✅ Worker needs environment variables from GitHub Secrets
- ✅ Complex deployment with R2 bindings, routes, etc.
- ✅ GitHub Actions handles this properly

### **Pages via Cloudflare Direct Git:**
- ✅ **NO wrangler authentication issues** 
- ✅ **NO GitHub Actions workflow needed**
- ✅ **Cloudflare reads directly from GitHub repository**
- ✅ **Auto-deploys on every push**
- ✅ Simple static file serving
- ✅ **THIS IS HOW DASHBOARD-LIBRARY WORKS**

---

## 🚫 What NOT To Do

### **DON'T:**
- ❌ Create `.github/workflows/cloudflare-pages.yml`
- ❌ Try to deploy Pages via GitHub Actions
- ❌ Use wrangler for Pages deployment in GitHub Actions
- ❌ Export CLOUDFLARE_API_TOKEN for Pages in workflow

### **Why These Cause Problems:**
- Wrangler can't see environment variables properly in GitHub Actions
- Creates authentication errors: "it's necessary to set a CLOUDFLARE_API_TOKEN"
- Cloudflare direct Git connection is simpler and more reliable
- This is proven to work (Dashboard-library uses this method)

---

## 📂 Repository Structure

```
interactive-PDF-main/
├── .github/
│   └── workflows/
│       └── cloudflare-worker.yml     ← ONLY Worker deployment
│       (NO cloudflare-pages.yml)     ← Pages deploys via Cloudflare Dashboard
│
├── public/                           ← Frontend (Cloudflare Pages reads this)
│   ├── index.html
│   ├── app.js
│   └── ...
│
├── worker.js                         ← Backend (GitHub Actions deploys this)
├── wrangler.toml                     ← Worker config
└── wrangler-pages.toml               ← Pages config (Cloudflare reads this directly)
```

---

## 🔄 Deployment Flow

### **When You Push Code:**

```bash
git add -A
git commit -m "Your changes"
git push origin main
```

### **What Happens:**

**1. GitHub Actions (Worker):**
```
→ Triggers cloudflare-worker.yml
→ Uses cloudflare/wrangler-action@v3
→ Reads GitHub Secrets for auth
→ Deploys worker.js to Cloudflare
→ Updates api.3c-public-library.org/pdf/*
```

**2. Cloudflare Pages (Frontend):**
```
→ Cloudflare detects push to main branch
→ Reads public/ folder from GitHub repository
→ Auto-builds and deploys
→ Updates interactive-pdf.pages.dev
→ NO GitHub Actions involved
→ NO authentication issues
```

---

## 🎯 One-Time Setup Required

### **Worker (Already Set Up):**
✅ GitHub Secrets configured  
✅ Workflow file exists  
✅ Ready to deploy  

### **Pages (One-Time Setup Needed):**

**Go to:** https://dash.cloudflare.com

**Steps:**
1. Workers & Pages → Create application
2. Pages tab → Connect to Git
3. Select: `Anica-blip/interactive-PDF`
4. Configure:
   - Project name: `interactive-pdf`
   - Branch: `main`
   - Build directory: `public`
   - Build command: (empty)
5. Save and Deploy

**After this setup:**
- Pages auto-deploy on every push
- No manual intervention needed
- No GitHub Actions needed

---

## 📊 Comparison: Dashboard-Library vs Interactive PDF

| Feature | Dashboard-Library | Interactive PDF | Status |
|---------|------------------|-----------------|--------|
| **Worker Deployment** | GitHub Actions | GitHub Actions | ✅ Same |
| **Pages Deployment** | Cloudflare Direct Git | Cloudflare Direct Git | ✅ Same |
| **Pages Workflow File** | None | None | ✅ Correct |
| **Worker Workflow File** | cloudflare-worker.yml | cloudflare-worker.yml | ✅ Same |
| **Authentication Method** | GitHub Secrets (Worker only) | GitHub Secrets (Worker only) | ✅ Same |

---

## 🔒 Security

### **GitHub Secrets (Worker Only):**
- `CLOUDFLARE_API_TOKEN` - For Worker deployment
- `CLOUDFLARE_ACCOUNT_ID` - For Worker deployment

### **Cloudflare Dashboard (Pages):**
- Connected to GitHub repository (OAuth)
- No secrets in GitHub needed for Pages
- Cloudflare has direct read access to repo

---

## 📝 Summary

**THE RULE:**
- **Worker = GitHub Actions** (needs secrets, complex config)
- **Pages = Cloudflare Dashboard** (simple, direct Git connection)

**DO NOT:**
- Create GitHub Actions workflow for Pages deployment
- Try to use wrangler in GitHub Actions for Pages
- Mix deployment methods

**THIS IS THE PROVEN WORKING METHOD FROM DASHBOARD-LIBRARY**

---

## ⚠️ If Someone Tries To "Fix" This

**If someone suggests:**
- "Add cloudflare-pages.yml workflow"
- "Deploy Pages via GitHub Actions"
- "Use wrangler for Pages in Actions"

**Tell them:**
- "No, we use Cloudflare Direct Git for Pages"
- "This is how Dashboard-library works"
- "Read DEPLOYMENT-ARCHITECTURE.md"

---

**Last Updated:** December 2, 2024  
**Status:** FINAL - DO NOT CHANGE UNLESS CLOUDFLARE CHANGES THEIR PLATFORM
