import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

// Initialize Supabase client with service role key for edge function
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ChatRequest {
  message: string;
  conversationId?: string;
  userId?: string;
  agentId?: string;
  isVoice?: boolean;
  agentPrompt?: string;
}

interface ChatResponse {
  response: string;
  conversationId: string;
  audioUrl?: string;
  error?: string;
}

const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body: ChatRequest = JSON.parse(event.body || "{}");
    const { message, conversationId, userId, agentId, isVoice, agentPrompt } =
      body;

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    // Default agent prompt for Ojastack AI assistant
    const systemPrompt =
      agentPrompt ||
      `You are a helpful AI assistant for Ojastack, a platform that creates intelligent AI agents for businesses. 
    
Key information about Ojastack:
- We help businesses create AI agents for customer support, sales, and automation
- Our platform supports text, voice, and vision AI capabilities powered by ElevenLabs
- We offer integrations with 200+ platforms including WhatsApp, Telegram, Slack, HubSpot, Salesforce
- Our agents can handle real conversations, understand context, and provide personalized responses
- We use advanced AI models for natural language processing and generation
- Our voice AI supports speech-to-text, text-to-speech, and real-time voice conversations
- We provide n8n workflow automation for complex business processes
- Users can build, deploy, and manage AI agents through our intuitive dashboard

When responding:
- Be helpful, professional, and knowledgeable about AI and business automation
- Provide specific examples of how Ojastack can solve business problems
- Ask follow-up questions to better understand the user's needs
- Keep responses conversational and engaging
- If asked about technical details, provide accurate information about our capabilities
- Always aim to demonstrate the value of AI agents for business growth

Respond naturally to the user's message.`;

    // Generate AI response using OpenAI
    const aiResponse = await generateAIResponse(message, systemPrompt);

    let audioUrl: string | undefined;

    // Generate voice if requested and ElevenLabs API key is available
    if (isVoice && elevenLabsApiKey) {
      audioUrl = await generateVoiceResponse(aiResponse);
    }

    // Store conversation in Supabase
    const conversationData = await storeConversation({
      conversationId,
      userId,
      agentId,
      userMessage: message,
      aiResponse,
      audioUrl,
    });

    const response: ChatResponse = {
      response: aiResponse,
      conversationId: conversationData.conversationId,
      audioUrl,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error in AI chat function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

async function generateAIResponse(
  message: string,
  systemPrompt: string,
): Promise<string> {
  if (!openaiApiKey) {
    // Fallback to contextual responses if OpenAI is not configured
    return generateContextualResponse(message);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return (
      data.choices[0]?.message?.content || generateContextualResponse(message)
    );
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    return generateContextualResponse(message);
  }
}

function generateContextualResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Context-aware responses based on keywords
  if (lowerMessage.includes("voice") || lowerMessage.includes("speech")) {
    return "Our voice AI capabilities are powered by ElevenLabs, providing natural speech-to-text and text-to-speech conversion. You can have real-time voice conversations with our AI agents, making customer interactions feel more human and engaging. Would you like to try our voice demo?";
  }

  if (
    lowerMessage.includes("integration") ||
    lowerMessage.includes("connect")
  ) {
    return "Ojastack supports 200+ integrations including WhatsApp, Telegram, Slack, HubSpot, Salesforce, and many more. Our agents can seamlessly work across all your existing tools and platforms. We also provide n8n workflow automation for complex business processes. What specific platforms would you like to integrate with?";
  }

  if (lowerMessage.includes("business") || lowerMessage.includes("company")) {
    return "AI agents can transform your business by automating customer support, qualifying leads, handling inquiries 24/7, and improving response times. Our clients typically see 60% reduction in support tickets and 40% increase in customer satisfaction. What specific business challenges are you looking to solve?";
  }

  if (
    lowerMessage.includes("price") ||
    lowerMessage.includes("cost") ||
    lowerMessage.includes("plan")
  ) {
    return "We offer flexible pricing plans to suit businesses of all sizes. Our plans include different usage limits, integrations, and advanced features. You can start with our free tier to explore the platform. Would you like to see our pricing details or schedule a demo to discuss your specific needs?";
  }

  if (
    lowerMessage.includes("feature") ||
    lowerMessage.includes("capability") ||
    lowerMessage.includes("what")
  ) {
    return "Ojastack offers comprehensive AI agent capabilities including: real-time text and voice conversations, multi-platform integrations, custom knowledge bases, workflow automation, analytics and reporting, and advanced AI models. Our agents can handle customer support, sales qualification, appointment scheduling, and much more. What specific use case interests you most?";
  }

  if (
    lowerMessage.includes("demo") ||
    lowerMessage.includes("try") ||
    lowerMessage.includes("test")
  ) {
    return "Great! You're already experiencing our live AI demo. Our agents can engage in natural conversations, understand context, and provide personalized responses. You can also try our voice AI features using the Voice tab above. Would you like to explore any specific capabilities or schedule a personalized demo for your business?";
  }

  if (
    lowerMessage.includes("help") ||
    lowerMessage.includes("support") ||
    lowerMessage.includes("how")
  ) {
    return "I'm here to help! As an Ojastack AI agent, I can assist you with understanding our platform, exploring features, discussing integration options, or answering any questions about AI automation for your business. Feel free to ask me anything about how AI agents can benefit your organization.";
  }

  // Default contextual response
  return `Thank you for your message about "${message}". As an Ojastack AI agent, I understand you're interested in learning more about our platform. We specialize in creating intelligent AI agents that can handle customer interactions, automate business processes, and integrate with your existing tools. Our agents support text, voice, and vision capabilities with real-time responses. What specific aspect of AI automation would you like to explore further?`;
}

async function generateVoiceResponse(
  text: string,
): Promise<string | undefined> {
  if (!elevenLabsApiKey) {
    return undefined;
  }

  try {
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default ElevenLabs voice

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    // Return data URL for immediate use
    return `data:audio/mpeg;base64,${audioBase64}`;
  } catch (error) {
    console.error("Error generating voice response:", error);
    return undefined;
  }
}

interface ConversationData {
  conversationId?: string;
  userId?: string;
  agentId?: string;
  userMessage: string;
  aiResponse: string;
  audioUrl?: string;
}

async function storeConversation(data: ConversationData) {
  const { conversationId, userId, agentId, userMessage, aiResponse, audioUrl } =
    data;

  try {
    let currentConversationId = conversationId;

    // Create new conversation if none exists
    if (!currentConversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          agent_id: agentId || "default-agent",
          user_id: userId || "anonymous",
          channel: "web-chat",
          status: "active",
          messages: [],
          metadata: { source: "ai-chat-function" },
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
      } else {
        currentConversationId = newConversation?.id;
      }
    }

    // Update conversation with new messages
    if (currentConversationId) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("messages")
        .eq("id", currentConversationId)
        .single();

      const existingMessages = conversation?.messages || [];
      const newMessages = [
        ...existingMessages,
        {
          type: "user",
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
        {
          type: "agent",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          audioUrl,
        },
      ];

      await supabase
        .from("conversations")
        .update({ messages: newMessages })
        .eq("id", currentConversationId);
    }

    return {
      conversationId: currentConversationId || "temp-conversation",
    };
  } catch (error) {
    console.error("Error storing conversation:", error);
    return {
      conversationId: "temp-conversation",
    };
  }
}

export { handler };
