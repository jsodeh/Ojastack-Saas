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

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  type: string;
  content: any;
  phone_number_id: string;
}

// Helper function to decode webhook identifier
function decodeWebhookIdentifier(identifier: string): { userId: string; credentialId: string } | null {
  try {
    const decoded = atob(identifier);
    const [userId, credentialId] = decoded.split(':');
    
    if (!userId || !credentialId) {
      return null;
    }
    
    return { userId, credentialId };
  } catch (error) {
    console.error('Failed to decode webhook identifier:', error);
    return null;
  }
}

// Helper function to find target agent
async function findTargetAgent(phoneNumberId: string, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('agent_whatsapp_configs')
      .select('agent_id, agents!inner(*)')
      .eq('phone_number_id', phoneNumberId)
      .eq('enabled', true)
      .eq('agents.user_id', userId)
      .single();

    if (error || !data) {
      console.log('No agent found for phone number:', phoneNumberId, 'user:', userId);
      return null;
    }

    return data.agent_id;
  } catch (error) {
    console.error('Failed to find target agent:', error);
    return null;
  }
}

// Helper function to store incoming message
async function storeIncomingMessage(
  message: WhatsAppMessage,
  agentId: string,
  credentialId: string
): Promise<void> {
  try {
    await supabase
      .from('whatsapp_messages')
      .insert({
        agent_id: agentId,
        credential_id: credentialId,
        whatsapp_message_id: message.id,
        from_phone: message.from,
        to_phone: message.to,
        direction: 'inbound',
        message_type: message.type,
        content: message.content,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
      });
  } catch (error) {
    console.error('Failed to store incoming message:', error);
    // Don't throw here to avoid breaking message processing
  }
}

// Helper function to process message with agent
async function processMessageWithAgent(agentId: string, message: WhatsAppMessage): Promise<void> {
  try {
    // Create or get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('customer_id', message.from)
      .eq('channel', 'whatsapp')
      .single();

    let conversationId = conversation?.id;

    if (!conversationId) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          customer_id: message.from,
          channel: 'whatsapp',
          status: 'active',
          metadata: {
            phone_number: message.from,
            display_phone_number: message.to
          }
        })
        .select('id')
        .single();

      if (createError) {
        throw createError;
      }

      conversationId = newConv.id;
    }

    // Store the message in conversation
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message.type === 'text' ? message.content.text?.body || '' : `[${message.type} message]`,
        metadata: {
          whatsapp_message_id: message.id,
          message_type: message.type,
          phone_number: message.from,
          raw_content: message.content
        }
      });

    console.log(`Message processed for agent ${agentId}, conversation ${conversationId}`);
  } catch (error) {
    console.error('Failed to process message with agent:', error);
    throw error;
  }
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
    
    // Extract webhook identifier from query parameters
    const identifier = event.queryStringParameters?.id;
    
    if (method === 'GET') {
      // WhatsApp webhook verification
      return await verifyWebhook(event, headers);
    } else if (method === 'POST') {
      // Handle incoming WhatsApp message with user-specific routing
      const webhookData: WhatsAppWebhookData = JSON.parse(event.body || '{}');
      return await handleWhatsAppMessage(webhookData, identifier, headers);
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
  const identifier = event.queryStringParameters?.id;

  if (mode === 'subscribe' && identifier) {
    // Decode user and credential ID from identifier
    const decoded = decodeWebhookIdentifier(identifier);
    if (!decoded) {
      console.error('Invalid webhook identifier for verification');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Invalid webhook identifier" }),
      };
    }

    // Find webhook configuration with matching verify token
    const { data: webhook } = await supabase
      .from('whatsapp_webhooks')
      .select('*, whatsapp_credentials(*)')
      .eq('user_id', decoded.userId)
      .eq('credential_id', decoded.credentialId)
      .single();

    if (webhook && webhook.whatsapp_credentials?.webhook_verify_token === token) {
      console.log('WhatsApp webhook verified for user:', decoded.userId);
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "text/plain" },
        body: challenge,
      };
    }
  }

  console.error('Webhook verification failed:', { mode, token, identifier });
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: "Forbidden" }),
  };
}

// Handle incoming WhatsApp message with user-specific routing
async function handleWhatsAppMessage(webhookData: WhatsAppWebhookData, identifier: string | null, headers: any) {
  try {
    console.log('Received WhatsApp webhook:', JSON.stringify(webhookData, null, 2));

    if (webhookData.object !== 'whatsapp_business_account') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Not a WhatsApp business account webhook" }),
      };
    }

    if (!identifier) {
      console.error('No webhook identifier provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Webhook identifier required" }),
      };
    }

    // Decode user and credential ID
    const decoded = decodeWebhookIdentifier(identifier);
    if (!decoded) {
      console.error('Invalid webhook identifier');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid webhook identifier" }),
      };
    }

    for (const entry of webhookData.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value.messages) {
          await processWhatsAppMessages(change.value, decoded.userId, decoded.credentialId);
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

// Process WhatsApp messages with user-specific routing
async function processWhatsAppMessages(messageData: any, userId: string, credentialId: string) {
  try {
    const { messages, contacts, metadata } = messageData;

    // Find target agent for this phone number and user
    const agentId = await findTargetAgent(metadata.phone_number_id, userId);
    if (!agentId) {
      console.error('No agent found for phone number:', metadata.phone_number_id, 'user:', userId);
      return;
    }

    for (const message of messages) {
      const contact = contacts?.find(c => c.wa_id === message.from);
      
      // Skip if message is from business (outgoing)
      if (message.from === metadata.display_phone_number) {
        continue;
      }

      // Create WhatsApp message object
      const whatsappMessage: WhatsAppMessage = {
        id: message.id,
        from: message.from,
        to: metadata.display_phone_number,
        timestamp: message.timestamp,
        type: message.type,
        content: message,
        phone_number_id: metadata.phone_number_id
      };

      // Store incoming message
      await storeIncomingMessage(whatsappMessage, agentId, credentialId);

      // Process message with agent
      await processMessageWithAgent(agentId, whatsappMessage);

      console.log(`Processed WhatsApp message ${message.id} for agent ${agentId}`);
    }
  } catch (error) {
    console.error('Error processing WhatsApp messages:', error);
  }
}

// Note: processMessageWithAgent function is implemented above in the helper functions section

// Old functions removed - using new user-specific routing approach

export { handler };