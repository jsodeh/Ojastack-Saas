// n8n Workflow Automation Integration
// Based on https://docs.n8n.io/

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  connections: any;
  nodes: N8nNode[];
  settings: any;
  staticData: any;
  pinData: any;
  versionId: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: any;
  credentials?: any;
  webhookId?: string;
  workflowId?: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode:
    | "cli"
    | "error"
    | "integrated"
    | "internal"
    | "manual"
    | "retry"
    | "trigger"
    | "webhook";
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: Date;
  stoppedAt?: Date;
  workflowData: N8nWorkflow;
  data: any;
}

export interface N8nWebhookData {
  workflowId: string;
  webhookId: string;
  httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  path: string;
  isTest: boolean;
  userId: string;
}

class N8nService {
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;

  constructor(
    baseUrl: string = "http://localhost:5678/api/v1",
    apiKey: string = "",
    webhookUrl: string = "",
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": this.apiKey,
    };
  }

  // Workflow Management
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      // Check if n8n is configured and available
      if (!this.baseUrl || !this.apiKey) {
        console.warn("n8n not configured, returning empty workflows");
        return [];
      }

      const response = await fetch(`${this.baseUrl}/workflows`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn("n8n not available, returning empty workflows:", error.message);
      return [];
    }
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching workflow:", error);
      throw error;
    }
  }

  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  }

  async updateWorkflow(
    workflowId: string,
    workflow: Partial<N8nWorkflow>,
  ): Promise<N8nWorkflow> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating workflow:", error);
      throw error;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error("Error deleting workflow:", error);
      throw error;
    }
  }

  async activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    try {
      const response = await fetch(
        `${this.baseUrl}/workflows/${workflowId}/activate`,
        {
          method: "POST",
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error activating workflow:", error);
      throw error;
    }
  }

  async deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    try {
      const response = await fetch(
        `${this.baseUrl}/workflows/${workflowId}/deactivate`,
        {
          method: "POST",
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error deactivating workflow:", error);
      throw error;
    }
  }

  // Execution Management
  async getExecutions(workflowId?: string): Promise<N8nExecution[]> {
    try {
      const url = workflowId
        ? `${this.baseUrl}/executions?filter={"workflowId": "${workflowId}"}`
        : `${this.baseUrl}/executions`;

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching executions:", error);
      throw error;
    }
  }

  async getExecution(executionId: string): Promise<N8nExecution> {
    try {
      const response = await fetch(
        `${this.baseUrl}/executions/${executionId}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching execution:", error);
      throw error;
    }
  }

  async deleteExecution(executionId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/executions/${executionId}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Error deleting execution:", error);
      throw error;
    }
  }

  async retryExecution(executionId: string): Promise<N8nExecution> {
    try {
      const response = await fetch(
        `${this.baseUrl}/executions/${executionId}/retry`,
        {
          method: "POST",
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error retrying execution:", error);
      throw error;
    }
  }

  // Manual Workflow Execution
  async executeWorkflow(
    workflowId: string,
    data: any = {},
  ): Promise<N8nExecution> {
    try {
      const response = await fetch(
        `${this.baseUrl}/workflows/${workflowId}/execute`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ data }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error executing workflow:", error);
      throw error;
    }
  }

  // Webhook Integration
  async triggerWebhook(
    webhookPath: string,
    data: any,
    method: "GET" | "POST" = "POST",
  ): Promise<any> {
    try {
      const url = `${this.webhookUrl}/${webhookPath}`;

      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (method === "POST") {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error triggering webhook:", error);
      throw error;
    }
  }

  // Create workflow templates for common Ojastack use cases
  createCustomerSupportWorkflow(): Partial<N8nWorkflow> {
    return {
      name: "Ojastack Customer Support Automation",
      active: false,
      nodes: [
        {
          id: "webhook",
          name: "Customer Query Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: "POST",
            path: "customer-support",
            responseMode: "responseNode",
          },
        },
        {
          id: "ojastack-agent",
          name: "Process with Ojastack AI",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 2,
          position: [450, 300],
          parameters: {
            url: "{{$env.OJASTACK_API_URL}}/api/v1/conversations",
            method: "POST",
            headers: {
              Authorization: "Bearer {{$env.OJASTACK_API_KEY}}",
              "Content-Type": "application/json",
            },
            body: {
              agent_id: "{{$env.OJASTACK_AGENT_ID}}",
              message: "={{$json.message}}",
              customer_id: "={{$json.customer_id}}",
              channel: "webhook",
            },
          },
        },
        {
          id: "response",
          name: "Send Response",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1,
          position: [650, 300],
          parameters: {
            responseBody: "={{$json.response}}",
            options: {
              responseCode: 200,
              responseHeaders: {
                "Content-Type": "application/json",
              },
            },
          },
        },
      ],
      connections: {
        "Customer Query Webhook": {
          main: [["Process with Ojastack AI"]],
        },
        "Process with Ojastack AI": {
          main: [["Send Response"]],
        },
      },
      tags: ["ojastack", "customer-support", "ai"],
    };
  }

  createLeadQualificationWorkflow(): Partial<N8nWorkflow> {
    return {
      name: "Ojastack Lead Qualification",
      active: false,
      nodes: [
        {
          id: "webhook",
          name: "New Lead Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: "POST",
            path: "lead-qualification",
          },
        },
        {
          id: "qualify-lead",
          name: "Qualify Lead with AI",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 2,
          position: [450, 300],
          parameters: {
            url: "{{$env.OJASTACK_API_URL}}/api/v1/tools/qualify-lead",
            method: "POST",
            headers: {
              Authorization: "Bearer {{$env.OJASTACK_API_KEY}}",
            },
            body: {
              lead_data: "={{$json}}",
            },
          },
        },
        {
          id: "update-crm",
          name: "Update CRM",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 2,
          position: [650, 300],
          parameters: {
            url: "{{$env.CRM_API_URL}}/leads/{{$json.lead_id}}",
            method: "PUT",
            headers: {
              Authorization: "Bearer {{$env.CRM_API_KEY}}",
            },
            body: {
              qualification_score: "={{$json.qualification_score}}",
              qualified: "={{$json.qualified}}",
              next_action: "={{$json.next_action}}",
            },
          },
        },
      ],
      connections: {
        "New Lead Webhook": {
          main: [["Qualify Lead with AI"]],
        },
        "Qualify Lead with AI": {
          main: [["Update CRM"]],
        },
      },
      tags: ["ojastack", "lead-qualification", "crm"],
    };
  }
}

export const n8nService = new N8nService(
  import.meta.env.VITE_N8N_API_URL,
  import.meta.env.VITE_N8N_API_KEY,
  import.meta.env.VITE_N8N_WEBHOOK_URL,
);

// Helper functions for common n8n integrations
export const n8nHelpers = {
  // Create a webhook URL for Ojastack integrations
  createOjastackWebhook: (workflowName: string) => {
    const baseUrl =
      import.meta.env.VITE_N8N_WEBHOOK_URL || "http://localhost:5678/webhook";
    return `${baseUrl}/${workflowName.toLowerCase().replace(/\s+/g, "-")}`;
  },

  // Common workflow templates
  templates: {
    customerSupport: () => n8nService.createCustomerSupportWorkflow(),
    leadQualification: () => n8nService.createLeadQualificationWorkflow(),
  },

  // Validate n8n configuration
  validateConfig: () => {
    const requiredEnvVars = [
      "VITE_N8N_API_URL",
      "VITE_N8N_API_KEY",
      "VITE_N8N_WEBHOOK_URL",
    ];

    const missing = requiredEnvVars.filter(
      (varName) => !import.meta.env[varName],
    );

    if (missing.length > 0) {
      console.warn("Missing n8n configuration:", missing);
      return false;
    }

    return true;
  },
};
