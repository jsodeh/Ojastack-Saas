// Enhanced Conversational AI with ElevenLabs Integration
import { elevenLabs, audioManager } from './elevenlabs';

export interface ConversationContext {
  conversationId: string;
  agentId: string;
  customerId: string;
  history: ConversationMessage[];
  metadata: {
    customerName?: string;
    customerInfo?: any;
    intent?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    escalationRequested?: boolean;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  type: 'text' | 'audio' | 'image';
  timestamp: Date;
  metadata?: {
    audioUrl?: string;
    transcription?: string;
    toolCalls?: ToolCall[];
    confidence?: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
  result: any;
  status: 'pending' | 'completed' | 'failed';
}

export class ConversationalAI {
  private openaiApiKey: string;
  private elevenLabsApiKey: string;

  constructor(openaiKey: string, elevenLabsKey: string) {
    this.openaiApiKey = openaiKey;
    this.elevenLabsApiKey = elevenLabsKey;
  }

  // Process text message with full conversational context
  async processTextMessage(
    message: string,
    context: ConversationContext,
    agentConfig: AgentConfig
  ): Promise<ConversationResponse> {
    try {
      // 1. Update conversation context
      const updatedContext = this.updateContext(context, {
        role: 'user',
        content: message,
        type: 'text',
        timestamp: new Date()
      });

      // 2. Analyze intent and sentiment
      const analysis = await this.analyzeMessage(message);
      updatedContext.metadata.intent = analysis.intent;
      updatedContext.metadata.sentiment = analysis.sentiment;

      // 3. Check if tools need to be called
      const toolCalls = await this.identifyToolCalls(message, agentConfig.tools);

      // 4. Execute tools if needed
      const toolResults = await this.executeTools(toolCalls);

      // 5. Generate AI response with context
      const aiResponse = await this.generateResponse(
        updatedContext,
        agentConfig,
        toolResults
      );

      // 6. Check for escalation triggers
      const needsEscalation = this.checkEscalationTriggers(
        message,
        updatedContext,
        aiResponse
      );

      return {
        response: aiResponse,
        context: updatedContext,
        toolCalls: toolResults,
        needsEscalation,
        confidence: analysis.confidence
      };
    } catch (error) {
      console.error('Error processing text message:', error);
      throw error;
    }
  }

  // Process voice message with speech-to-text and text-to-speech
  async processVoiceMessage(
    audioBlob: Blob,
    context: ConversationContext,
    agentConfig: AgentConfig
  ): Promise<VoiceConversationResponse> {
    try {
      // Import voice service dynamically
      const { voiceService } = await import('./voice-service');
      
      // 1. Convert speech to text using voice service
      const transcriptionResult = await voiceService.speechToText(audioBlob);

      // 2. Process as text message
      const textResponse = await this.processTextMessage(
        transcriptionResult.text,
        context,
        agentConfig
      );

      // 3. Convert response to speech using voice service
      const voiceSettings = {
        voice_id: agentConfig.voice_settings?.voice_id || 'rachel',
        stability: agentConfig.voice_settings?.stability || 0.5,
        similarity_boost: agentConfig.voice_settings?.similarity_boost || 0.5,
        style: agentConfig.voice_settings?.style || 0.5,
      };
      
      const ttsResult = await voiceService.textToSpeech(textResponse.response, voiceSettings);

      // 4. Store audio files and update context
      const audioUrl = await this.storeAudioFile(audioResponse);
      
      return {
        ...textResponse,
        transcription: transcriptionResult.text,
        audioUrl: ttsResult.audio_url,
        audioBlob: ttsResult.audio_blob,
        audioUrl,
        audioBuffer: audioResponse
      };
    } catch (error) {
      console.error('Error processing voice message:', error);
      throw error;
    }
  }

  // Real-time voice conversation (streaming)
  async startVoiceConversation(
    context: ConversationContext,
    agentConfig: AgentConfig
  ): Promise<VoiceConversationStream> {
    return new VoiceConversationStream(context, agentConfig, this);
  }

  // Generate contextual AI response
  private async generateResponse(
    context: ConversationContext,
    agentConfig: AgentConfig,
    toolResults: ToolCall[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(agentConfig, context, toolResults);
    const conversationHistory = this.formatConversationHistory(context.history);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: agentConfig.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        temperature: agentConfig.temperature || 0.7,
        max_tokens: agentConfig.max_tokens || 500,
        functions: this.buildFunctionDefinitions(agentConfig.tools),
        function_call: 'auto'
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';
  }

  // Build dynamic system prompt with context
  private buildSystemPrompt(
    agentConfig: AgentConfig,
    context: ConversationContext,
    toolResults: ToolCall[]
  ): string {
    let prompt = `You are ${agentConfig.name}, an AI assistant for ${context.metadata.customerInfo?.company || 'this business'}.

Your personality: ${agentConfig.personality}
Your instructions: ${agentConfig.instructions}

Current conversation context:
- Customer: ${context.metadata.customerName || 'Unknown'}
- Intent: ${context.metadata.intent || 'General inquiry'}
- Sentiment: ${context.metadata.sentiment || 'neutral'}
- Conversation ID: ${context.conversationId}

Available tools: ${agentConfig.tools.join(', ')}`;

    if (toolResults.length > 0) {
      prompt += `\n\nTool results from this conversation:`;
      toolResults.forEach(tool => {
        prompt += `\n- ${tool.name}: ${JSON.stringify(tool.result)}`;
      });
    }

    prompt += `\n\nRespond naturally and helpfully. If you need to use tools, call them appropriately. If you cannot help with something, offer to escalate to a human agent.`;

    return prompt;
  }

  // Analyze message for intent and sentiment
  private async analyzeMessage(message: string): Promise<MessageAnalysis> {
    // Simple rule-based analysis for MVP (can be enhanced with ML later)
    const intent = this.detectIntent(message);
    const sentiment = this.detectSentiment(message);
    const confidence = 0.8; // Placeholder

    return { intent, sentiment, confidence };
  }

  // Detect if tools need to be called
  private async identifyToolCalls(message: string, availableTools: string[]): Promise<ToolCall[]> {
    const toolCalls: ToolCall[] = [];

    // Simple keyword-based tool detection (can be enhanced with function calling)
    if (message.toLowerCase().includes('weather') && availableTools.includes('weather')) {
      toolCalls.push({
        id: `tool_${Date.now()}`,
        name: 'weather',
        parameters: { query: message },
        result: null,
        status: 'pending'
      });
    }

    if (message.toLowerCase().includes('search') && availableTools.includes('web_search')) {
      toolCalls.push({
        id: `tool_${Date.now()}`,
        name: 'web_search',
        parameters: { query: message },
        result: null,
        status: 'pending'
      });
    }

    return toolCalls;
  }

  // Execute identified tools
  private async executeTools(toolCalls: ToolCall[]): Promise<ToolCall[]> {
    const results = await Promise.all(
      toolCalls.map(async (tool) => {
        try {
          const result = await this.callTool(tool.name, tool.parameters);
          return { ...tool, result, status: 'completed' as const };
        } catch (error) {
          return { ...tool, result: { error: error.message }, status: 'failed' as const };
        }
      })
    );

    return results;
  }

  // Check if conversation needs human escalation
  private checkEscalationTriggers(
    message: string,
    context: ConversationContext,
    response: string
  ): boolean {
    const escalationKeywords = ['human', 'agent', 'manager', 'escalate', 'complaint'];
    const hasEscalationKeyword = escalationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    const isNegativeSentiment = context.metadata.sentiment === 'negative';
    const isLongConversation = context.history.length > 10;
    const hasRepeatedIssue = this.detectRepeatedIssue(context.history);

    return hasEscalationKeyword || (isNegativeSentiment && (isLongConversation || hasRepeatedIssue));
  }

  // Helper methods
  private updateContext(context: ConversationContext, message: ConversationMessage): ConversationContext {
    return {
      ...context,
      history: [...context.history, message]
    };
  }

  private detectIntent(message: string): string {
    // Simple intent detection - can be enhanced
    const intents = {
      'support': ['help', 'problem', 'issue', 'error', 'bug'],
      'information': ['what', 'how', 'when', 'where', 'why'],
      'booking': ['book', 'schedule', 'appointment', 'reserve'],
      'billing': ['bill', 'payment', 'charge', 'invoice', 'cost'],
      'general': []
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return intent;
      }
    }

    return 'general';
  }

  private detectSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed'];

    const positiveCount = positiveWords.filter(word => message.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => message.toLowerCase().includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectRepeatedIssue(history: ConversationMessage[]): boolean {
    // Check if similar issues have been mentioned multiple times
    const recentMessages = history.slice(-6).filter(m => m.role === 'user');
    const keywords = recentMessages.flatMap(m => m.content.toLowerCase().split(' '));
    const keywordCounts = keywords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(keywordCounts).some(count => count >= 3);
  }

  private async callTool(toolName: string, parameters: any): Promise<any> {
    // Tool calling implementation - integrate with your tool system
    switch (toolName) {
      case 'weather':
        return await this.getWeather(parameters.query);
      case 'web_search':
        return await this.webSearch(parameters.query);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async getWeather(query: string): Promise<any> {
    // Implement weather API call
    return { temperature: '72°F', condition: 'Sunny', location: 'San Francisco' };
  }

  private async webSearch(query: string): Promise<any> {
    // Implement web search API call
    return { results: ['Sample search result 1', 'Sample search result 2'] };
  }

  private formatConversationHistory(history: ConversationMessage[]): any[] {
    return history.slice(-10).map(msg => ({
      role: msg.role === 'agent' ? 'assistant' : msg.role,
      content: msg.content
    }));
  }

  private buildFunctionDefinitions(tools: string[]): any[] {
    // Build OpenAI function definitions for tool calling
    const functions = [];
    
    if (tools.includes('weather')) {
      functions.push({
        name: 'get_weather',
        description: 'Get current weather information',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'The location to get weather for' }
          },
          required: ['location']
        }
      });
    }

    return functions;
  }

  private async storeAudioFile(audioBuffer: ArrayBuffer): Promise<string> {
    // Store audio file and return URL - implement with your storage solution
    return 'https://example.com/audio/response.mp3';
  }
}

// Real-time voice conversation stream
export class VoiceConversationStream {
  private context: ConversationContext;
  private agentConfig: AgentConfig;
  private ai: ConversationalAI;
  private isActive: boolean = false;

  constructor(context: ConversationContext, agentConfig: AgentConfig, ai: ConversationalAI) {
    this.context = context;
    this.agentConfig = agentConfig;
    this.ai = ai;
  }

  async start(): Promise<void> {
    this.isActive = true;
    await audioManager.initialize();
    // Implement real-time audio streaming
  }

  async stop(): Promise<void> {
    this.isActive = false;
    audioManager.cleanup();
  }

  async processAudioChunk(audioChunk: Blob): Promise<void> {
    if (!this.isActive) return;
    
    // Process audio chunk in real-time
    const response = await this.ai.processVoiceMessage(
      audioChunk,
      this.context,
      this.agentConfig
    );

    // Play response audio
    if (response.audioBuffer) {
      await audioManager.playAudio(response.audioBuffer);
    }
  }
}

// Type definitions
export interface AgentConfig {
  name: string;
  personality: string;
  instructions: string;
  model: string;
  temperature: number;
  max_tokens: number;
  tools: string[];
  voice_settings?: {
    voice_id: string;
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

export interface ConversationResponse {
  response: string;
  context: ConversationContext;
  toolCalls: ToolCall[];
  needsEscalation: boolean;
  confidence: number;
}

export interface VoiceConversationResponse extends ConversationResponse {
  transcription: string;
  audioUrl: string;
  audioBuffer: ArrayBuffer;
}

export interface MessageAnalysis {
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}