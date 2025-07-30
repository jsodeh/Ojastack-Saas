# 🚀 Ojastack MVP Agent Platform - Deployment Guide

This comprehensive guide will walk you through deploying your Ojastack MVP Agent Platform to production with the new modern landing page and all enhanced features.

## 📋 Prerequisites

- [ ] Supabase account
- [ ] OpenAI API key  
- [ ] Domain name (ojastack.tech)
- [ ] Node.js 18+ installed
- [ ] Git repository access

## 🔧 Step 1: Set Up Supabase

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Choose your organization
4. Enter project details:
   - **Name**: `ojastack-mvp-production`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click **Create new project**

### 1.2 Run Database Migrations
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

### 1.3 Configure Authentication
1. Go to **Authentication** > **Settings**
2. Configure **Site URL**: `https://ojastack.tech`
3. Add **Redirect URLs**:
   - `https://ojastack.tech/auth/callback`
   - `http://localhost:5173/auth/callback` (for development)

### 1.4 Set Up Row Level Security (RLS)
The migrations automatically set up RLS policies, but verify:
1. Go to **Authentication** > **Policies**
2. Ensure policies are enabled for all tables
3. Test with a test user account

## 🌐 Step 2: Deploy to Netlify

### 2.1 Connect Repository
1. Go to [netlify.com](https://netlify.com)
2. Click **New site from Git**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

### 2.2 Environment Variables
Add these environment variables in Netlify (copy from your `.env.example`):

```bash
# === REQUIRED CONFIGURATION ===

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-key
OPENAI_API_KEY=sk-your-openai-key

# App Configuration
VITE_APP_NAME=Ojastack
VITE_APP_URL=https://ojastack.tech
SITE_URL=https://ojastack.tech

# === ENHANCED FEATURES ===

# Voice Integration (ElevenLabs)
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_API_KEY=your-elevenlabs-key
VITE_ELEVENLABS_AGENT_ID=your-agent-id

# Enhanced Tool APIs
VITE_SERPER_API_KEY=your-serper-key
VITE_WEATHERAPI_KEY=your-weather-key
VITE_BING_API_KEY=your-bing-key
VITE_VISUALCROSSING_API_KEY=your-visual-crossing-key

# N8N Workflow Integration
VITE_N8N_API_URL=https://your-n8n-instance.com/api/v1
VITE_N8N_API_KEY=your-n8n-api-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# MCP Server (Optional)
VITE_MCP_SERVER_URL=wss://your-mcp-server.com

# Volt Agents (Optional)
VITE_VOLT_AGENTS_API_KEY=your-volt-key
```

### 2.3 Deploy Functions
Netlify Functions are automatically deployed from the `netlify/functions/` directory.

### 2.4 Configure Custom Domain
1. In Netlify dashboard, go to **Domain settings**
2. Add custom domain: `ojastack.tech`
3. Configure DNS:
   - Add CNAME record: `www` → `your-site.netlify.app`
   - Add A record: `@` → Netlify's IP (provided in dashboard)

## 🔌 Step 3: Configure Integrations

### 3.1 WhatsApp Business API (Optional)
1. Get WhatsApp Business API access
2. Configure webhook URL: `https://ojastack.tech/.netlify/functions/whatsapp-webhook`
3. Add environment variables:
   ```bash
   WHATSAPP_ACCESS_TOKEN=your-access-token
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token
   ```

### 3.2 Email Configuration (Optional)
```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@ojastack.tech
SMTP_PASS=your-email-password
```

### 3.3 Voice Integration (Optional)
```bash
ELEVENLABS_API_KEY=your-elevenlabs-key
DEEPGRAM_API_KEY=your-deepgram-key
```

## 🧪 Step 4: Testing

### 4.1 Landing Page Tests
1. **New MagicUI-Inspired Design**: Verify modern, clean design loads correctly
2. **Hero Section**: Test gradient backgrounds and animated elements
3. **Feature Cards**: Verify all 6 feature cards display properly
4. **Product Preview**: Check dashboard mockup renders correctly
5. **Testimonials**: Verify social proof section displays
6. **Pricing Cards**: Test all 3 pricing tiers (Starter, Pro, Enterprise)
7. **Responsive Design**: Test on mobile, tablet, desktop (all breakpoints)
8. **Navigation**: Test sticky navigation and all links
9. **CTAs**: Verify all signup/login buttons work
10. **Performance**: Check page load speed and Core Web Vitals

### 4.2 Core Functionality Tests
1. **Authentication**: Sign up and login flow
2. **Agent Creation**: Create and configure test agents
3. **Conversations**: Test real-time chat functionality
4. **Voice Integration**: Test ElevenLabs voice features
5. **Enhanced Tools**: Test web search, weather, calculator, datetime
6. **Dashboard**: Verify all dashboard pages load correctly

### 4.2 Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery quick --count 10 --num 5 https://ojastack.tech
```

### 4.3 Monitoring Setup
1. **Supabase**: Monitor database performance
2. **Netlify**: Check function logs and performance
3. **OpenAI**: Monitor API usage and costs
4. **Custom**: Set up error tracking (Sentry recommended)

## 🔒 Step 5: Security

### 5.1 Environment Variables
- Never commit API keys to version control
- Use Netlify's environment variable encryption
- Rotate keys regularly

### 5.2 Database Security
- Verify RLS policies are working
- Enable database backups
- Monitor for unusual activity

### 5.3 API Security
- Implement rate limiting
- Monitor for abuse
- Set up API key rotation

## 📊 Step 6: Monitoring & Analytics

### 6.1 Application Monitoring
```bash
# Add to your environment variables
SENTRY_DSN=your-sentry-dsn
MIXPANEL_TOKEN=your-mixpanel-token
```

### 6.2 Performance Monitoring
- Set up Lighthouse CI
- Monitor Core Web Vitals
- Track API response times

### 6.3 Business Metrics
- Track user signups
- Monitor conversation volume
- Measure agent performance

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (use 18+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure migrations ran successfully

3. **Function Timeouts**
   - Optimize function code
   - Increase timeout limits
   - Check for infinite loops

4. **Authentication Problems**
   - Verify redirect URLs
   - Check JWT settings
   - Test with different browsers

### Getting Help
1. Check Netlify function logs
2. Review Supabase logs and metrics
3. Test individual components
4. Contact support at support@ojastack.tech

## 🎨 New Landing Page Features

Your Ojastack platform now includes a completely redesigned landing page inspired by MagicUI:

### ✨ Key Features
- **Modern Hero Section**: Clean typography with gradient text effects
- **Interactive Product Preview**: Live dashboard mockup with animated elements
- **Feature Grid**: 6 beautifully designed feature cards with icons
- **Social Proof**: Customer testimonials and usage statistics
- **Pricing Section**: Clear 3-tier pricing with feature comparisons
- **Responsive Design**: Optimized for all device sizes
- **Performance Optimized**: Fast loading with smooth animations

### 🎯 Design Elements
- **Color Scheme**: Uses your existing Ojastack brand colors
- **Typography**: Clean, modern font hierarchy
- **Spacing**: Generous whitespace for better readability
- **Icons**: Lucide React icons throughout
- **Animations**: Subtle hover effects and transitions
- **CTAs**: Clear call-to-action buttons strategically placed

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring dashboards**
2. **Configure automated backups**
3. **Plan scaling strategy**
4. **Set up CI/CD pipeline**
5. **Document operational procedures**
6. **Train your team**
7. **A/B test the new landing page**
8. **Monitor conversion rates**

---

**Congratulations!** Your Ojastack MVP Agent Platform is now live at https://ojastack.tech 🎉

For ongoing support and updates, visit our [documentation](https://docs.ojastack.tech) or contact our team.