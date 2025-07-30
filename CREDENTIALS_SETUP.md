# 🔐 Ojastack MVP - Credentials Setup Guide

This guide provides step-by-step instructions for obtaining and configuring all the API keys and credentials needed for your Ojastack MVP Agent Platform.

## 🎯 Required Credentials

### ✅ Essential (Required for basic functionality)
- Supabase (Database & Auth)
- OpenAI API (AI/LLM)

### 🔧 Enhanced Features (Optional but recommended)
- Serper API (Google Search)
- WeatherAPI (Weather data)
- ElevenLabs (Voice synthesis)
- Deepgram (Speech-to-text)

### 🚀 Advanced Integrations (Optional)
- WhatsApp Business API
- N8N (Workflow automation)
- Bing Search API
- Visual Crossing (Weather)

---

## 📊 1. Supabase Setup

### Step 1: Create Account
1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign up with GitHub (recommended) or email

### Step 2: Create Project
1. Click **New Project**
2. Choose organization (create one if needed)
3. Fill project details:
   - **Name**: `ojastack-mvp`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **Create new project** (takes ~2 minutes)

### Step 3: Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 4: Configure Authentication
1. Go to **Authentication** → **Settings**
2. Set **Site URL**: `https://ojastack.tech`
3. Add **Redirect URLs**:
   - `https://ojastack.tech/auth/callback`
   - `http://localhost:5173/auth/callback`

---

## 🤖 2. OpenAI API Setup

### Step 1: Create Account
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Verify your phone number

### Step 2: Add Payment Method
1. Go to **Billing** → **Payment methods**
2. Add credit card (required for API access)
3. Set usage limits to control costs

### Step 3: Generate API Key
1. Go to **API keys**
2. Click **Create new secret key**
3. Name it: `ojastack-mvp-production`
4. Copy the key: `sk-proj-...` (save immediately!)

### Step 4: Set Usage Limits
1. Go to **Billing** → **Usage limits**
2. Set monthly limit (e.g., $50 for testing)
3. Enable email notifications

---

## 🔍 3. Enhanced Search APIs

### Serper API (Google Search) - Recommended
1. Go to [serper.dev](https://serper.dev)
2. Sign up with Google
3. Get 2,500 free searches/month
4. Copy API key from dashboard

### Bing Search API (Alternative)
1. Go to [azure.microsoft.com](https://azure.microsoft.com)
2. Create free account
3. Create **Bing Search v7** resource
4. Copy API key from **Keys and Endpoint**

---

## 🌤️ 4. Weather APIs

### WeatherAPI (Recommended)
1. Go to [weatherapi.com](https://weatherapi.com)
2. Sign up for free account
3. Get 1M calls/month free
4. Copy API key from dashboard

### Visual Crossing (Alternative)
1. Go to [visualcrossing.com](https://www.visualcrossing.com)
2. Create free account
3. Get 1,000 records/day free
4. Copy API key from account page

---

## 🎙️ 5. Voice Integration APIs

### ElevenLabs (Text-to-Speech)
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up for free account
3. Get 10,000 characters/month free
4. Go to **Profile** → **API Key**
5. Copy the API key

### Deepgram (Speech-to-Text)
1. Go to [deepgram.com](https://deepgram.com)
2. Sign up for free account
3. Get $200 free credits
4. Go to **API Keys** in dashboard
5. Create new key and copy it

---

## 📱 6. WhatsApp Business API

### Step 1: Meta Business Account
1. Go to [business.facebook.com](https://business.facebook.com)
2. Create business account
3. Verify business information

### Step 2: WhatsApp Business API
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create new app → **Business**
3. Add **WhatsApp** product
4. Complete business verification (can take days)

### Step 3: Get Credentials
1. **Access Token**: From WhatsApp → Configuration
2. **Phone Number ID**: From WhatsApp → Phone Numbers
3. **Webhook Verify Token**: Create your own secure string

---

## 🔄 7. N8N Workflow Automation

### Option A: N8N Cloud (Recommended)
1. Go to [n8n.cloud](https://n8n.cloud)
2. Sign up for free account
3. Create workspace
4. Get API key from **Settings** → **API**

### Option B: Self-Hosted
1. Deploy N8N to your server:
   ```bash
   docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
   ```
2. Access at `http://your-server:5678`
3. Create admin account
4. Generate API key in settings

---

## 📝 Environment Variables Template

Create a `.env` file with these variables:

```bash
# === REQUIRED CREDENTIALS ===

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-your-openai-key

# App Configuration
VITE_APP_URL=https://ojastack.tech
VITE_API_URL=https://ojastack.tech/.netlify/functions

# === OPTIONAL ENHANCED FEATURES ===

# Search APIs
VITE_SERPER_API_KEY=your-serper-key
VITE_BING_API_KEY=your-bing-key

# Weather APIs
VITE_WEATHERAPI_KEY=your-weather-api-key
VITE_VISUALCROSSING_API_KEY=your-visual-crossing-key

# Voice APIs
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
VITE_DEEPGRAM_API_KEY=your-deepgram-key

# === ADVANCED INTEGRATIONS ===

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# N8N Integration
VITE_N8N_API_URL=https://your-n8n-instance.com/api/v1
VITE_N8N_API_KEY=your-n8n-api-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# Email Configuration (Optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@ojastack.tech
SMTP_PASS=your-email-password
```

---

## 🔒 Security Best Practices

### 1. API Key Management
- **Never commit keys to version control**
- Use environment variables only
- Rotate keys regularly (monthly recommended)
- Set usage limits on all APIs

### 2. Access Control
- Use least-privilege principle
- Monitor API usage regularly
- Set up alerts for unusual activity
- Keep backup keys secure

### 3. Development vs Production
- Use separate keys for dev/prod
- Lower limits for development keys
- Test with minimal permissions first

---

## 💰 Cost Estimation

### Free Tier Limits (Monthly)
- **Supabase**: 500MB database, 2GB bandwidth
- **OpenAI**: $5 free credit (new accounts)
- **Serper**: 2,500 searches
- **WeatherAPI**: 1M calls
- **ElevenLabs**: 10,000 characters
- **Deepgram**: $200 credit

### Estimated Monthly Costs (1000 users)
- **Supabase Pro**: $25/month
- **OpenAI**: $50-200 (depends on usage)
- **Serper**: $50 (10K searches)
- **WeatherAPI**: Free (under 1M calls)
- **ElevenLabs**: $22 (100K characters)
- **Total**: ~$150-300/month

---

## 🚨 Troubleshooting

### Common Issues
1. **Invalid API Key**: Double-check key format and permissions
2. **Rate Limits**: Monitor usage and upgrade plans
3. **CORS Errors**: Verify domain whitelist settings
4. **Webhook Failures**: Check URL accessibility and SSL

### Testing Your Setup
```bash
# Test OpenAI API
curl -H "Authorization: Bearer $VITE_OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test Supabase connection
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  $VITE_SUPABASE_URL/rest/v1/
```

### Getting Help
- Check service documentation
- Review error logs in Netlify/Supabase
- Contact support@ojastack.tech

---

**Next Step**: Once you have your credentials, follow the [Deployment Guide](./DEPLOYMENT_GUIDE.md) to deploy your platform.