import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// Global app state interfaces
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  organizationId: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    language: string;
    timezone: string;
  };
}

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'training';
  template: string;
  configuration: Record<string, any>;
  knowledgeBases: string[];
  channels: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Integration {
  id: string;
  type: 'whatsapp' | 'slack' | 'discord' | 'web-widget' | 'api';
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'configuring';
  configuration: Record<string, any>;
  lastSync: Date;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Global state store
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // App state
  isLoading: boolean;
  isOnline: boolean;
  currentPage: string;
  
  // Agents
  agents: Agent[];
  selectedAgent: Agent | null;
  
  // Integrations
  integrations: Integration[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // UI state
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
  setCurrentPage: (page: string) => void;
  
  // Agent actions
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  
  // Integration actions
  setIntegrations: (integrations: Integration[]) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // UI actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isOnline: navigator.onLine,
        currentPage: '/',
        agents: [],
        selectedAgent: null,
        integrations: [],
        notifications: [],
        unreadCount: 0,
        sidebarCollapsed: false,
        theme: 'system',
        
        // User actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setLoading: (isLoading) => set({ isLoading }),
        setOnlineStatus: (isOnline) => set({ isOnline }),
        setCurrentPage: (currentPage) => set({ currentPage }),
        
        // Agent actions
        setAgents: (agents) => set({ agents }),
        addAgent: (agent) => set((state) => ({ 
          agents: [...state.agents, agent] 
        })),
        updateAgent: (id, updates) => set((state) => ({
          agents: state.agents.map(agent => 
            agent.id === id ? { ...agent, ...updates } : agent
          ),
          selectedAgent: state.selectedAgent?.id === id 
            ? { ...state.selectedAgent, ...updates }
            : state.selectedAgent
        })),
        deleteAgent: (id) => set((state) => ({
          agents: state.agents.filter(agent => agent.id !== id),
          selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent
        })),
        setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
        
        // Integration actions
        setIntegrations: (integrations) => set({ integrations }),
        updateIntegration: (id, updates) => set((state) => ({
          integrations: state.integrations.map(integration => 
            integration.id === id ? { ...integration, ...updates } : integration
          )
        })),
        
        // Notification actions
        addNotification: (notification) => set((state) => {
          const newNotification = {
            ...notification,
            id: Math.random().toString(36).substring(2, 15),
          };
          return {
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1
          };
        }),
        markNotificationRead: (id) => set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        })),
        clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
        
        // UI actions
        toggleSidebar: () => set((state) => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        setTheme: (theme) => set({ theme })
      }),
      {
        name: 'ojastack-app-state',
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed
        })
      }
    ),
    { name: 'OjastackApp' }
  )
);

