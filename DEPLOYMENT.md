# Deployment Guide: Vercel + Supabase

This guide will help you deploy your ConstructTrack application to Vercel with Supabase as your production database and file storage.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com)
3. A Supabase account (sign up at https://supabase.com)

## Step 1: Push Your Code to GitHub

1. In your Replit project, click on the **Git** icon in the left sidebar (or press Ctrl+Shift+G)
2. If not already initialized, click **Initialize Git Repository**
3. Stage all your files by clicking the **+** button next to "Changes"
4. Write a commit message (e.g., "Initial commit - ready for deployment")
5. Click **Commit & Push**
6. Click **Create a new repository** on GitHub
7. Follow the prompts to create your repository and push your code

## Step 2: Set Up Supabase

### Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Fill in:
   - **Name**: ConstructTrack (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
4. Click **Create new project** (this takes 2-3 minutes)

### Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** tab
3. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Set Up Your Database Schema

1. Go to **Project Settings** > **Database**
2. Scroll to **Connection string** section
3. Copy the **Transaction pooler** connection string
4. Click **Use connection pooling**
5. Replace `[YOUR-PASSWORD]` with your database password

### Run Database Migration

On your local machine or in Replit:

```bash
# Set the Supabase DATABASE_URL temporarily
export DATABASE_URL="your-supabase-connection-string"

# Push your schema to Supabase
npm run db:push
```

This creates all your tables (users, projects, roads, layers, etc.) in Supabase.

### Set Up Supabase Storage

1. In your Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Create a bucket named: `construction-files`
4. Set it to **Public** (so uploaded images are accessible)
5. Click **Create bucket**

## Step 3: Deploy to Vercel

### Connect Your GitHub Repository

1. Go to https://vercel.com and sign in
2. Click **Add New** > **Project**
3. Select **Import Git Repository**
4. Choose your GitHub repository (ConstructTrack)
5. Click **Import**

### Configure Build Settings

Vercel should auto-detect your settings, but verify:

- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### Add Environment Variables

In the Vercel project settings, add these environment variables:

```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].pooler.supabase.com:6543/postgres

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-secret-key-here

# Supabase Config
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# Frontend Supabase Config (for client-side)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# Node Environment
NODE_ENV=production
```

**Important**: Make sure to replace all placeholder values with your actual credentials!

### Deploy

1. Click **Deploy**
2. Wait for the build to complete (2-5 minutes)
3. Once done, you'll get a live URL like: `https://your-app.vercel.app`

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Try to **Sign Up** with a new account
3. Log in and create a test project
4. Upload a test image (to verify Supabase Storage works)
5. Verify all features work correctly

## Step 5: Set Up Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Click **Add Domain**
3. Enter your domain name
4. Follow the DNS configuration instructions
5. Wait for DNS propagation (can take up to 48 hours)

## Troubleshooting

### Database Connection Errors

- Verify your `DATABASE_URL` uses the **Transaction pooler** connection string (port 6543)
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- Check that your Supabase project is active

### Session/Auth Not Working

- Verify `SESSION_SECRET` is set in Vercel environment variables
- Make sure the session table exists in your database (run `npm run db:push` again)

### File Upload Fails

- Check that your Supabase storage bucket `construction-files` is set to **Public**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly set
- Check both server and client-side environment variables (VITE_ prefix)

### Build Failures

- Check Vercel build logs for specific errors
- Ensure all dependencies are in `package.json`
- Try building locally first: `npm run build`

## Continuous Deployment

Once set up, any push to your GitHub main branch will automatically trigger a new deployment on Vercel!

## Cost Estimate (10,000 users)

**Supabase Pro Plan**: $25/month
- Database hosting
- 8 GB database storage
- 250 GB bandwidth
- 100 GB file storage

**Vercel Pro Plan**: $20/month
- Unlimited bandwidth
- Analytics
- Custom domains
- Team collaboration

**Total**: ~$45-70/month for production-scale hosting

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Need help? Check the logs in Vercel dashboard under **Deployments** > **Function Logs**
