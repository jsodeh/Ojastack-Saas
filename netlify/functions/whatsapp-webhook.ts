import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WhatsAppWebhookData {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
          audio?: {
            id: string;
            mime_type: string;
          };
          image?: {
            id: string;
            mime_type: string;
            sha256: string;
            caption?: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  try {
    const method = event.httpMethod;
    const path = event.path;

    // Extract agent ID from path (e.g., /whatsapp-webhook/agent_123)
    const pathParts = path.split('/');
    const agentId = pathParts[pathParts.length - 1];

    if (method === 'GET') {
      // WhatsApp webhook verification
      return await verifyWebhook(event, headers);
    } else if (method === 'POST') {
      // Handle incoming WhatsApp message
      const webhookData: WhatsAppWebhookData = JSON.parse(event.body || '{}');
      return await handleWhatsAppMessage(webhookData, agentId, headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Error in WhatsApp webhook:", error);
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

// Verify WhatsApp webhook
async function verifyWebhook(event: any, headers: any) {
  const mode = event.queryStringParameters?.['hub.mode'];
  const token = event.queryStringParameters?.['hub.verify_token'];
  const challenge = event.queryStringParameters?.['hub.challenge'];

  if (mode === 'subscribe') {
    // Find deployment with matching verify token
    const { data: deployment } = await supabase
      .from('whatsapp_deployments')
      .select('*')
      .eq('webhook_verify_token', token)
      .single();

    if (deployment) {
      console.log('WhatsApp webhook verified for deployment:', deployment.id);
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "text/plain" },
        body: challenge,
      };
    }
  }

  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: "Forbidden" }),
  };
}

// Handle incoming WhatsApp message
async function handleWhatsAppMessage(webhookData: WhatsAppWebhookData, agentId: string, headers: any) {
  try {
    console.log('Received WhatsApp webhook:', JSON.stringify(webhookData, null, 2));

    if (webhookData.object !== 'whatsapp_business_account') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Not a WhatsApp business account webhook" }),
      };
    }

    for (const entry of webhookData.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value.messages) {
          await processWhatsAppMessages(change.value, agentId);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Webhook processed successfully" }),
    };
  } catch (error) {
    console.error('Error handling WhatsApp message:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to process webhook" }),
    };
  }
}

// Process WhatsApp messages
async function processWhatsAppMessages(messageData: any, agentId: string) {
  try {
    const { messages, contacts, metadata } = messageData;

    // Find the WhatsApp deployment for this phone number
    const { data: deployment, error: deploymentError } = await supabase
      .from('whatsapp_deployments')
      .select('*')
      .eq('business_phone_number', metadata.phone_number_id)
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .single();

    if (deploymentError || !deployment) {
      console.error('No active deployment found for phone number:', metadata.phone_number_id);
      return;
    }

    for (const message of messages) {
      const contact = contacts?.find(c => c.wa_id === message.from);
      
      // Skip if message is from business (outgoing)
      if (message.from === metadata.display_phone_number) {
        continue;
      }

      let messageContent = '';
      let messageType = 'text';

      // Extract message content based on type
      switch (message.type) {
        case 'text':
          messageContent = message.text?.body || '';
          break;
        case 'audio':
          messageContent = '[Audio message]';
          messageType = 'audio';
          break;
        case 'image':
          messageContent = message.image?.caption || '[Image]';
          messageType = 'image';
          break;
        default:
          messageContent = `[${message.type} message]`;
          break;
      }

      // Process message with agent platform
      const messagePayload = {
        agent_id: agentId,
        customer_id: message.from,
        channel: 'whatsapp',
        content: messageContent,
        type: messageType,
        metadata: {
          whatsapp_message_id: message.id,
          timestamp: message.timestamp,
          phone_number_id: metadata.phone_number_id,
        },
        customer_name: contact?.profile?.name,
        customer_phone: message.from,
      };

      // Process through agent runtime (simplified for serverless)
      const conversationResult = await processMessageWithAgent(messagePayload, deployment);

      // Send response back to WhatsApp
      await sendWhatsAppMessage(
        deployment,
        message.from,
        conversationResult.response
      );

      // Update deployment statistics
      await supabase
        .from('whatsapp_deployments')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: supabase.raw('message_count + 1')
        })
        .eq('id', deployment.id);
    }
  } catch (error) {
    console.error('Error processing WhatsApp messages:', error);
  }
}

// Process message with agent (simplified for serverless environment)
async function processMessageWithAgent(messagePayload: any, deployment: any) {
  try {
    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', messagePayload.agent_id)
      .eq('status', 'active')
      .single();

    if (agentError || !agent) {
      console.error('Agent not found or inactive:', messagePayload.agent_id);
      return { response: "I'm sorry, but I'm currently unavailable. Please try again later." };
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(messagePayload, deployment.user_id);
    if (!conversation) {
      return { response: "I'm sorry, but I couldn't start our conversation. Please try again." };
    }

    // Add user message to conversation
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: messagePayload.content,
        type: messagePayload.type,
        metadata: messagePayload.metadata,
      });

    // Generate AI response (simplified)
    const aiResponse = await generateAgentResponse(agent, conversation.id, messagePayload.content);

    // Add agent response to conversation
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'agent',
        content: aiResponse,
        type: 'text',
        metadata: {},
      });

    // Update conversation activity
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    return { response: aiResponse };

  } catch (error) {
    console.error('Error processing message with agent:', error);
    return { response: "I apologize, but I encountered an error. Please try again." };
  }
}

// Get or create conversation
async function getOrCreateConversation(messagePayload: any, userId: string) {
  try {
    // Check for existing active conversation
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', messagePayload.agent_id)
      .eq('customer_id', messagePayload.customer_id)
      .eq('channel', messagePayload.channel)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        agent_id: messagePayload.agent_id,
        user_id: userId,
        customer_id: messagePayload.customer_id,
        channel: messagePayload.channel,
        status: 'active',
        customer_name: messagePayload.customer_name,
        customer_phone: messagePayload.customer_phone,
        metadata: { channel_specific: messagePayload.metadata },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return newConversation;

  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    return null;
  }
}

// Generate agent response (simplified AI integration)
async function generateAgentResponse(agent: any, conversationId: string, userMessage: string): Promise<string> {
  try {
    // Get recent conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Prepare conversation context
    const conversationHistory = messages?.reverse().map(msg => ({
      role: msg.role === 'agent' ? 'assistant' : 'user',
      content: msg.content,
    })) || [];

    // Add system message with agent personality
    const systemMessage = {
      role: 'system',
      content: `${agent.personality}\n\nInstructions: ${agent.instructions}`,
    };

    // For now, return a simple response
    // In production, this would call OpenAI/Claude API
    const responses = [
      "Thank you for your message! I'm here to help you.",
      "I understand your request. Let me assist you with that.",
      "That's a great question! Here's what I can tell you...",
      "I'm happy to help you with this. Let me provide you with the information you need.",
      "Thanks for reaching out! I'll do my best to assist you.",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return randomResponse;

  } catch (error) {
    console.error('Error generating agent response:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again.";
  }
}

// Send message back to WhatsApp
async function sendWhatsAppMessage(deployment: any, to: string, message: string) {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/v18.0/${deployment.business_phone_number}/messages`;

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deployment.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to send WhatsApp message:', errorData);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

export { handler };