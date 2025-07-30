# Netlify Deployment Guide for Ojastack MVP Agent Platform

## Overview

Yes, you can deploy your full project on Netlify! This guide covers the complete deployment process for your MVP Agent Platform, including the React frontend, Netlify Functions (serverless backend), and Supabase integration.

## Prerequisites

Before deploying, ensure you have:

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Supabase Project**: Set up at [supabase.com](https://supabase.com)
3. **GitHub Repository**: Your code should be in a Git repository
4. **API Keys**: OpenAI, ElevenLabs, and other service keys

## Project Structure

Your project is already structured correctly for Netlify deployment:

```
├── client/                 # React frontend
├── netlify/functions/      # Serverless functions
├── supabase/migrations/    # Database migrations
├── netlify.toml           # Netlify configuration
└── package.json           # Dependencies
```

## Step 1: Netlify Configuration

Create a `netlify.toml` file in your project root:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
```

## Step 2: Environment Variables

Set up these environment variables in Netlify:

### Required Variables

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services
VITE_OPENAI_API_KEY=your_openai_api_key
OPENAI_API_KEY=your_openai_api_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional Services
VITE_CLAUDE_API_KEY=your_claude_api_key
N8N_API_KEY=your_n8n_api_key
N8N_BASE_URL=your_n8n_instance_url

# Site Configuration
SITE_URL=https://your-site-name.netlify.app
```

### Setting Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** > **Environment variables**
4. Add each variable with its value

## Step 3: Package.json Scripts

Ensure your `package.json` has the correct build scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    // Your existing dependencies
  }
}
```

## Step 4: Supabase Setup

### Database Migrations

Run your migrations in Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Row Level Security (RLS)

Ensure RLS is enabled on all tables. Your migrations already include RLS policies.

### Storage Buckets

Create storage buckets for:
- `voice-conversations` (for audio files)
- `knowledge-base-documents` (for uploaded documents)
- `agent-assets` (for agent-related files)

## Step 5: Deployment Process

### Option A: Git Integration (Recommended)

1. **Connect Repository**:
   - In Netlify dashboard, click "New site from Git"
   - Connect your GitHub/GitLab repository
   - Select your repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy

### Option B: Manual Deploy

```bash
# Build the project
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

## Step 6: Post-Deployment Configuration

### Domain Setup

1. **Custom Domain** (Optional):
   - Go to **Site settings** > **Domain management**
   - Add your custom domain
   - Configure DNS records

2. **HTTPS**:
   - Netlify provides free SSL certificates
   - Enable "Force HTTPS" in domain settings

### Function Logs

Monitor your serverless functions:
- Go to **Functions** tab in Netlify dashboard
- View logs and performance metrics
- Set up error alerts

## Step 7: Testing Deployment

### Frontend Testing

1. Visit your deployed site
2. Test user authentication
3. Verify agent creation and management
4. Test chat functionality

### API Testing

Test your Netlify Functions:

```bash
# Test agent creation
curl -X POST https://your-site.netlify.app/.netlify/functions/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"name":"Test Agent","type":"chat","personality":"Helpful assistant"}'

# Test conversations
curl https://your-site.netlify.app/.netlify/functions/conversations \
  -H "Authorization: Bearer your-jwt-token"
```

## Step 8: Performance Optimization

### Build Optimization

1. **Code Splitting**:
   ```typescript
   // Use dynamic imports for large components
   const VoiceChat = lazy(() => import('@/components/VoiceChat'));
   ```

2. **Bundle Analysis**:
   ```bash
   npm install --save-dev vite-bundle-analyzer
   ```

3. **Environment-specific Builds**:
   ```typescript
   // Use environment variables for feature flags
   const ENABLE_VOICE = import.meta.env.VITE_ENABLE_VOICE === 'true';
   ```

### Function Optimization

1. **Cold Start Reduction**:
   - Keep functions lightweight
   - Use connection pooling for database
   - Implement proper caching

2. **Memory Management**:
   ```javascript
   // In netlify/functions
   export const handler = async (event, context) => {
     // Set function timeout
     context.callbackWaitsForEmptyEventLoop = false;
     
     // Your function logic
   };
   ```

## Step 9: Monitoring and Analytics

### Error Tracking

1. **Sentry Integration**:
   ```bash
   npm install @sentry/react @sentry/vite-plugin
   ```

2. **Function Monitoring**:
   - Use Netlify's built-in analytics
   - Set up custom logging

### Performance Monitoring

1. **Web Vitals**:
   ```typescript
   import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
   
   getCLS(console.log);
   getFID(console.log);
   getFCP(console.log);
   getLCP(console.log);
   getTTFB(console.log);
   ```

## Step 10: CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './dist'
          production-branch: main
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Function Errors**:
   - Check function logs in Netlify dashboard
   - Verify environment variables
   - Test functions locally with `netlify dev`

3. **CORS Issues**:
   - Ensure proper headers in functions
   - Check Netlify redirects configuration

4. **Database Connection**:
   - Verify Supabase credentials
   - Check RLS policies
   - Test database connectivity

### Local Development

Test your deployment locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run local development server
netlify dev

# This will:
# - Start your frontend on localhost:3000
# - Run functions on localhost:8888/.netlify/functions
# - Proxy API calls correctly
```

## Security Considerations

1. **Environment Variables**:
   - Never commit API keys to Git
   - Use different keys for development/production
   - Rotate keys regularly

2. **Function Security**:
   - Validate all inputs
   - Implement rate limiting
   - Use proper authentication

3. **Database Security**:
   - Enable RLS on all tables
   - Use service role key only in functions
   - Regular security audits

## Cost Optimization

### Netlify Pricing

- **Starter Plan**: Free (100GB bandwidth, 300 build minutes)
- **Pro Plan**: $19/month (1TB bandwidth, 1000 build minutes)
- **Business Plan**: $99/month (unlimited bandwidth and builds)

### Function Usage

- **Free Tier**: 125,000 requests/month, 100 hours runtime
- **Pro Tier**: 2 million requests/month, 1000 hours runtime

### Optimization Tips

1. **Caching**: Implement proper caching strategies
2. **Function Efficiency**: Optimize function execution time
3. **Asset Optimization**: Compress images and assets
4. **CDN Usage**: Leverage Netlify's global CDN

## Conclusion

Your MVP Agent Platform is fully compatible with Netlify deployment. The architecture using:

- **React Frontend**: Deployed to Netlify's CDN
- **Netlify Functions**: Serverless backend
- **Supabase**: Database and authentication
- **External APIs**: OpenAI, ElevenLabs integration

This setup provides:
- ✅ Scalable serverless architecture
- ✅ Global CDN distribution
- ✅ Automatic HTTPS and security
- ✅ Easy CI/CD integration
- ✅ Cost-effective hosting
- ✅ Built-in monitoring and analytics

Your project is ready for production deployment on Netlify!