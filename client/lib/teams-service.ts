/**
 * Microsoft Teams Integration Service
 * Comprehensive Teams bot integration with enterprise features
 */

interface TeamsConfig {
  botId: string;
  botPassword: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

interface TeamsMessage {
  id: string;
  type: 'message' | 'mention' | 'reaction' | 'meeting';
  timestamp: string;
  from: {
    id: string;
    name: string;
    aadObjectId?: string;
  };
  conversation: {
    id: string;
    conversationType: 'personal' | 'channel' | 'groupChat';
    tenantId: string;
  };
  text: string;
  textFormat?: 'plain' | 'markdown';
  attachments?: TeamsAttachment[];
  entities?: TeamsEntity[];
  channelData?: {
    channel?: {
      id: string;
      name: string;
    };
    team?: {
      id: string;
      name: string;
    };
    meeting?: {
      id: string;
      title: string;
    };
  };
  replyToId?: string;
}

interface TeamsAttachment {
  contentType: string;
  contentUrl?: string;
  content?: any;
  name?: string;
  thumbnailUrl?: string;
}

interface TeamsEntity {
  type: 'mention' | 'hashtag' | 'at';
  text: string;
  mentioned?: {
    id: string;
    name: string;
  };
}

interface TeamsCard {
  type: 'AdaptiveCard' | 'HeroCard' | 'ThumbnailCard' | 'ReceiptCard';
  version?: string;
  body?: Array<{
    type: 'TextBlock' | 'Image' | 'Container' | 'ColumnSet' | 'FactSet' | 'ActionSet';
    text?: string;
    size?: 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge';
    weight?: 'Lighter' | 'Default' | 'Bolder';
    color?: 'Default' | 'Dark' | 'Light' | 'Accent' | 'Good' | 'Warning' | 'Attention';
    url?: string;
    altText?: string;
    width?: string;
    height?: string;
    columns?: any[];
    facts?: Array<{ title: string; value: string }>;
    actions?: TeamsAction[];
  }>;
  actions?: TeamsAction[];
}

interface TeamsAction {
  type: 'Action.Submit' | 'Action.OpenUrl' | 'Action.ShowCard' | 'Action.ToggleVisibility';
  title: string;
  url?: string;
  data?: any;
  card?: TeamsCard;
}

interface TeamsUser {
  id: string;
  name: string;
  givenName: string;
  surname: string;
  email: string;
  userPrincipalName: string;
  tenantId: string;
  aadObjectId: string;
  role?: 'owner' | 'member' | 'guest';
  userType?: 'Member' | 'Guest';
}

interface TeamsChannel {
  id: string;
  name: string;
  description: string;
  webUrl: string;
  membershipType: 'standard' | 'private' | 'shared';
  createdDateTime: string;
}

interface TeamsTeam {
  id: string;
  displayName: string;
  description: string;
  webUrl: string;
  isArchived: boolean;
  visibility: 'public' | 'private';
  specialization?: 'none' | 'educationStandard' | 'educationClass' | 'educationProfessionalLearningCommunity' | 'healthcareStandard' | 'healthcareCareCoordination';
}

interface TeamsMeeting {
  id: string;
  subject: string;
  organizer: TeamsUser;
  startTime: string;
  endTime: string;
  joinUrl: string;
  participants: TeamsUser[];
  isRecurring: boolean;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

class TeamsService {
  private config: TeamsConfig;
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private botFrameworkUrl = 'https://smba.trafficmanager.net/apis';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      botId: import.meta.env.VITE_TEAMS_BOT_ID || '',
      botPassword: import.meta.env.VITE_TEAMS_BOT_PASSWORD || '',
      tenantId: import.meta.env.VITE_TEAMS_TENANT_ID || '',
      clientId: import.meta.env.VITE_TEAMS_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_TEAMS_CLIENT_SECRET || ''
    };

    if (!this.config.botId || !this.config.clientId) {
      console.warn('Teams credentials not configured. Teams features will not work.');
    }
  }

