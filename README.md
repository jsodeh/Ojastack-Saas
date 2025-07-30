# Ojastack - Agentic Framework for Customer Experience

A complete SAAS platform built with React, TypeScript, and modern integrations for creating intelligent AI agents that handle customer interactions across multiple channels.

## 🚀 Features

### Core Platform

- **Supabase Authentication** - Complete user authentication and session management
- **Interactive Dashboard** - Real-time analytics and agent management
- **Multi-Agent Support** - Chat, Voice, and Vision AI agents
- **Real-time Conversations** - Live customer interaction handling

### AI & Voice Integration

- **ElevenLabs Integration** - Advanced text-to-speech and speech-to-text
- **Voice Conversations** - Natural voice interactions with customers
- **Document Processing** - AI-powered document analysis and extraction
- **Custom Voice Settings** - Configurable voice parameters and selection

### Automation & Workflows

- **n8n Integration** - Visual workflow automation
- **MCP (Model Context Protocol)** - Extensible tool calling system
- **Custom Tool Calls** - AI agents with external API capabilities
- **Webhook Support** - Real-time event processing

### Platform Integrations

- **200+ Integrations** including:
  - **Messaging**: WhatsApp, Telegram, Slack, Discord, Instagram
  - **CRM**: Salesforce, HubSpot, Zendesk, Intercom
  - **E-commerce**: Shopify, WooCommerce, Magento
  - **Communication**: Twilio, Vonage, Microsoft Teams
  - **Analytics**: Google Analytics, Mixpanel
  - **Automation**: Zapier, Make (Integromat)

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Radix UI** for component library
- **React Router** for navigation
- **Recharts** for data visualization

### Backend Services

- **Supabase** - Database, authentication, real-time subscriptions
- **ElevenLabs** - Voice synthesis and speech recognition
- **n8n** - Workflow automation
- **MCP Servers** - Tool calling and external integrations

### Development

- **TypeScript** throughout
- **ESLint** and **Prettier** for code quality
- **Vitest** for testing

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ojastack
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Configure the following environment variables:

   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # ElevenLabs Configuration
   VITE_ELEVENLABS_API_KEY=your-elevenlabs-api-key

   # n8n Configuration (optional)
   VITE_N8N_API_URL=http://localhost:5678/api/v1
   VITE_N8N_API_KEY=your-n8n-api-key
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the database migrations:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  plan TEXT DEFAULT 'starter',
  usage_limit INTEGER DEFAULT 1000,
  current_usage INTEGER DEFAULT 0,

  PRIMARY KEY (id)
);

-- Create agents table
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('chat', 'voice', 'vision')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'training')) DEFAULT 'inactive',
  settings JSONB DEFAULT '{}',
  knowledge_base_id UUID,
  integrations TEXT[] DEFAULT '{}',
  conversation_count INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE
);

-- Create conversations table
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID,
  channel TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'escalated')) DEFAULT 'active',
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own agents" ON agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own agents" ON agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);
```

3. Set up authentication providers (email, Google, etc.)

### ElevenLabs Setup

1. Sign up for ElevenLabs account
2. Get your API key from the dashboard
3. Add the API key to your environment variables

### n8n Setup (Optional)

1. Install n8n locally or use cloud version:

   ```bash
   npm install n8n -g
   n8n start
   ```

2. Access n8n at `http://localhost:5678`
3. Create workflows using the provided templates
4. Configure webhook endpoints for Ojastack integration

## 🎯 Usage

### Authentication

- Sign up or log in to access the dashboard
- User profiles are automatically created in Supabase
- Session management is handled automatically

### Creating AI Agents

1. Navigate to Dashboard → AI Agents
2. Click "Create New Agent"
3. Choose agent type (Chat, Voice, or Vision)
4. Configure settings and integrations
5. Train with your knowledge base

### Voice Integration

- Use the Interactive Demo to test voice capabilities
- Configure voice settings (stability, similarity boost, style)
- Select from available ElevenLabs voices
- Real-time speech-to-text and text-to-speech processing

### Workflow Automation

- Connect n8n for advanced workflow automation
- Use pre-built templates for common use cases
- Create custom workflows with visual editor
- Integrate with external APIs and services

### MCP Tool Calling

- Agents can call external tools and APIs
- Extensible through MCP (Model Context Protocol)
- Pre-configured tools for common tasks
- Custom tool development supported

## 🔌 Integration Examples

### WhatsApp Business Integration

```typescript
import { mcpClient } from "@/lib/mcp-integration";

// Setup WhatsApp webhook to process incoming messages
const handleWhatsAppMessage = async (message: any) => {
  const response = await mcpClient.callTool("whatsapp:send-message", {
    to: message.from,
    message: await processWithAI(message.text),
  });
};
```

### Voice Call Handling

```typescript
import { elevenLabs, audioManager } from "@/lib/elevenlabs";

// Process voice call with AI
const handleVoiceCall = async (audioBlob: Blob) => {
  const transcription = await elevenLabs.speechToText({ audio: audioBlob });
  const aiResponse = await processWithAI(transcription.text);
  const audioResponse = await elevenLabs.textToSpeech({
    voice_id: "selected-voice-id",
    text: aiResponse,
  });
  await audioManager.playAudio(audioResponse);
};
```

### Document Processing

```typescript
// Process uploaded documents with Vision AI
const processDocument = async (file: File) => {
  const analysis = await visionAI.analyzeDocument(file);
  return {
    summary: analysis.summary,
    entities: analysis.entities,
    insights: analysis.insights,
  };
};
```

## 📊 Dashboard Features

### Overview

- Real-time metrics and analytics
- Agent performance monitoring
- Usage tracking and limits
- Quick action shortcuts

### Agent Management

- Create and configure AI agents
- Monitor agent activity and performance
- Manage integrations and settings
- View conversation history

### Interactive Demo

- Test voice capabilities with ElevenLabs
- Try document processing with Vision AI
- Experiment with tool calling and MCP integrations
- Real-time chat interface

### Integrations

- Browse 200+ available integrations
- One-click connection setup
- Configuration management
- Usage monitoring

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

### Using Netlify (Recommended)

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on every push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 Documentation Links

- [ElevenLabs API Documentation](https://elevenlabs.io/docs/api-reference/introduction)
- [n8n Documentation](https://docs.n8n.io/)
- [MCP Documentation](https://modelcontextprotocol.io/docs/getting-started/intro)
- [Volt Agents Documentation](https://voltagent.dev/docs/)
- [Supabase Documentation](https://supabase.com/docs)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: [docs.ojastack.tech](https://docs.ojastack.tech)
- Community: [Discord](https://discord.gg/ojastack)
- Email: support@ojastack.tech
- GitHub Issues: [GitHub Issues](https://github.com/ojastack/ojastack/issues)

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io) for voice AI technology
- [Supabase](https://supabase.com) for backend infrastructure
- [n8n](https://n8n.io) for workflow automation
- [Radix UI](https://radix-ui.com) for component primitives
- [TailwindCSS](https://tailwindcss.com) for styling system
