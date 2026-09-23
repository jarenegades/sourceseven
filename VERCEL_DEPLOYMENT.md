# 🚀 Vercel Deployment Guide

## ✅ Code Successfully Pushed to GitHub!
Repository: https://github.com/voshoneharris1/nexgenshipping

## 📋 Deploy to Vercel (Step-by-Step)

### Step 1: Connect GitHub Repository
1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import from GitHub: `voshoneharris1/nexgenshipping`
4. Click **"Import"**

### Step 2: Configure Environment Variables
Add these in Vercel → Settings → Environment Variables:

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://erxkwytqautexizleeov.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Never add a Supabase service-role key to Vercel's VITE_* variables. Store it
# only in a server-side function's private environment when a server function
# actually requires it.

# Stripe Configuration (OPTIONAL - for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Neon product API (preview only until verified)

The admin product API requires these server-side Vercel variables:

```bash
DATABASE_URL=postgresql://<restricted-role>:<password>@<pooled-neon-host>/<database>?sslmode=require
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
```

Do not use the Neon owner/migration role for `DATABASE_URL`, and never put it in a `VITE_*` variable. Keep
`VITE_USE_NEON_PRODUCT_API=false` until the Neon category hierarchy is provisioned and both read/write routes
pass a Vercel preview smoke test. Bulk delete and bulk CSV import now route through `/api/admin/products/bulk`
when the flag is on; `hardDelete`, `updateStock`, `search`, and `getByCategory` in `productsService.ts` are
unused by the current UI and still Supabase-only — port them if a caller needs them.

**Where to find these:**
- Supabase keys: Dashboard → Settings → API
- Stripe keys: Dashboard → Developers → API keys

### Step 3: Build Settings (Auto-detected)
Vercel will auto-detect from `vercel.json`:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. ✅ Your app will be live at `https://nexgenshipping.vercel.app`

## 🔧 Post-Deployment Configuration

### Update Supabase URLs (IMPORTANT!)
After deployment, add your Vercel URL to Supabase:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to **"Redirect URLs"**:
   ```
   https://nexgenshipping.vercel.app/**
   https://*.vercel.app/**
   ```
3. Update **"Site URL"**: `https://nexgenshipping.vercel.app`

### Test Your Deployment
1. Visit your Vercel URL
2. Sign up for a new account
3. Login and access admin panel
4. Test bulk upload with CSV
5. Verify products sync to Supabase

## 🐛 Troubleshooting

### Build Fails
**Check build logs in Vercel:**
- Common issue: Missing dependencies
- Solution: Ensure `package.json` is committed

### Authentication Doesn't Work
**Check:**
1. Environment variables are set in Vercel
2. Supabase redirect URLs include your Vercel domain
3. CORS is configured in Supabase dashboard

### Images Not Loading
**Fix:**
1. Ensure Dropbox URLs are public
2. Check `convertDropboxUrl` function is working
3. Verify `dl=1&raw=1` parameters in URLs

### Database Sync Issues
**Verify:**
1. Supabase connection strings in environment variables
2. RLS policies allow authenticated users
3. Migrations ran successfully in Supabase SQL Editor

## 📦 What's Deployed

### ✅ Features Included:
- Direct authentication (CORS-free)
- Admin dashboard with 6 tabs
- Product management (CRUD)
- Bulk CSV upload/download
- Bulk delete by category
- User management & admin promotion
- Stripe payment integration (configured)
- Supabase Storage support
- Dropbox image URL conversion
- Responsive design

### 📂 Key Files:
- `vercel.json` - Deployment configuration
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variable template
- `supabase/migrations/` - Database schema files

## 🔄 Continuous Deployment

Every push to `main` branch will auto-deploy:

```bash
# Make changes locally
git add .
git commit -m "Your change description"
git push origin main
```

Vercel will automatically rebuild and deploy within 2-3 minutes.

## 🎯 Next Steps

1. ✅ **Deploy to Vercel** (follow steps above)
2. ✅ **Configure environment variables**
3. ✅ **Update Supabase URLs**
4. ⏳ **Test authentication**
5. ⏳ **Test bulk upload**
6. ⏳ **Configure custom domain** (optional)
7. ⏳ **Enable Stripe live mode** (when ready for production)

## 🔗 Important Links

- **GitHub Repo**: https://github.com/voshoneharris1/nexgenshipping
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard/project/erxkwytqautexizleeov

---

## ✅ Fixes Applied Before Deployment

1. **Bulk Delete Fixed**: Now uses hard delete and reloads page after deletion
2. **Tab Layout Fixed**: Tabs now display horizontally with proper flexbox
3. **Git Repository**: Initialized and pushed to GitHub
4. **Vercel Config**: Created `vercel.json` with proper settings
5. **Build Optimized**: Ensured no errors in production build

Your app is ready to deploy! 🚀
