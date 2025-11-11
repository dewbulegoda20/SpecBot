# 🗄️ PostgreSQL Database Setup (Required)

## Why PostgreSQL?

The enhanced SpecBot requires PostgreSQL because:
- ✅ Better support for JSON fields (bounding boxes, table data)
- ✅ Better indexing for search performance
- ✅ Required for Vercel deployment
- ✅ Industry standard for production apps

## Quick Setup Options (Choose One)

### Option 1: Neon (RECOMMENDED - Easiest & Free)

**Why Neon?** Free tier, instant setup, great for development.

1. **Go to**: https://neon.tech/
2. **Sign up** with GitHub (fastest)
3. **Create Project**:
   - Name: `specbot`
   - Region: Choose closest to you
   - PostgreSQL version: 16 (latest)
4. **Copy Connection String**:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
   ```
5. **Add to .env.local**:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb"
   ```

**Free Tier:**
- ✅ 0.5 GB storage (enough for 1000+ PDFs)
- ✅ Always free
- ✅ No credit card required

---

### Option 2: Supabase (Free + Extra Features)

**Why Supabase?** Free tier + built-in auth & storage.

1. **Go to**: https://supabase.com/
2. **Sign up** with GitHub
3. **Create Project**:
   - Name: `specbot`
   - Database Password: (create strong password)
   - Region: Choose closest
4. **Get Connection String**:
   - Go to Project Settings → Database
   - Copy "Connection string" (Pooler mode)
5. **Add to .env.local**:
   ```env
   DATABASE_URL="postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres"
   ```

**Free Tier:**
- ✅ 500 MB database
- ✅ Unlimited API requests
- ✅ Always free

---

### Option 3: Vercel Postgres (If deploying to Vercel)

1. **Go to**: https://vercel.com/
2. **Create Project** (import your GitHub repo)
3. **Add Vercel Postgres**:
   - Go to Storage tab
   - Click "Create Database"
   - Select "Postgres"
4. **Copy .env.local**:
   - Vercel automatically provides DATABASE_URL
5. **Pull to local**:
   ```bash
   vercel env pull .env.local
   ```

**Free Tier:**
- ✅ 256 MB storage
- ✅ 60 hours compute/month

---

### Option 4: Local PostgreSQL (For Advanced Users)

**Install PostgreSQL locally:**

**Windows:**
```powershell
# Using Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

**Setup:**
```powershell
# Start PostgreSQL service
pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start

# Create database
createdb specbot

# Connection string:
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/specbot"
```

---

## After Setup - Apply Database Schema

Once you have your DATABASE_URL:

1. **Update .env.local**:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   ```

2. **Push schema to database**:
   ```bash
   npx prisma db push
   ```

3. **Verify**:
   ```bash
   npx prisma studio
   ```
   This opens a GUI to view your database.

---

## Quick Comparison

| Service | Free Storage | Setup Time | Best For |
|---------|-------------|------------|----------|
| **Neon** | 0.5 GB | 2 min | Quick start ⭐ |
| **Supabase** | 500 MB | 3 min | Extra features |
| **Vercel** | 256 MB | 5 min | Vercel deployment |
| **Local** | Unlimited | 15 min | Offline dev |

---

## Troubleshooting

### "Can't connect to database"
```bash
# Test connection
npx prisma db pull
```

### "SSL connection required"
Add `?sslmode=require` to connection string:
```env
DATABASE_URL="postgresql://...?sslmode=require"
```

### "Schema out of sync"
```bash
# Reset and reapply
npx prisma db push --force-reset
```

---

## Next Steps

After database is set up:

1. ✅ Database configured
2. ⬜ Set up Azure Document Intelligence (SETUP_AZURE.md)
3. ⬜ Set up Pinecone (SETUP_PINECONE.md)
4. ⬜ Test the system