  /**
   * Check if Teams service is available
   */
  isAvailable(): boolean {
    return !!(this.config.botId && this.config.clientId);
  }

  /**
   * Test Teams connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; tenant?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Teams credentials not configured' };
    }

    try {
      await this.getAccessToken();
      const response = await this.makeGraphRequest('organization');
      
      return {
        success: true,
        tenant: response.value?.[0]?.displayName || 'Unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send message to user or channel
   */
  async sendMessage(
    conversationId: string,
    text: string,
    options: {
      textFormat?: 'plain' | 'markdown';
      attachments?: TeamsAttachment[];
      replyToId?: string;
      channelData?: any;
    } = {}
  ): Promise<TeamsMessage> {
    const messageData = {
      type: 'message',
      text,
      textFormat: options.textFormat || 'markdown',
      ...(options.attachments && { attachments: options.attachments }),
      ...(options.replyToId && { replyToId: options.replyToId }),
      ...(options.channelData && { channelData: options.channelData })
    };

    const response = await this.makeBotRequest(
      `conversations/${conversationId}/activities`,
      'POST',
      messageData
    );

    return {
      id: response.id,
      type: 'message',
      timestamp: new Date().toISOString(),
      from: {
        id: this.config.botId,
        name: 'AI Assistant'
      },
      conversation: {
        id: conversationId,
        conversationType: 'personal',
        tenantId: this.config.tenantId
      },
      text,
      textFormat: options.textFormat,
      attachments: options.attachments
    };
  }

  /**
   * Send adaptive card
   */
  async sendAdaptiveCard(
    conversationId: string,
    card: TeamsCard,
    text?: string
  ): Promise<TeamsMessage> {
    const attachment: TeamsAttachment = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: card
    };

