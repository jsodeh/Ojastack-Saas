/**
 * Slack Integration Service
 * Comprehensive Slack app integration with bot functionality and workflow automation
 */

interface SlackConfig {
  botToken: string;
  appToken: string;
  signingSecret: string;
  clientId: string;
  clientSecret: string;
}

interface SlackMessage {
  ts: string;
  channel: string;
  user: string;
  text: string;
  type: 'message' | 'app_mention' | 'direct_message';
  thread_ts?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
}

interface SlackBlock {
  type: 'section' | 'divider' | 'image' | 'actions' | 'context' | 'header';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
  accessory?: {
    type: 'button' | 'select' | 'image';
    text?: { type: 'plain_text'; text: string };
    action_id?: string;
    value?: string;
    url?: string;
    image_url?: string;
    alt_text?: string;
  };
  elements?: Array<{
    type: 'button' | 'select' | 'datepicker' | 'timepicker';
    text?: { type: 'plain_text'; text: string };
    action_id?: string;
    value?: string;
    url?: string;
  }>;
}

interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  display_name: string;
  email?: string;
  profile: {
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    status_text: string;
    status_emoji: string;
  };
  is_bot: boolean;
  is_admin: boolean;
  is_owner: boolean;
  tz: string;
  tz_label: string;
  tz_offset: number;
}

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_member: boolean;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  num_members: number;
}

interface SlackWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'slash_command' | 'shortcut' | 'message' | 'reaction' | 'schedule';
    command?: string;
    callback_id?: string;
    keywords?: string[];
    schedule?: string;
  };
  steps: Array<{
    id: string;
    type: 'send_message' | 'create_channel' | 'invite_users' | 'call_webhook' | 'ai_response';
    config: Record<string, any>;
  }>;
  enabled: boolean;
}

class SlackService {
  private config: SlackConfig;
  private baseUrl = 'https://slack.com/api';
  private workflows: Map<string, SlackWorkflow> = new Map();
  private messageHandlers: Map<string, (message: SlackMessage) => Promise<void>> = new Map();
  private commandHandlers: Map<string, (command: any) => Promise<any>> = new Map();

  constructor() {
    this.config = {
      botToken: import.meta.env.VITE_SLACK_BOT_TOKEN || '',
      appToken: import.meta.env.VITE_SLACK_APP_TOKEN || '',
      signingSecret: import.meta.env.VITE_SLACK_SIGNING_SECRET || '',
      clientId: import.meta.env.VITE_SLACK_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_SLACK_CLIENT_SECRET || ''
    };

    if (!this.config.botToken) {
      console.warn('Slack bot token not configured. Slack features will not work.');
    }

    this.initializeDefaultWorkflows();
    this.setupDefaultCommands();
  }

  /**
   * Check if Slack service is available
   */
  isAvailable(): boolean {
    return !!this.config.botToken;
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; team?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Slack bot token not configured' };
    }

