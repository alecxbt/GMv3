# Cloudflare Pages Deployment Guide

## Prerequisites

1. Node.js 18+ installed
2. Wrangler CLI installed: `npm install -g wrangler`
3. Cloudflare account with Pages access

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (proxies API to localhost:5001)
npm run dev

# Build for production
npm run build
```

## Deployment Steps

### Option 1: Direct Deploy (Recommended for CI/CD)

```bash
# Navigate to frontend directory
cd frontend

# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=macroterm-frontend
```

### Option 2: Git Integration (Recommended for continuous deployment)

1. **Connect Repository**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/pages)
   - Click "Create a project" > "Connect to Git"
   - Authorize Cloudflare access to your GitHub/GitLab repository

2. **Configure Build Settings**
   - Project name: `macroterm-frontend`
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables (add in dashboard):
     - `NODE_VERSION`: `18`

3. **Deploy**
   - Push to main branch to trigger automatic deployment

### Option 3: Wrangler CLI Deploy

```bash
# Authentication (one-time)
wrangler login

# Create project
wrangler pages project create macroterm-frontend

# Deploy
wrangler pages deploy dist --project-name=macroterm-frontend
```

## Environment Variables

Create a `.env` file for local development:

```
VITE_API_URL=http://localhost:5001
```

For production on Cloudflare Pages, set in dashboard:
- `VITE_API_URL`: Your Cloudflare Workers API URL (e.g., `https://api.macroterm.workers.dev`)

## Cloudflare Workers Backend (API)

The frontend expects an API at the VITE_API_URL endpoint. When the Hono/Cloudflare Workers backend is ready:

1. Deploy the backend worker
2. Update `VITE_API_URL` in Cloudflare Pages settings to your worker URL
3. Ensure CORS is configured in the worker

## Custom Domain (Optional)

1. Go to Cloudflare Dashboard > Pages > your project > Custom domains
2. Add your domain
3. DNS will be automatically configured

## Troubleshooting

### Build Failures
- Ensure `NODE_VERSION` is set to `18` in Pages settings
- Check build logs in Cloudflare Dashboard

### CORS Issues
- Configure CORS headers in your Cloudflare Workers backend
- Add appropriate `Access-Control-Allow-Origin` headers

### Asset Loading Issues
- Verify `base` path in `vite.config.ts` is set to `/`
- Ensure output directory is `dist`

## Useful Commands

```bash
# Preview local production build
npx vite preview --port 3000

# Check Wrangler version
wrangler --version

# View deployed site URL
wrangler pages project list
```