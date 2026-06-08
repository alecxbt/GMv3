# GM Terminal Deployment Guide

## Quick Start - Deploy to Production (Free Tier)

This guide will help you deploy GM Terminal using free hosting services.

### Prerequisites
- GitHub account
- Node.js 18+ installed locally
- Git installed

### Step 1: Database Setup (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to your users)
3. Once created, go to Settings → Database
4. Copy the connection string (URI)
5. Create `.env` file in `backend/` folder:

```env
DATABASE_URL="your-supabase-connection-string"
JWT_SECRET="generate-a-random-32-char-string"
FRONTEND_URL="https://your-app.vercel.app"
```

### Step 2: Redis Setup (Upstash)

1. Go to [upstash.com](https://upstash.com) and create account
2. Create a new Redis database
3. Copy the Redis URL
4. Add to backend `.env`:

```env
REDIS_URL="your-upstash-redis-url"
```

### Step 3: Deploy Backend (Railway)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Create new project → Deploy from GitHub repo
4. Select your GMv2 repository
5. Add environment variables:
   - Click on the deployment
   - Go to Variables tab
   - Add all variables from your `.env` file
6. Update Settings:
   - Set root directory to `/backend`
   - Set build command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Set start command: `npm start`
7. Generate domain:
   - Go to Settings → Networking
   - Generate Domain
   - Copy the URL (you'll need this for frontend)

### Step 4: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Import your GMv2 repository
3. Configure:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add Environment Variables:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   VITE_WS_URL=wss://your-backend.up.railway.app
   ```
5. Deploy!

### Step 5: Post-Deployment Setup

1. **Initialize Database**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. **Test Authentication**:
   - Visit your frontend URL
   - Try registering a new account
   - Check if login works

3. **Configure Domain** (Optional):
   - In Vercel: Settings → Domains → Add your domain
   - Update CORS in backend to include your domain

### Environment Variables Reference

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# Auth
JWT_SECRET="your-32-char-secret"

# Frontend URL for CORS
FRONTEND_URL="https://your-app.vercel.app"

# Port (Railway sets this automatically)
PORT=5000

# Data Providers (add as you integrate them)
POLYGON_API_KEY=""
BINANCE_API_KEY=""
BINANCE_API_SECRET=""
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend.up.railway.app
VITE_WS_URL=wss://your-backend.up.railway.app
```

### Free Tier Limits

**Supabase Free Tier:**
- 500 MB database
- 2 GB bandwidth
- 50,000 monthly active users

**Railway Free Tier:**
- $5 credit per month
- ~500 hours of usage
- Automatic sleep after 30 min inactivity

**Vercel Free Tier:**
- 100 GB bandwidth
- Unlimited deployments
- Automatic HTTPS

**Upstash Free Tier:**
- 10,000 commands per day
- 256 MB storage
- Durable storage

### Monitoring & Analytics

1. **Error Tracking** (Sentry):
   ```bash
   npm install @sentry/node @sentry/react
   ```
   - Sign up at [sentry.io](https://sentry.io)
   - Add DSN to environment variables

2. **Analytics** (Plausible):
   - Lightweight, privacy-friendly
   - Add script to frontend index.html

3. **Uptime Monitoring**:
   - Use [upptime](https://upptime.js.org/) (free, GitHub-based)
   - Or [cronitor.io](https://cronitor.io) free tier

### Scaling Considerations

When you outgrow free tiers:

1. **Database**: Migrate to Neon ($19/month) or PlanetScale
2. **Backend**: Upgrade Railway ($20/month) or move to Fly.io
3. **Redis**: Upgrade Upstash (pay-per-use) or Redis Cloud
4. **Frontend**: Vercel Pro ($20/month) for team features

### Troubleshooting

**CORS Issues:**
- Ensure FRONTEND_URL in backend matches your Vercel URL
- Check that credentials: true is set in CORS config

**Database Connection:**
- Verify DATABASE_URL is correct
- Check if Prisma migrations ran successfully
- Look at Railway logs for connection errors

**WebSocket Connection:**
- Ensure WSS URL is correct in frontend
- Check if Railway supports WebSockets (it does)
- Verify Socket.io versions match

### Local Development

To run locally while using cloud services:

1. Create `.env.local` files with production URLs
2. Use `npm run dev` in both frontend and backend
3. Point to cloud database/Redis for realistic testing

### Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured
- [ ] Environment variables not exposed
- [ ] Database connections use SSL
- [ ] CORS properly configured
- [ ] API keys stored securely