    try {
      const response = await this.makeRequest('auth.test');
      return {
        success: true,
        team: response.team
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send message to channel or user
   */
  async sendMessage(
    channel: string,
    text: string,
    options: {
      blocks?: SlackBlock[];
      attachments?: SlackAttachment[];
      thread_ts?: string;
      reply_broadcast?: boolean;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
    } = {}
  ): Promise<SlackMessage> {
    const payload = {
      channel,
      text,
      ...options
    };

    const response = await this.makeRequest('chat.postMessage', payload);
    
    return {
      ts: response.ts,
      channel: response.channel,
      user: response.message.user,
      text: response.message.text,
      type: 'message',
      blocks: response.message.blocks,
      attachments: response.message.attachments
    };
  }

  /**
   * Send ephemeral message (only visible to specific user)
   */
  async sendEphemeralMessage(
    channel: string,
    user: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<void> {
    await this.makeRequest('chat.postEphemeral', {
      channel,
      user,
      text,
      ...(blocks && { blocks })
    });
  }

  /**
   * Update existing message
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<SlackMessage> {
    const response = await this.makeRequest('chat.update', {
      channel,
      ts,
      text,
      ...(blocks && { blocks })
    });

    return {
      ts: response.ts,
      channel: response.channel,
      user: response.message.user,
      text: response.message.text,
      type: 'message',
      blocks: response.message.blocks
    };
  }

  /**
   * Delete message
   */
  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.makeRequest('chat.delete', { channel, ts });
  }

  /**
   * Add reaction to message
   */
  async addReaction(channel: string, timestamp: string, name: string): Promise<void> {
    await this.makeRequest('reactions.add', {
      channel,
      timestamp,
      name
    });
  }

  /**
   * Get channel information
   */
  async getChannel(channelId: string): Promise<SlackChannel> {
    const response = await this.makeRequest('conversations.info', {
      channel: channelId
    });

    return response.channel;
  }

  /**
   * Get channel members
   */
  async getChannelMembers(channelId: string): Promise<string[]> {
    const response = await this.makeRequest('conversations.members', {
      channel: channelId
    });

    return response.members;
  }

  /**
   * Create new channel
   */
  async createChannel(
    name: string,
    isPrivate: boolean = false,
    userIds?: string[]
  ): Promise<SlackChannel> {
    const response = await this.makeRequest('conversations.create', {
      name,
      is_private: isPrivate
    });

    const channel = response.channel;

    // Invite users if specified
    if (userIds && userIds.length > 0) {
      await this.inviteUsersToChannel(channel.id, userIds);
    }

    return channel;
  }

  /**
   * Invite users to channel
   */
  async inviteUsersToChannel(channelId: string, userIds: string[]): Promise<void> {
    await this.makeRequest('conversations.invite', {
      channel: channelId,
      users: userIds.join(',')
    });
  }

  /**
   * Get user information
   */
  async getUser(userId: string): Promise<SlackUser> {
    const response = await this.makeRequest('users.info', {
      user: userId
    });

    return response.user;
  }

  /**
   * Get workspace users
   */
  async getUsers(limit: number = 100): Promise<SlackUser[]> {
    const response = await this.makeRequest('users.list', {
      limit
    });

    return response.members;
  }

  /**
   * Open direct message channel with user
   */
  async openDirectMessage(userId: string): Promise<string> {
    const response = await this.makeRequest('conversations.open', {
      users: userId
    });

    return response.channel.id;
  }

  /**
   * Get message history from channel
   */
  async getMessageHistory(
    channelId: string,
    options: {
      latest?: string;
      oldest?: string;
      limit?: number;
      inclusive?: boolean;
    } = {}
  ): Promise<SlackMessage[]> {
    const response = await this.makeRequest('conversations.history', {
      channel: channelId,
      limit: options.limit || 100,
      ...options
    });

    return response.messages.map((msg: any) => ({
      ts: msg.ts,
      channel: channelId,
      user: msg.user,
      text: msg.text,
      type: 'message',
      thread_ts: msg.thread_ts,
      blocks: msg.blocks,
      attachments: msg.attachments,
      reactions: msg.reactions
    }));
  }

  /**
   * Create interactive message with buttons
   */
  async sendInteractiveMessage(
    channel: string,
    text: string,
    actions: Array<{
      text: string;
      value: string;
      style?: 'primary' | 'danger';
      url?: string;
    }>
  ): Promise<SlackMessage> {
    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text
        }
      },
      {
        type: 'actions',
        elements: actions.map(action => ({
          type: action.url ? 'button' : 'button',
          text: {
            type: 'plain_text',
            text: action.text
          },
          action_id: `action_${action.value}`,
          value: action.value,
          ...(action.url && { url: action.url }),
          ...(action.style && { style: action.style })
        }))
      }
    ];