// Service orchestration layer
export class ServiceOrchestrator {
  private static instance: ServiceOrchestrator;
  private services: Map<string, any> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): ServiceOrchestrator {
    if (!ServiceOrchestrator.instance) {
      ServiceOrchestrator.instance = new ServiceOrchestrator();
    }
    return ServiceOrchestrator.instance;
  }

  // Register services
  registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
    this.emit('service-registered', { name, service });
  }

  // Get service
  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Orchestrate complex operations
  async executeOperation(operation: string, params: any): Promise<any> {
    this.emit('operation-start', { operation, params });
    
    try {
      let result;
      
      switch (operation) {
        case 'create-agent':
          result = await this.createAgent(params);
          break;
        case 'setup-integration':
          result = await this.setupIntegration(params);
          break;
        case 'deploy-agent':
          result = await this.deployAgent(params);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      this.emit('operation-success', { operation, result });
      return result;
    } catch (error) {
      this.emit('operation-error', { operation, error });
      throw error;
    }
  }

  // Complex operation implementations
  private async createAgent(params: {
    template: string;
    configuration: any;
    knowledgeBases: string[];
    channels: string[];
  }): Promise<Agent> {
    const { setLoading, addAgent, addNotification } = useAppStore.getState();
    
    setLoading(true);
    
    try {
      // 1. Validate template
      await this.validateTemplate(params.template);
      
      // 2. Process knowledge bases
      const processedKBs = await this.processKnowledgeBases(params.knowledgeBases);
      
      // 3. Create agent using API
      const response = await fetch('/.netlify/functions/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.configuration.name,
          description: params.configuration.description,
          template: params.template,
          configuration: params.configuration,
          knowledgeBases: processedKBs,
          channels: params.channels
        })
      });
      
      if (!response.ok) throw new Error('Failed to create agent');
      const data = await response.json();
      
      // 4. Train agent
      await this.trainAgent(data.id);
      
      // 5. Update store
      const agent: Agent = {
        id: data.id,
        name: data.name,
        description: data.description,
        status: 'training',
        template: data.template,
        configuration: data.configuration,
        knowledgeBases: data.knowledgeBases || [],
        channels: data.channels || [],
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
      
      addAgent(agent);
      addNotification({
        type: 'success',
        title: 'Agent Created',
        message: `${agent.name} has been created and is now training.`,
        timestamp: new Date(),
        read: false
      });
      
      return agent;
    } finally {
      setLoading(false);
    }
  }

  private async setupIntegration(params: {
    type: string;
    configuration: any;
  }): Promise<Integration> {
    const { updateIntegration, addNotification } = useAppStore.getState();
    
    try {
      // 1. Validate configuration
      await this.validateIntegrationConfig(params.type, params.configuration);
      
      // 2. Test connection
      await this.testIntegrationConnection(params.type, params.configuration);
      
      // 3. Save configuration (using fetch for custom tables)
      const response = await fetch('/.netlify/functions/save-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: params.type,
          configuration: params.configuration,
          status: 'connected'
        })
      });
      
      if (!response.ok) throw new Error('Failed to save integration');
      const data = await response.json();
      
      // 4. Update store
      const integration: Integration = {
        id: data.id,
        type: params.type as 'whatsapp' | 'slack' | 'discord' | 'web-widget' | 'api',
        name: this.getIntegrationName(params.type),
        status: 'connected',
        configuration: params.configuration,
        lastSync: new Date()
      };
      
      updateIntegration(integration.id, integration);
      addNotification({
        type: 'success',
        title: 'Integration Connected',
        message: `${integration.name} has been successfully connected.`,
        timestamp: new Date(),
        read: false
      });
      
      return integration;
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Integration Failed',
        message: `Failed to connect ${params.type} integration.`,
        timestamp: new Date(),
        read: false
      });
      throw error;
    }
  }

  private async deployAgent(params: { agentId: string }): Promise<void> {
    const { updateAgent, addNotification } = useAppStore.getState();
    
    try {
      // 1. Validate agent readiness
      await this.validateAgentReadiness(params.agentId);
      
      // 2. Deploy to channels
      await this.deployToChannels(params.agentId);
      
      // 3. Start monitoring
      await this.startAgentMonitoring(params.agentId);
      
      // 4. Update status
      updateAgent(params.agentId, { status: 'active' });
      
      addNotification({
        type: 'success',
        title: 'Agent Deployed',
        message: 'Your agent is now live and handling conversations.',
        timestamp: new Date(),
        read: false
      });
    } catch (error) {
      updateAgent(params.agentId, { status: 'inactive' });
      addNotification({
        type: 'error',
        title: 'Deployment Failed',
        message: 'Failed to deploy agent. Please check configuration.',
        timestamp: new Date(),
        read: false
      });
      throw error;
    }
  }

  // Helper methods
  private async validateTemplate(template: string): Promise<void> {
    const response = await fetch('/.netlify/functions/validate-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template })
    });
    
    if (!response.ok) {
      throw new Error('Invalid template');
    }
  }

  private async processKnowledgeBases(kbIds: string[]): Promise<string[]> {
    const response = await fetch('/.netlify/functions/process-knowledge-bases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledgeBaseIds: kbIds })
    });
    
    if (!response.ok) {
      throw new Error('Failed to process knowledge bases');
    }
    
    const data = await response.json();
    return data.processedIds;
  }

  private async trainAgent(agentId: string): Promise<void> {
    const response = await fetch('/.netlify/functions/train-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to start agent training');
    }
  }

  private async validateIntegrationConfig(type: string, config: any): Promise<void> {
    const response = await fetch('/.netlify/functions/validate-integration-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, config })
    });
    
    if (!response.ok) {
      throw new Error('Invalid integration configuration');
    }
  }

  private async testIntegrationConnection(type: string, config: any): Promise<void> {
    const response = await fetch('/.netlify/functions/test-integration-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, config })
    });
    
    if (!response.ok) {
      throw new Error('Integration connection test failed');
    }
  }

  private async validateAgentReadiness(agentId: string): Promise<void> {
    const response = await fetch('/.netlify/functions/validate-agent-readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    
    if (!response.ok) {
      throw new Error('Agent not ready for deployment');
    }
  }

  private async deployToChannels(agentId: string): Promise<void> {
    const response = await fetch('/.netlify/functions/deploy-agent-to-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to deploy agent to channels');
    }
  }

  private async startAgentMonitoring(agentId: string): Promise<void> {
    const response = await fetch('/.netlify/functions/start-agent-monitoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to start agent monitoring');
    }
  }

  private getIntegrationName(type: string): string {
    const names: Record<string, string> = {
      'whatsapp': 'WhatsApp Business',
      'slack': 'Slack',
      'discord': 'Discord',
      'web-widget': 'Web Widget',
      'api': 'API Integration'
    };
    return names[type] || type;
  }
}

// Initialize service orchestrator
export const serviceOrchestrator = ServiceOrchestrator.getInstance();

// React hooks for service integration
export function useServiceOrchestrator() {
  return serviceOrchestrator;
}

export function useOperation() {
  const orchestrator = useServiceOrchestrator();
  const { setLoading } = useAppStore();
  
  return {
    execute: async (operation: string, params: any) => {
      setLoading(true);
      try {
        return await orchestrator.executeOperation(operation, params);
      } finally {
        setLoading(false);
      }
    }
  };
}

// Initialize app services
export function initializeServices() {
  const orchestrator = ServiceOrchestrator.getInstance();
  
  // Register core services
  orchestrator.registerService('supabase', supabase);
  orchestrator.registerService('storage', {
    upload: async (file: File, path: string) => {
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, file);
      
      if (error) throw error;
      return data;
    },
    
    download: async (path: string) => {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(path);
      
      if (error) throw error;
      return data;
    }
  });
  
  // Set up event listeners
  orchestrator.on('operation-error', (data) => {
    console.error('Operation failed:', data);
    // Could integrate with error tracking service
  });
  
  // Monitor network status
  const { setOnlineStatus } = useAppStore.getState();
  window.addEventListener('online', () => setOnlineStatus(true));
  window.addEventListener('offline', () => setOnlineStatus(false));
}

// Export store selectors
export const useUser = () => useAppStore(state => state.user);
export const useAgents = () => useAppStore(state => state.agents);
export const useIntegrations = () => useAppStore(state => state.integrations);
export const useNotifications = () => useAppStore(state => state.notifications);
export const useTheme = () => useAppStore(state => state.theme);
export const useIsLoading = () => useAppStore(state => state.isLoading);