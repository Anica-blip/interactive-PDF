# GitHub Secrets Setup - URGENT FIX

## 🚨 Problem
GitHub Actions deployment failing because secrets are missing.

## ✅ Solution - Add These 2 Secrets

### Step-by-Step:

1. **Go to your GitHub repository**:
   - `https://github.com/Anica-blip/interactive-PDF`

2. **Navigate to Settings**:
   - Click **Settings** tab (top right)
   - Click **Secrets and variables** (left sidebar)
   - Click **Actions**

3. **Add Secret #1: CLOUDFLARE_API_TOKEN**
   - Click **New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Your Cloudflare API Token (get from step below)
   - Click **Add secret**

4. **Add Secret #2: CLOUDFLARE_ACCOUNT_ID**
   - Click **New repository secret**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: Your Cloudflare Account ID (get from step below)
   - Click **Add secret**

---

## 🔑 Getting Your Cloudflare Values

### **CLOUDFLARE_API_TOKEN**:
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit Cloudflare Workers**
4. Or create custom with these permissions:
   - Account > Cloudflare Pages > Edit
   - Account > Account Settings > Read
5. Click **Continue to summary**
6. Click **Create Token**
7. **Copy the token** (you'll only see it once!)
8. Paste into GitHub secret

### **CLOUDFLARE_ACCOUNT_ID**:
1. Go to: https://dash.cloudflare.com
2. Click on **Workers & Pages** (left sidebar)
3. Your Account ID is shown on the right side
4. Click to copy
5. Paste into GitHub secret

---

## ✅ After Adding Secrets

1. **Push your changes** (the workflow fix I just made)
2. **GitHub Actions will auto-deploy**
3. **Check**: https://github.com/Anica-blip/interactive-PDF/actions
4. **Wait for green checkmark** ✅

---

## 🎯 Your Changes Will Then Show Up

Once deployment succeeds:
- All fixes will be live
- Dragging will work
- Preview will work
- Settings will work

**URL**: `https://interactive-pdf.pages.dev` (or your custom domain)

---

## 🔄 Quick Test After Setup

1. Add secrets ✅
2. Push code: `git push origin main`
3. Watch Actions tab
4. Open your app
5. Test dragging elements!
