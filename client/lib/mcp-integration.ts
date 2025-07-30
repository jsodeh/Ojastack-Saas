// Model Context Protocol (MCP) Integration
// Based on https://modelcontextprotocol.io/docs/getting-started/intro

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  capabilities: string[];
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (params: any) => Promise<any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface MCPMessage {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class MCPClient {
  private servers: Map<string, MCPServer> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private messageId = 1;

  // Initialize MCP servers based on configuration
  async initializeServers(
    serverConfigs: Array<{
      id: string;
      name: string;
      endpoint: string;
      description: string;
    }>,
  ): Promise<void> {
    for (const config of serverConfigs) {
      await this.connectToServer(config);
    }
  }

  // Connect to an MCP server
  async connectToServer(config: {
    id: string;
    name: string;
    endpoint: string;
    description: string;
  }): Promise<void> {
    try {
      const ws = new WebSocket(config.endpoint);

      const server: MCPServer = {
        id: config.id,
        name: config.name,
        description: config.description,
        version: "1.0.0",
        status: "connecting",
        capabilities: [],
        tools: [],
        resources: [],
        prompts: [],
      };

      this.servers.set(config.id, server);

      ws.onopen = async () => {
        console.log(`Connected to MCP server: ${config.name}`);
        server.status = "connected";

        // Initialize the server
        await this.sendMessage(config.id, {
          jsonrpc: "2.0",
          id: this.getNextId(),
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            clientInfo: {
              name: "Ojastack",
              version: "1.0.0",
            },
          },
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: MCPMessage = JSON.parse(event.data);
          this.handleMessage(config.id, message);
        } catch (error) {
          console.error("Error parsing MCP message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error(`MCP server error (${config.name}):`, error);
        server.status = "error";
      };

      ws.onclose = () => {
        console.log(`Disconnected from MCP server: ${config.name}`);
        server.status = "disconnected";
        this.websockets.delete(config.id);
      };

      this.websockets.set(config.id, ws);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error);
      const server = this.servers.get(config.id);
      if (server) {
        server.status = "error";
      }
    }
  }

  // Handle incoming messages from MCP servers
  private handleMessage(serverId: string, message: MCPMessage): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    if (message.method === "initialize" && message.result) {
      // Handle initialization response
      const result = message.result;
      server.capabilities = Object.keys(result.capabilities || {});
      server.version = result.serverInfo?.version || "1.0.0";

      // Request available tools, resources, and prompts
      this.listTools(serverId);
      this.listResources(serverId);
      this.listPrompts(serverId);
    } else if (message.method === "tools/list" && message.result) {
      server.tools = message.result.tools || [];
    } else if (message.method === "resources/list" && message.result) {
      server.resources = message.result.resources || [];
    } else if (message.method === "prompts/list" && message.result) {
      server.prompts = message.result.prompts || [];
    }
  }

  // Send a message to an MCP server
  private async sendMessage(
    serverId: string,
    message: MCPMessage,
  ): Promise<any> {
    const ws = this.websockets.get(serverId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`No connection to server ${serverId}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Message timeout"));
      }, 30000);

      const messageHandler = (event: MessageEvent) => {
        try {
          const response: MCPMessage = JSON.parse(event.data);
          if (response.id === message.id) {
            clearTimeout(timeout);
            ws.removeEventListener("message", messageHandler);

            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          console.error("Error parsing response:", error);
        }
      };

      ws.addEventListener("message", messageHandler);
      ws.send(JSON.stringify(message));
    });
  }

  // List available tools from a server
  async listTools(serverId: string): Promise<MCPTool[]> {
    try {
      const result = await this.sendMessage(serverId, {
        jsonrpc: "2.0",
        id: this.getNextId(),
        method: "tools/list",
      });

      const server = this.servers.get(serverId);
      if (server) {
        server.tools = result.tools || [];
        return server.tools;
      }

      return [];
    } catch (error) {
      console.error(`Error listing tools for server ${serverId}:`, error);
      return [];
    }
  }

  // Call a tool on an MCP server
  async callTool(
    serverId: string,
    toolName: string,
    arguments_: any,
  ): Promise<any> {
    try {
      const result = await this.sendMessage(serverId, {
        jsonrpc: "2.0",
        id: this.getNextId(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: arguments_,
        },
      });

      return result;
    } catch (error) {
      console.error(
        `Error calling tool ${toolName} on server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  // List available resources from a server
  async listResources(serverId: string): Promise<MCPResource[]> {
    try {
      const result = await this.sendMessage(serverId, {
        jsonrpc: "2.0",
        id: this.getNextId(),
        method: "resources/list",
      });

      const server = this.servers.get(serverId);
      if (server) {
        server.resources = result.resources || [];
        return server.resources;
      }

      return [];
    } catch (error) {
      console.error(`Error listing resources for server ${serverId}:`, error);
      return [];
    }
  }

  // Read a resource from an MCP server
  async readResource(serverId: string, uri: string): Promise<any> {
    try {
      const result = await this.sendMessage(serverId, {
        jsonrpc: "2.0",
        id: this.getNextId(),
        method: "resources/read",
        params: {
          uri: uri,
        },
      });

      return result;
    } catch (error) {
      console.error(
        `Error reading resource ${uri} from server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  // List available prompts from a server
  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    try {
      const result = await this.sendMessage(serverId, {
        jsonrpc: "2.0",
        id: this.getNextId(),
        method: "prompts/list",
      });

      const server = this.servers.get(serverId);
      if (server) {
        server.prompts = result.prompts || [];
        return server.prompts;
      }

      return [];
    } catch (error) {
      console.error(`Error listing prompts for server ${serverId}:`, error);
      return [];
    }
  }

  // Get a prompt from an MCP server
  async getPrompt(
    serverId: string,
    promptName: string,
    arguments_?: any,
  ): Promise<any> {
    try {
      const result = await this.sendMessage(serverId, {
        jsonrpc: "2.0",
        id: this.getNextId(),
        method: "prompts/get",
        params: {
          name: promptName,
          arguments: arguments_ || {},
        },
      });

      return result;
    } catch (error) {
      console.error(
        `Error getting prompt ${promptName} from server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  // Get all connected servers
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  // Get a specific server
  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  // Disconnect from a server
  disconnectServer(serverId: string): void {
    const ws = this.websockets.get(serverId);
    if (ws) {
      ws.close();
    }

    const server = this.servers.get(serverId);
    if (server) {
      server.status = "disconnected";
    }
  }

  // Disconnect from all servers
  disconnectAll(): void {
    for (const [serverId] of this.websockets) {
      this.disconnectServer(serverId);
    }
  }

  private getNextId(): number {
    return this.messageId++;
  }
}

// Predefined MCP server configurations
export const DEFAULT_MCP_SERVERS = [
  {
    id: "filesystem",
    name: "File System",
    endpoint: "ws://localhost:3001/mcp/filesystem",
    description: "Access and manipulate files and directories",
  },
  {
    id: "web-search",
    name: "Web Search",
    endpoint: "ws://localhost:3001/mcp/web-search",
    description: "Search the web for information",
  },
  {
    id: "database",
    name: "Database",
    endpoint: "ws://localhost:3001/mcp/database",
    description: "Query and manipulate database records",
  },
  {
    id: "email",
    name: "Email",
    endpoint: "ws://localhost:3001/mcp/email",
    description: "Send and receive emails",
  },
  {
    id: "calendar",
    name: "Calendar",
    endpoint: "ws://localhost:3001/mcp/calendar",
    description: "Manage calendar events and scheduling",
  },
  {
    id: "github",
    name: "GitHub",
    endpoint: "ws://localhost:3001/mcp/github",
    description: "Interact with GitHub repositories and issues",
  },
];

export const mcpClient = new MCPClient();

// Tool calling system for AI agents
export class ToolCallManager {
  private availableTools: Map<string, MCPTool> = new Map();

  constructor(private mcp: MCPClient) {}

  // Register tools from MCP servers
  async registerMCPTools(): Promise<void> {
    const servers = this.mcp.getServers();

    for (const server of servers) {
      for (const tool of server.tools) {
        const toolKey = `${server.id}:${tool.name}`;
        this.availableTools.set(toolKey, {
          ...tool,
          handler: async (params: any) => {
            return await this.mcp.callTool(server.id, tool.name, params);
          },
        });
      }
    }
  }

  // Execute a tool call
  async executeTool(toolName: string, parameters: any): Promise<any> {
    const tool = this.availableTools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      const result = await tool.handler(parameters);
      return {
        success: true,
        result: result,
        toolName: toolName,
        parameters: parameters,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        toolName: toolName,
        parameters: parameters,
      };
    }
  }

  // Get available tools
  getAvailableTools(): Array<{
    name: string;
    description: string;
    schema: any;
  }> {
    return Array.from(this.availableTools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      schema: tool.inputSchema,
    }));
  }
}

export const toolCallManager = new ToolCallManager(mcpClient);