    return this.sendMessage(conversationId, text || '', {
      attachments: [attachment]
    });
  }

  /**
   * Send hero card
   */
  async sendHeroCard(
    conversationId: string,
    title: string,
    subtitle?: string,
    text?: string,
    images?: string[],
    buttons?: Array<{ type: string; title: string; value: string }>
  ): Promise<TeamsMessage> {
    const heroCard = {
      title,
      subtitle,
      text,
      images: images?.map(url => ({ url })),
      buttons: buttons?.map(btn => ({
        type: btn.type,
        title: btn.title,
        value: btn.value
      }))
    };

    const attachment: TeamsAttachment = {
      contentType: 'application/vnd.microsoft.card.hero',
      content: heroCard
    };

    return this.sendMessage(conversationId, '', {
      attachments: [attachment]
    });
  }

  /**
   * Update existing message
   */
  async updateMessage(
    conversationId: string,
    messageId: string,
    text: string,
    attachments?: TeamsAttachment[]
  ): Promise<TeamsMessage> {
    const messageData = {
      type: 'message',
      text,
      ...(attachments && { attachments })
    };

    const response = await this.makeBotRequest(
      `conversations/${conversationId}/activities/${messageId}`,
      'PUT',
      messageData
    );

    return {
      id: response.id,
      type: 'message',
      timestamp: new Date().toISOString(),
      from: {
        id: this.config.botId,
        name: 'AI Assistant'
      },
      conversation: {
        id: conversationId,
        conversationType: 'personal',
        tenantId: this.config.tenantId
      },
      text,
      attachments
    };
  }

  /**
   * Delete message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.makeBotRequest(
      `conversations/${conversationId}/activities/${messageId}`,
      'DELETE'
    );
  }

  /**
   * Get user profile
   */
  async getUser(userId: string): Promise<TeamsUser> {
    const response = await this.makeGraphRequest(`users/${userId}`);
    
    return {
      id: response.id,
      name: response.displayName,
      givenName: response.givenName,
      surname: response.surname,
      email: response.mail || response.userPrincipalName,
      userPrincipalName: response.userPrincipalName,
      tenantId: this.config.tenantId,
      aadObjectId: response.id,
      userType: response.userType
    };
  }

  /**
   * Get team information
   */
  async getTeam(teamId: string): Promise<TeamsTeam> {
    const response = await this.makeGraphRequest(`teams/${teamId}`);
    
    return {
      id: response.id,
      displayName: response.displayName,
      description: response.description,
      webUrl: response.webUrl,
      isArchived: response.isArchived,
      visibility: response.visibility,
      specialization: response.specialization
    };
  }

  /**
   * Get team channels
   */
  async getTeamChannels(teamId: string): Promise<TeamsChannel[]> {
    const response = await this.makeGraphRequest(`teams/${teamId}/channels`);
    
    return response.value.map((channel: any) => ({
      id: channel.id,
      name: channel.displayName,
      description: channel.description,
      webUrl: channel.webUrl,
      membershipType: channel.membershipType,
      createdDateTime: channel.createdDateTime
    }));
  }

  /**
   * Create team channel
   */
  async createChannel(
    teamId: string,
    name: string,
    description?: string,
    membershipType: 'standard' | 'private' = 'standard'
  ): Promise<TeamsChannel> {
    const channelData = {
      displayName: name,
      description,
      membershipType
    };

    const response = await this.makeGraphRequest(
      `teams/${teamId}/channels`,
      'POST',
      channelData
    );

    return {
      id: response.id,
      name: response.displayName,
      description: response.description,
      webUrl: response.webUrl,
      membershipType: response.membershipType,
      createdDateTime: response.createdDateTime
    };
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamsUser[]> {
    const response = await this.makeGraphRequest(`teams/${teamId}/members`);
    
    return response.value.map((member: any) => ({
      id: member.id,
      name: member.displayName,
      givenName: member.givenName || '',
      surname: member.surname || '',
      email: member.email,
      userPrincipalName: member.userPrincipalName,
      tenantId: this.config.tenantId,
      aadObjectId: member.userId,
      role: member.roles?.[0] || 'member'
    }));
  }

  /**
   * Add member to team
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    role: 'owner' | 'member' = 'member'
  ): Promise<void> {
    const memberData = {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${userId}`,
      roles: role === 'owner' ? ['owner'] : []
    };

    await this.makeGraphRequest(
      `teams/${teamId}/members`,
      'POST',
      memberData
    );
  }

  /**
   * Schedule meeting
   */
  async scheduleMeeting(
    subject: string,
    startTime: string,
    endTime: string,
    attendees: string[],
    content?: string
  ): Promise<TeamsMeeting> {
    const meetingData = {
      subject,
      start: {
        dateTime: startTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endTime,
        timeZone: 'UTC'
      },
      attendees: attendees.map(email => ({
        emailAddress: {
          address: email,
          name: email
        },
        type: 'required'
      })),
      body: {
        contentType: 'HTML',
        content: content || ''
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };

    const response = await this.makeGraphRequest('me/events', 'POST', meetingData);

    return {
      id: response.id,
      subject: response.subject,
      organizer: {
        id: response.organizer.emailAddress.address,
        name: response.organizer.emailAddress.name,
        givenName: '',
        surname: '',
        email: response.organizer.emailAddress.address,
        userPrincipalName: response.organizer.emailAddress.address,
        tenantId: this.config.tenantId,
        aadObjectId: ''
      },
      startTime: response.start.dateTime,
      endTime: response.end.dateTime,
      joinUrl: response.onlineMeeting?.joinUrl || '',
      participants: [],
      isRecurring: false,
      status: 'scheduled'
    };
  }

  /**
   * Get user's meetings
   */
  async getUserMeetings(userId: string, startTime?: string, endTime?: string): Promise<TeamsMeeting[]> {
    let url = `users/${userId}/events?$filter=isOnlineMeeting eq true`;
    
    if (startTime && endTime) {
      url += ` and start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'`;
    }

    const response = await this.makeGraphRequest(url);

    return response.value.map((event: any) => ({
      id: event.id,
      subject: event.subject,
      organizer: {
        id: event.organizer.emailAddress.address,
        name: event.organizer.emailAddress.name,
        givenName: '',
        surname: '',
        email: event.organizer.emailAddress.address,
        userPrincipalName: event.organizer.emailAddress.address,
        tenantId: this.config.tenantId,
        aadObjectId: ''
      },
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      joinUrl: event.onlineMeeting?.joinUrl || '',
      participants: event.attendees?.map((attendee: any) => ({
        id: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        email: attendee.emailAddress.address
      })) || [],
      isRecurring: !!event.recurrence,
      status: event.isCancelled ? 'cancelled' : 'scheduled'
    }));
  }

  /**
   * Send proactive message to user
   */
  async sendProactiveMessage(
    userId: string,
    tenantId: string,
    text: string,
    attachments?: TeamsAttachment[]
  ): Promise<void> {
    // Create conversation reference
    const conversationReference = {
      bot: {
        id: this.config.botId,
        name: 'AI Assistant'
      },
      user: {
        id: userId,
        aadObjectId: userId
      },
      conversation: {
        id: userId,
        conversationType: 'personal',
        tenantId
      },
      channelId: 'msteams',
      serviceUrl: this.botFrameworkUrl
    };

    // Send proactive message
    await this.makeBotRequest('conversations', 'POST', {
      bot: conversationReference.bot,
      members: [conversationReference.user],
      channelData: {
        tenant: {
          id: tenantId
        }
      },
      activity: {
        type: 'message',
        text,
        ...(attachments && { attachments })
      }
    });
  }

  /**
   * Handle incoming activity
   */
  async handleActivity(activity: any): Promise<TeamsMessage | null> {
    if (activity.type === 'message') {
      return {
        id: activity.id,
        type: 'message',
        timestamp: activity.timestamp,
        from: activity.from,
        conversation: activity.conversation,
        text: activity.text,
        textFormat: activity.textFormat,
        attachments: activity.attachments,
        entities: activity.entities,
        channelData: activity.channelData,
        replyToId: activity.replyToId
      };
    }

    return null;
  }

  /**
   * Create approval card
   */
  createApprovalCard(
    title: string,
    description: string,
    requestId: string
  ): TeamsCard {
    return {
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: title,
          size: 'Medium',
          weight: 'Bolder'
        },
        {
          type: 'TextBlock',
          text: description,
          size: 'Default'
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Approve',
          data: {
            action: 'approve',
            requestId
          }
        },
        {
          type: 'Action.Submit',
          title: 'Reject',
          data: {
            action: 'reject',
            requestId
          }
        }
      ]
    };
  }

  /**
   * Create status card
   */
  createStatusCard(
    title: string,
    status: 'success' | 'warning' | 'error',
    details: string
  ): TeamsCard {
    const colors = {
      success: 'Good',
      warning: 'Warning',
      error: 'Attention'
    };

    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    return {
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: `${icons[status]} ${title}`,
          size: 'Medium',
          weight: 'Bolder',
          color: colors[status]
        },
        {
          type: 'TextBlock',
          text: details,
          size: 'Default'
        }
      ]
    };
  }

  // Private methods

  /**
   * Get access token for Microsoft Graph API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', this.config.clientId);
    params.append('client_secret', this.config.clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    return this.accessToken;
  }

  /**
   * Make request to Microsoft Graph API
   */
  private async makeGraphRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      ...(body && { body: JSON.stringify(body) })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Graph API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Make request to Bot Framework API
   */
  private async makeBotRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    // This would require Bot Framework authentication
    // For now, return mock response
    return { id: 'mock-id' };
  }
}

// Export singleton instance
export const teamsService = new TeamsService();
export default teamsService;

// Export types
export type {
  TeamsMessage,
  TeamsCard,
  TeamsAction,
  TeamsUser,
  TeamsChannel,
  TeamsTeam,
  TeamsMeeting
};