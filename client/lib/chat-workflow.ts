import { n8nService } from "./n8n-integration";
import { supabase } from "./supabase";

export interface ChatWorkflowRequest {
  message: string;
  userId?: string;
  conversationId?: string;
  isVoice?: boolean;
  agentPrompt?: string;
}

export interface ChatWorkflowResponse {
  response: string;
  conversationId: string;
  audioUrl?: string;
  error?: string;
}

class ChatWorkflowService {
  private workflowId?: string;
  private webhookPath = "ai-chat";

  // Initialize the chat workflow
  async initializeWorkflow(): Promise<void> {
    try {
      // Check if workflow already exists
      const workflows = await n8nService.getWorkflows();
      const existingWorkflow = workflows.find(
        (w) => w.name === "Ojastack AI Chat",
      );

      if (existingWorkflow) {
        this.workflowId = existingWorkflow.id;
        // Activate if not already active
        if (!existingWorkflow.active) {
          await n8nService.activateWorkflow(existingWorkflow.id);
        }
        return;
      }

      // Create new workflow if it doesn't exist
      const workflowConfig = this.createChatWorkflow();
      const createdWorkflow = await n8nService.createWorkflow(workflowConfig);
      this.workflowId = createdWorkflow.id;

      // Activate the workflow
      await n8nService.activateWorkflow(createdWorkflow.id);
    } catch (error) {
      console.error("Failed to initialize chat workflow:", error);
      // Continue without n8n if it fails
    }
  }

  // Send message through AI chat (with fallback to direct function call)
  async sendMessage(
    request: ChatWorkflowRequest,
  ): Promise<ChatWorkflowResponse> {
    try {
      // Try n8n workflow first
      if (this.workflowId) {
        return await this.sendThroughN8n(request);
      }
    } catch (error) {
      console.warn(
        "n8n workflow failed, falling back to direct API call:",
        error,
      );
    }

    // Fallback to direct Netlify function call
    return await this.sendDirectly(request);
  }

  // Send through n8n webhook
  private async sendThroughN8n(
    request: ChatWorkflowRequest,
  ): Promise<ChatWorkflowResponse> {
    try {
      const response = await n8nService.triggerWebhook(
        this.webhookPath,
        request,
      );
      return response;
    } catch (error) {
      console.error("n8n webhook error:", error);
      throw error;
    }
  }

  // Direct API call to Netlify function
  private async sendDirectly(
    request: ChatWorkflowRequest,
  ): Promise<ChatWorkflowResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI responses