    return this.sendMessage(channel, text, { blocks });
  }

  /**
   * Create workflow
   */
  createWorkflow(workflow: Omit<SlackWorkflow, 'id'>): string {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newWorkflow: SlackWorkflow = {
      id: workflowId,
      ...workflow
    };

    this.workflows.set(workflowId, newWorkflow);
    
    // Set up trigger handlers
    this.setupWorkflowTrigger(newWorkflow);

    return workflowId;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string, context: any): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      return;
    }

    try {
      for (const step of workflow.steps) {
        await this.executeWorkflowStep(step, context);
      }
    } catch (error) {
      console.error(`Failed to execute workflow ${workflowId}:`, error);
    }
  }

  /**
   * Register slash command handler
   */
  registerSlashCommand(command: string, handler: (payload: any) => Promise<any>): void {
    this.commandHandlers.set(command, handler);
  }

  /**
   * Handle slash command
   */
  async handleSlashCommand(payload: any): Promise<any> {
    const command = payload.command.substring(1); // Remove leading slash
    const handler = this.commandHandlers.get(command);
    
    if (handler) {
      return await handler(payload);
    }

    return {
      response_type: 'ephemeral',
      text: `Unknown command: ${payload.command}`
    };
  }

  /**
   * Handle interactive component (button clicks, etc.)
   */
  async handleInteractiveComponent(payload: any): Promise<any> {
    const actionId = payload.actions[0]?.action_id;
    
    if (actionId?.startsWith('action_')) {
      const value = payload.actions[0].value;
      
      // Handle different action types
      switch (value) {
        case 'approve':
          return this.handleApprovalAction(payload, true);
        case 'reject':
          return this.handleApprovalAction(payload, false);
        default:
          return this.handleCustomAction(payload);
      }
    }

    return { response_type: 'ephemeral', text: 'Action processed' };
  }

  /**
   * Process incoming message for workflows
   */
  async processMessage(message: SlackMessage): Promise<void> {
    // Check for workflow triggers
    const workflows = Array.from(this.workflows.values()).filter(w => w.enabled);
    
    for (const workflow of workflows) {
      if (await this.shouldTriggerWorkflow(workflow, message)) {
        await this.executeWorkflow(workflow.id, { message });
      }
    }

    // Check for registered message handlers
    for (const [pattern, handler] of this.messageHandlers.entries()) {
      if (message.text.includes(pattern)) {
        await handler(message);
      }
    }
  }

  /**
   * Register message handler
   */
  registerMessageHandler(pattern: string, handler: (message: SlackMessage) => Promise<void>): void {
    this.messageHandlers.set(pattern, handler);
  }

  /**
   * Get workspace analytics
   */
  async getAnalytics(): Promise<{
    totalMessages: number;
    activeUsers: number;
    topChannels: Array<{ name: string; messageCount: number }>;
    botInteractions: number;
  }> {
    // This would require additional Slack API calls and data aggregation
    // For now, return mock data
    return {
      totalMessages: 0,
      activeUsers: 0,
      topChannels: [],
      botInteractions: 0
    };
  }

  // Private methods

  /**
   * Make API request to Slack
   */
  private async makeRequest(method: string, data: any = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return result;
  }

  /**
   * Initialize default workflows
   */
  private initializeDefaultWorkflows(): void {
    // Agent Support Workflow
    this.createWorkflow({
      name: 'Agent Support Request',
      description: 'Handle support requests for AI agents',
      trigger: {
        type: 'slash_command',
        command: '/agent-support'
      },
      steps: [
        {
          id: 'create-ticket',
          type: 'send_message',
          config: {
            channel: '#agent-support',
            text: 'New agent support request received'
          }
        }
      ],
      enabled: true
    });

    // Daily Standup Workflow
    this.createWorkflow({
      name: 'Daily Agent Status',
      description: 'Daily status update for AI agents',
      trigger: {
        type: 'schedule',
        schedule: '0 9 * * 1-5' // 9 AM weekdays
      },
      steps: [
        {
          id: 'status-update',
          type: 'send_message',
          config: {
            channel: '#general',
            text: 'Daily AI agent status update'
          }
        }
      ],
      enabled: false
    });
  }

  /**
   * Setup default slash commands
   */
  private setupDefaultCommands(): void {
    this.registerSlashCommand('agent-status', async (payload) => {
      return {
        response_type: 'in_channel',
        text: 'AI Agent Status: All systems operational ✅'
      };
    });

    this.registerSlashCommand('agent-help', async (payload) => {
      return {
        response_type: 'ephemeral',
        text: 'Available commands:\n• `/agent-status` - Check agent status\n• `/agent-support` - Request support'
      };
    });
  }

  /**
   * Setup workflow trigger
   */
  private setupWorkflowTrigger(workflow: SlackWorkflow): void {
    switch (workflow.trigger.type) {
      case 'slash_command':
        if (workflow.trigger.command) {
          this.registerSlashCommand(workflow.trigger.command.substring(1), async (payload) => {
            await this.executeWorkflow(workflow.id, { command: payload });
            return { response_type: 'ephemeral', text: 'Workflow executed' };
          });
        }
        break;
      case 'message':
        if (workflow.trigger.keywords) {
          workflow.trigger.keywords.forEach(keyword => {
            this.registerMessageHandler(keyword, async (message) => {
              await this.executeWorkflow(workflow.id, { message });
            });
          });
        }
        break;
    }
  }

  /**
   * Execute workflow step
   */
  private async executeWorkflowStep(step: SlackWorkflow['steps'][0], context: any): Promise<void> {
    switch (step.type) {
      case 'send_message':
        await this.sendMessage(
          step.config.channel,
          step.config.text,
          step.config.options || {}
        );
        break;
      case 'create_channel':
        await this.createChannel(
          step.config.name,
          step.config.isPrivate || false,
          step.config.userIds
        );
        break;
      case 'invite_users':
        await this.inviteUsersToChannel(
          step.config.channel,
          step.config.userIds
        );
        break;
      case 'call_webhook':
        await fetch(step.config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, step: step.config })
        });
        break;
      case 'ai_response':
        // This would integrate with your AI service
        const response = `AI Response: ${step.config.prompt}`;
        await this.sendMessage(step.config.channel, response);
        break;
    }
  }

  /**
   * Check if workflow should trigger
   */
  private async shouldTriggerWorkflow(workflow: SlackWorkflow, message: SlackMessage): Promise<boolean> {
    if (workflow.trigger.type === 'message' && workflow.trigger.keywords) {
      return workflow.trigger.keywords.some(keyword => 
        message.text.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    return false;
  }

  /**
   * Handle approval actions
   */
  private async handleApprovalAction(payload: any, approved: boolean): Promise<any> {
    const message = approved ? 'Request approved ✅' : 'Request rejected ❌';
    
    // Update the original message
    await this.updateMessage(
      payload.channel.id,
      payload.message.ts,
      `${payload.message.text}\n\n${message}`,
      []
    );

    return { response_type: 'ephemeral', text: message };
  }

  /**
   * Handle custom actions
   */
  private async handleCustomAction(payload: any): Promise<any> {
    const actionValue = payload.actions[0].value;
    
    // Process custom action based on value
    return {
      response_type: 'ephemeral',
      text: `Processed action: ${actionValue}`
    };
  }
}

// Export singleton instance
export const slackService = new SlackService();
export default slackService;

// Export types
export type {
  SlackMessage,
  SlackBlock,
  SlackAttachment,
  SlackUser,
  SlackChannel,
  SlackWorkflow
};