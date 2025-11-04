# Vercel Deployment Guide for SpecBot

## 📋 Prerequisites

1. Vercel account (free): https://vercel.com/signup
2. OpenAI API key: https://platform.openai.com/api-keys
3. Vercel Postgres database (free tier available)

## 🗄️ Database Setup (Vercel Postgres)

### Option A: Using Vercel Postgres (Recommended)

**Important**: SQLite doesn't work on Vercel. You need to use Vercel Postgres.

1. Go to https://vercel.com/dashboard
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose a name (e.g., "specbot-db")
6. Select region close to your users
7. Click "Create"

After creation, you'll get a connection string like:
```
postgres://default:xxx@xxx-pooler.us-east-1.postgres.vercel-storage.com:5432/verceldb
```

### Option B: Using Neon.tech (Alternative Free Option)

1. Go to https://neon.tech
2. Sign up for free
3. Create a new project
4. Copy the connection string

## 🚀 Deploy to Vercel

### Method 1: Via Vercel Website (Easiest)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Click "Import Project"

2. **Import from GitHub**
   - Select "Import Git Repository"
   - Find and select: `dewbulegoda20/SpecBot`
   - Click "Import"

3. **Configure Project**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: Leave default
   - Output Directory: Leave default

4. **Add Environment Variables** (IMPORTANT!)
   
   Click "Environment Variables" and add these:

   | Name | Value | Where to get it |
   |------|-------|----------------|
   | `DATABASE_URL` | `postgres://user:pass@host:5432/db` | From Vercel Postgres or Neon.tech |
   | `OPENAI_API_KEY` | `sk-...` | https://platform.openai.com/api-keys |

   **Important**: Add these for all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: SpecBot
# - Directory: ./
# - Override settings? No

# Set environment variables
vercel env add DATABASE_URL
# Paste your Postgres connection string

vercel env add OPENAI_API_KEY
# Paste your OpenAI API key

# Deploy to production
vercel --prod
```

## ⚙️ Post-Deployment Setup

### 1. Run Database Migrations

After first deployment, you need to initialize the database:

**Option A: Using Vercel CLI**
```bash
# Connect to your Vercel Postgres
vercel env pull .env.production

# Run Prisma migration
npx prisma migrate deploy
```

**Option B: Using Vercel Dashboard**
1. Go to your project settings
2. Navigate to "Storage" tab
3. Connect to Postgres
4. Run this SQL manually (copy from prisma/migrations)

### 2. Update Schema for PostgreSQL (If needed)

The current schema uses SQLite. For Vercel deployment, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then regenerate and push:
```bash
npx prisma generate
npx prisma db push
```

## 📁 File Upload Configuration

**Important**: Vercel has a 4.5MB limit for serverless functions. For PDF uploads:

### Option 1: Use Vercel Blob Storage (Recommended)

1. Install Vercel Blob:
```bash
npm install @vercel/blob
```

2. Update upload API to use Blob storage
3. Vercel will handle file storage automatically

### Option 2: Use External Storage (S3, Cloudflare R2)

Configure external storage in your upload API route.

## 🔐 Environment Variables Summary

Here are ALL environment variables you need:

```env
# Database (Vercel Postgres)
DATABASE_URL="postgres://default:xxx@xxx-pooler.us-east-1.postgres.vercel-storage.com:5432/verceldb"

# OpenAI
OPENAI_API_KEY="sk-proj-..."

# Optional: For better performance
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

## ✅ Checklist Before Deploying

- [ ] Create Vercel account
- [ ] Create Vercel Postgres database
- [ ] Get OpenAI API key
- [ ] Update schema to PostgreSQL
- [ ] Push latest code to GitHub
- [ ] Import project to Vercel
- [ ] Add environment variables
- [ ] Deploy
- [ ] Run database migrations
- [ ] Test upload functionality

## 🐛 Troubleshooting

### "SQLITE_CANTOPEN" Error
- **Solution**: Change database provider from SQLite to PostgreSQL

### "Module not found" Error
- **Solution**: Make sure all dependencies are in `package.json`, not devDependencies

### File Upload Fails
- **Solution**: Implement Vercel Blob storage for file uploads
- File system storage (`/uploads`) won't work on Vercel

### Database Connection Error
- **Solution**: Verify DATABASE_URL is correct
- Make sure to use connection pooling URL from Vercel Postgres

### Build Timeout
- **Solution**: Reduce build complexity or upgrade Vercel plan

## 🎯 Quick Start Commands

```bash
# 1. Update for PostgreSQL
git checkout -b vercel-deploy

# 2. Install Vercel CLI
npm i -g vercel

# 3. Login
vercel login

# 4. Deploy
vercel --prod

# 5. Set env variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
```

## 📊 Cost Estimate (Free Tier)

- Vercel Hosting: Free (100GB bandwidth/month)
- Vercel Postgres: Free (256 MB storage, 60 hours compute)
- OpenAI API: Pay per use (~$0.002 per request with GPT-4o-mini)

## 🔗 Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Docs: https://vercel.com/docs
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres

---

**Need Help?** Open an issue on GitHub or check Vercel's documentation.