      const response = await fetch("/.netlify/functions/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - AI service is taking too long to respond');
      }
      console.error("Direct API call error:", error);
      throw error;
    }
  }

  // Create n8n workflow configuration for AI chat
  private createChatWorkflow() {
    return {
      name: "Ojastack AI Chat",
      active: false,
      nodes: [
        {
          id: "webhook-trigger",
          name: "Chat Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [200, 300],
          parameters: {
            httpMethod: "POST",
            path: this.webhookPath,
            responseMode: "responseNode",
            options: {
              noResponseBody: false,
            },
          },
        },
        {
          id: "validate-input",
          name: "Validate Input",
          type: "n8n-nodes-base.function",
          typeVersion: 1,
          position: [400, 300],
          parameters: {
            functionCode: `
// Validate and prepare input data
const input = items[0].json;

if (!input.message) {
  throw new Error('Message is required');
}

// Prepare data for AI chat function
const chatRequest = {
  message: input.message,
  userId: input.userId || 'anonymous',
  conversationId: input.conversationId,
  isVoice: input.isVoice || false,
  agentPrompt: input.agentPrompt
};

return { json: chatRequest };
            `,
          },
        },
        {
          id: "ai-chat-function",
          name: "Call AI Chat Function",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 2,
          position: [600, 300],
          parameters: {
            url: "{{ $env.SITE_URL }}/.netlify/functions/ai-chat",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              message: "={{ $json.message }}",
              userId: "={{ $json.userId }}",
              conversationId: "={{ $json.conversationId }}",
              isVoice: "={{ $json.isVoice }}",
              agentPrompt: "={{ $json.agentPrompt }}",
            },
            options: {
              timeout: 30000,
            },
          },
        },
        {
          id: "process-response",
          name: "Process Response",
          type: "n8n-nodes-base.function",
          typeVersion: 1,
          position: [800, 300],
          parameters: {
            functionCode: `
// Process AI response and add metadata
const response = items[0].json;

// Add processing timestamp and metadata
const processedResponse = {
  ...response,
  processedAt: new Date().toISOString(),
  source: 'n8n-workflow',
  workflowId: '$workflow.id'
};

return { json: processedResponse };
            `,
          },
        },
        {
          id: "webhook-response",
          name: "Send Response",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [1000, 300],
          parameters: {
            responseBody: "={{ JSON.stringify($json) }}",
            options: {
              responseCode: 200,
              responseHeaders: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          },
        },
        {
          id: "error-handler",
          name: "Error Handler",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [1000, 500],
          parameters: {
            responseBody:
              '{{ JSON.stringify({"error": "Internal server error", "details": $json.error}) }}',
            options: {
              responseCode: 500,
              responseHeaders: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          },
        },
      ],
      connections: {
        "Chat Webhook": {
          main: [["Validate Input"]],
        },
        "Validate Input": {
          main: [["Call AI Chat Function"]],
        },
        "Call AI Chat Function": {
          main: [["Process Response"]],
          error: [["Error Handler"]],
        },
        "Process Response": {
          main: [["Send Response"]],
        },
      },
      settings: {
        executionOrder: "v1",
        saveManualExecutions: true,
        callerPolicy: "workflowsFromSameOwner",
        errorWorkflow: undefined,
        timezone: "America/New_York",
        saveExecutionProgress: false,
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
      },
      tags: ["ojastack", "ai-chat", "automation"],
    };
  }

  // Get workflow status
  async getWorkflowStatus(): Promise<{
    exists: boolean;
    active: boolean;
    workflowId?: string;
  }> {
    try {
      if (!this.workflowId) {
        return { exists: false, active: false };
      }

      const workflow = await n8nService.getWorkflow(this.workflowId);
      return {
        exists: true,
        active: workflow.active,
        workflowId: this.workflowId,
      };
    } catch (error) {
      return { exists: false, active: false };
    }
  }

  // Get recent chat executions
  async getRecentExecutions(limit: number = 10) {
    try {
      if (!this.workflowId) {
        return [];
      }

      const executions = await n8nService.getExecutions(this.workflowId);
      return executions.slice(0, limit);
    } catch (error) {
      console.error("Error fetching executions:", error);
      return [];
    }
  }
}

// Export singleton instance
export const chatWorkflowService = new ChatWorkflowService();

// Initialize workflow on service creation
chatWorkflowService.initializeWorkflow().catch((error) => {
  console.warn("Failed to initialize n8n chat workflow:", error);
});

// Helper functions for chat integration
export const chatHelpers = {
  // Check if n8n is properly configured
  isN8nConfigured: () => {
    return !!(
      import.meta.env.VITE_N8N_API_URL &&
      import.meta.env.VITE_N8N_API_KEY &&
      import.meta.env.VITE_N8N_WEBHOOK_URL
    );
  },

  // Get chat webhook URL
  getChatWebhookUrl: () => {
    const baseUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    return baseUrl ? `${baseUrl}/ai-chat` : null;
  },

  // Generate conversation context for better AI responses
  generateConversationContext: (messages: any[]) => {
    const recentMessages = messages.slice(-5); // Last 5 messages for context
    return recentMessages
      .map((msg) => `${msg.type}: ${msg.content}`)
      .join("\n");
  },

  // Extract user intent from message
  extractUserIntent: (message: string) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("demo") || lowerMessage.includes("try")) {
      return "demo_request";
    }
    if (lowerMessage.includes("price") || lowerMessage.includes("cost")) {
      return "pricing_inquiry";
    }
    if (
      lowerMessage.includes("integration") ||
      lowerMessage.includes("connect")
    ) {
      return "integration_question";
    }
    if (lowerMessage.includes("voice") || lowerMessage.includes("speech")) {
      return "voice_inquiry";
    }
    if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
      return "support_request";
    }

    return "general_inquiry";
  },
};
