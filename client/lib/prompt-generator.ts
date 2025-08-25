/**
 * System Prompt Generation Service
 * Handles dynamic system prompt generation based on personality configuration
 */

import { PersonalityConfig, AgentTemplate } from './agent-service';

export interface PromptGenerationOptions {
  agentName: string;
  agentDescription?: string;
  template?: AgentTemplate;
  knowledgeBases?: string[];
  capabilities?: string[];
  customInstructions?: string;
}

export interface PromptValidationResult {
  isValid: boolean;
  errors: PromptValidationError[];
  warnings: PromptValidationWarning[];
  score: number; // 0-100
  suggestions: string[];
}

export interface PromptValidationError {
  type: 'length' | 'structure' | 'content' | 'formatting';
  message: string;
  severity: 'error' | 'warning';
  position?: number;
}

export interface PromptValidationWarning {
  type: 'optimization' | 'clarity' | 'consistency';
  message: string;
  suggestion: string;
}

export interface PromptTestScenario {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedBehavior: string[];
  category: 'greeting' | 'task' | 'edge_case' | 'personality';
}

export interface PromptTestResult {
  scenarioId: string;
  input: string;
  output: string;
  score: number;
  feedback: string[];
  behaviorMatch: boolean;
  timestamp: string;
}

export class PromptGeneratorService {
  private static instance: PromptGeneratorService;

  static getInstance(): PromptGeneratorService {
    if (!PromptGeneratorService.instance) {
      PromptGeneratorService.instance = new PromptGeneratorService();
    }
    return PromptGeneratorService.instance;
  }

  /**
   * Generate system prompt based on personality configuration
   */
  generateSystemPrompt(
    personality: PersonalityConfig,
    options: PromptGenerationOptions
  ): string {
    const sections: string[] = [];

    // Role and Identity Section
    sections.push(this.generateRoleSection(options));

    // Personality and Communication Style Section
    sections.push(this.generatePersonalitySection(personality));

    // Response Guidelines Section
    sections.push(this.generateResponseGuidelinesSection(personality));

    // Template-specific customizations
    if (options.template) {
      sections.push(this.generateTemplateSection(options.template));
    }

    // Capabilities Section
    if (options.capabilities && options.capabilities.length > 0) {
      sections.push(this.generateCapabilitiesSection(options.capabilities));
    }

    // Knowledge Base Section
    if (options.knowledgeBases && options.knowledgeBases.length > 0) {
      sections.push(this.generateKnowledgeBaseSection(options.knowledgeBases));
    }

    // Custom Instructions Section
    if (options.customInstructions) {
      sections.push(this.generateCustomInstructionsSection(options.customInstructions));
    }

    // General Guidelines Section
    sections.push(this.generateGeneralGuidelinesSection());

    return sections.join('\n\n');
  }

  /**
   * Generate role and identity section
   */
  private generateRoleSection(options: PromptGenerationOptions): string {
    const lines = [
      `# Role and Identity`,
      `You are ${options.agentName}, an AI assistant designed to help users effectively and professionally.`
    ];

    if (options.agentDescription) {
      lines.push(`\n## Purpose`);
      lines.push(options.agentDescription);
    }

    return lines.join('\n');
  }

  /**
   * Generate personality and communication style section
   */
  private generatePersonalitySection(personality: PersonalityConfig): string {
    const toneDescriptions = {
      professional: 'professional and business-like',
      friendly: 'warm, approachable, and personable',
      casual: 'relaxed and conversational',
      formal: 'structured, respectful, and dignified',
      enthusiastic: 'energetic, excited, and passionate',
      encouraging: 'supportive, motivating, and uplifting'
    };

    const creativityDescription = this.getCreativityDescription(personality.creativityLevel);

    const lines = [
      `# Personality and Communication Style`,
      ``,
      `## Core Personality Traits`,
      `- **Communication Tone**: ${personality.tone} - Be ${toneDescriptions[personality.tone]} in all interactions`,
      `- **Creativity Level**: ${personality.creativityLevel}% - ${creativityDescription}`,
      ``,
      `## Response Style Configuration`,
      `- **Length**: ${personality.responseStyle.length} - Provide ${this.getLengthDescription(personality.responseStyle.length)} responses`,
      `- **Formality**: ${personality.responseStyle.formality} - Use ${this.getFormalityDescription(personality.responseStyle.formality)} language`,
      `- **Empathy**: ${personality.responseStyle.empathy} - Show ${this.getEmpathyDescription(personality.responseStyle.empathy)} emotional awareness`,
      `- **Proactivity**: ${personality.responseStyle.proactivity} - Be ${this.getProactivityDescription(personality.responseStyle.proactivity)} in offering assistance`
    ];

    return lines.join('\n');
  }

  /**
   * Generate response guidelines section
   */
  private generateResponseGuidelinesSection(personality: PersonalityConfig): string {
    const lines = [
      `# Response Guidelines`,
      ``,
      `## Communication Approach`,
      this.getResponseApproach(personality),
      ``,
      `## Interaction Style`,
      this.getInteractionStyle(personality),
      ``,
      `## Problem-Solving Approach`,
      this.getProblemSolvingApproach(personality)
    ];

    return lines.join('\n');
  }

  /**
   * Generate template-specific section
   */
  private generateTemplateSection(template: AgentTemplate): string {
    const lines = [
      `# Template-Specific Guidelines`,
      ``,
      `## Template Context`,
      `This agent is based on the "${template.name}" template, designed for ${template.category} use cases.`,
      ``,
      `## Template Description`,
      template.description
    ];

    // Add template-specific personality overrides if they exist
    if (template.default_personality) {
      lines.push(``, `## Template Personality Adjustments`);
      lines.push(`Follow the base personality configuration with these template-specific adjustments:`);
      
      if (template.default_personality.tone !== undefined) {
        lines.push(`- Emphasize ${template.default_personality.tone} communication style`);
      }

      if (template.default_personality.responseStyle) {
        const style = template.default_personality.responseStyle;
        if (style.length) {
          lines.push(`- Provide ${style.length} responses as appropriate for this template`);
        }
        if (style.empathy) {
          lines.push(`- Show ${style.empathy} empathy levels suitable for ${template.category} interactions`);
        }
        if (style.proactivity) {
          lines.push(`- Be ${style.proactivity} in offering assistance within this domain`);
        }
      }
    }

    // Add category-specific guidelines
    lines.push(``, `## Category-Specific Guidelines`);
    lines.push(...this.getCategorySpecificGuidelines(template.category));

    // Add sample conversation context if available
    if (template.sample_conversations && template.sample_conversations.length > 0) {
      lines.push(``, `## Sample Interaction Style`);
      lines.push(`Reference these examples for appropriate interaction patterns:`);
      
      template.sample_conversations.slice(0, 2).forEach((conversation, index) => {
        lines.push(``, `### Example ${index + 1}:`);
        conversation.messages.slice(0, 4).forEach(message => {
          lines.push(`**${message.role}**: ${message.content}`);
        });
      });
    }

    return lines.join('\n');
  }

  /**
   * Get category-specific guidelines
   */
  private getCategorySpecificGuidelines(category: string): string[] {
    const guidelines: Record<string, string[]> = {
      'customer_service': [
        '- Prioritize customer satisfaction and problem resolution',
        '- Use active listening techniques and acknowledge concerns',
        '- Escalate complex issues when appropriate',
        '- Maintain patience even with difficult customers',
        '- Follow up to ensure issues are resolved'
      ],
      'sales': [
        '- Focus on understanding customer needs before presenting solutions',
        '- Use consultative selling techniques',
        '- Handle objections professionally and provide value-based responses',
        '- Build rapport and trust throughout the conversation',
        '- Know when to close and when to nurture leads'
      ],
      'support': [
        '- Provide step-by-step troubleshooting guidance',
        '- Ask diagnostic questions to identify root causes',
        '- Explain technical concepts in accessible language',
        '- Document solutions for future reference',
        '- Verify that solutions work before closing tickets'
      ],
      'education': [
        '- Adapt explanations to the learner\'s level of understanding',
        '- Use examples and analogies to clarify complex concepts',
        '- Encourage questions and active participation',
        '- Provide additional resources for further learning',
        '- Check for understanding before moving to new topics'
      ],
      'healthcare': [
        '- Maintain strict confidentiality and privacy standards',
        '- Use empathetic and reassuring communication',
        '- Provide accurate health information while avoiding diagnosis',
        '- Encourage users to consult healthcare professionals when appropriate',
        '- Be sensitive to health anxiety and concerns'
      ],
      'finance': [
        '- Provide accurate financial information and calculations',
        '- Explain financial concepts clearly and avoid jargon',
        '- Emphasize the importance of professional financial advice',
        '- Maintain confidentiality of financial information',
        '- Help users understand risks and benefits of financial decisions'
      ],
      'legal': [
        '- Provide general legal information, not legal advice',
        '- Encourage consultation with qualified legal professionals',
        '- Use clear, accessible language to explain legal concepts',
        '- Maintain strict confidentiality standards',
        '- Be precise and accurate in legal information provided'
      ],
      'hr': [
        '- Maintain confidentiality of employee information',
        '- Provide clear information about policies and procedures',
        '- Handle sensitive topics with discretion and empathy',
        '- Ensure compliance with employment laws and regulations',
        '- Foster a positive and inclusive workplace environment'
      ],
      'marketing': [
        '- Focus on understanding target audience needs and preferences',
        '- Create compelling and engaging content',
        '- Maintain brand consistency in all communications',
        '- Use data-driven insights to inform recommendations',
        '- Balance promotional content with valuable information'
      ]
    };

    return guidelines[category] || [
      '- Provide helpful and accurate information within your domain',
      '- Maintain professional standards appropriate for your field',
      '- Ask clarifying questions to better understand user needs',
      '- Offer relevant resources and next steps when appropriate'
    ];
  }

  /**
   * Generate capabilities section
   */
  private generateCapabilitiesSection(capabilities: string[]): string {
    const lines = [
      `# Available Capabilities`,
      ``,
      `You have access to the following capabilities:`,
      ...capabilities.map(cap => `- ${cap}`)
    ];

    if (capabilities.includes('voice')) {
      lines.push(``, `## Voice Interaction Guidelines`);
      lines.push(`- Speak naturally and conversationally`);
      lines.push(`- Use appropriate pacing and tone`);
      lines.push(`- Acknowledge when switching between voice and text`);
    }

    if (capabilities.includes('image')) {
      lines.push(``, `## Image Processing Guidelines`);
      lines.push(`- Describe images clearly and accurately`);
      lines.push(`- Ask clarifying questions about visual content when needed`);
      lines.push(`- Provide context for visual elements`);
    }

    if (capabilities.includes('video')) {
      lines.push(``, `## Video Interaction Guidelines`);
      lines.push(`- Maintain appropriate eye contact and body language`);
      lines.push(`- Use visual cues and gestures when helpful`);
      lines.push(`- Be aware of visual context and environment`);
    }

    return lines.join('\n');
  }

  /**
   * Generate knowledge base section
   */
  private generateKnowledgeBaseSection(knowledgeBases: string[]): string {
    const lines = [
      `# Knowledge Base Integration`,
      ``,
      `You have access to the following knowledge bases:`,
      ...knowledgeBases.map(kb => `- ${kb}`),
      ``,
      `## Knowledge Base Usage Guidelines`,
      `- Always prioritize information from your knowledge bases when relevant`,
      `- Cite sources when providing specific information from knowledge bases`,
      `- If information conflicts between sources, acknowledge the discrepancy`,
      `- When knowledge base information is insufficient, clearly state limitations`
    ];

    return lines.join('\n');
  }

  /**
   * Generate custom instructions section
   */
  private generateCustomInstructionsSection(customInstructions: string): string {
    return [
      `# Custom Instructions`,
      ``,
      customInstructions
    ].join('\n');
  }

  /**
   * Generate general guidelines section
   */
  private generateGeneralGuidelinesSection(): string {
    return [
      `# General Guidelines`,
      ``,
      `## Core Principles`,
      `- Always maintain your personality traits consistently throughout conversations`,
      `- Provide helpful, accurate, and relevant responses`,
      `- Ask clarifying questions when user intent is unclear`,
      `- Be respectful and professional at all times`,
      `- Acknowledge limitations and suggest alternatives when you cannot help`,
      ``,
      `## Error Handling`,
      `- If you encounter an error or cannot process a request, explain the issue clearly`,
      `- Offer alternative approaches or solutions when possible`,
      `- Maintain your personality even when handling errors or limitations`,
      ``,
      `## Conversation Management`,
      `- Remember context from earlier in the conversation`,
      `- Build upon previous interactions naturally`,
      `- Summarize complex discussions when helpful`,
      `- End conversations gracefully when appropriate`
    ].join('\n');
  }

  /**
   * Validate system prompt
   */
  validatePrompt(prompt: string): PromptValidationResult {
    const errors: PromptValidationError[] = [];
    const warnings: PromptValidationWarning[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Length validation
    if (prompt.length < 100) {
      errors.push({
        type: 'length',
        message: 'Prompt is too short. Consider adding more detailed instructions.',
        severity: 'error'
      });
      score -= 30;
    } else if (prompt.length > 4000) {
      warnings.push({
        type: 'optimization',
        message: 'Prompt is quite long. Consider condensing for better performance.',
        suggestion: 'Break down complex instructions into clearer, more concise sections.'
      });
      score -= 10;
    }

    // Structure validation
    const hasRoleSection = prompt.includes('Role') || prompt.includes('You are');
    const hasPersonalitySection = prompt.includes('personality') || prompt.includes('tone') || prompt.includes('communication');
    const hasGuidelinesSection = prompt.includes('Guidelines') || prompt.includes('Instructions') || prompt.includes('Behavior');

    if (!hasRoleSection) {
      errors.push({
        type: 'structure',
        message: 'Missing role definition section.',
        severity: 'error'
      });
      score -= 20;
    }

    if (!hasPersonalitySection) {
      warnings.push({
        type: 'clarity',
        message: 'No clear personality definition found.',
        suggestion: 'Add a section defining the agent\'s personality and communication style.'
      });
      score -= 10;
    }

    if (!hasGuidelinesSection) {
      warnings.push({
        type: 'clarity',
        message: 'No behavioral guidelines found.',
        suggestion: 'Add guidelines for how the agent should behave in different situations.'
      });
      score -= 10;
    }

    // Content validation
    const contradictoryTerms = this.findContradictoryTerms(prompt);
    if (contradictoryTerms.length > 0) {
      errors.push({
        type: 'content',
        message: `Found contradictory instructions: ${contradictoryTerms.join(', ')}`,
        severity: 'warning'
      });
      score -= 15;
    }

    // Formatting validation
    const hasProperFormatting = prompt.includes('#') || prompt.includes('##');
    if (!hasProperFormatting) {
      warnings.push({
        type: 'optimization',
        message: 'Consider using headers to structure the prompt better.',
        suggestion: 'Use markdown headers (# and ##) to organize different sections.'
      });
      score -= 5;
    }

    // Advanced content analysis
    const analysisResults = this.analyzePromptContent(prompt);
    score += analysisResults.scoreAdjustment;
    errors.push(...analysisResults.errors);
    warnings.push(...analysisResults.warnings);

    // Generate suggestions
    if (score > 90) {
      suggestions.push('Excellent prompt! Consider testing with various scenarios.');
    } else if (score > 75) {
      suggestions.push('Good prompt with room for minor improvements.');
    } else if (score > 60) {
      suggestions.push('Adequate prompt that could benefit from more detailed instructions.');
    } else {
      suggestions.push('Prompt needs significant improvement for optimal performance.');
    }

    // Add specific suggestions based on analysis
    suggestions.push(...analysisResults.suggestions);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score)),
      suggestions
    };
  }

  /**
   * Analyze prompt content for advanced validation
   */
  private analyzePromptContent(prompt: string): {
    scoreAdjustment: number;
    errors: PromptValidationError[];
    warnings: PromptValidationWarning[];
    suggestions: string[];
  } {
    const errors: PromptValidationError[] = [];
    const warnings: PromptValidationWarning[] = [];
    const suggestions: string[] = [];
    let scoreAdjustment = 0;

    const lowerPrompt = prompt.toLowerCase();

    // Check for clarity indicators
    const clarityKeywords = ['clear', 'specific', 'detailed', 'precise', 'accurate'];
    const clarityCount = clarityKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    if (clarityCount >= 3) {
      scoreAdjustment += 5;
    } else if (clarityCount === 0) {
      warnings.push({
        type: 'clarity',
        message: 'Consider adding clarity-focused language to improve instruction precision.',
        suggestion: 'Include words like "clear", "specific", or "detailed" in your instructions.'
      });
      scoreAdjustment -= 3;
    }

    // Check for empathy and emotional intelligence
    const empathyKeywords = ['empathy', 'understanding', 'compassionate', 'supportive', 'patient'];
    const hasEmpathy = empathyKeywords.some(keyword => lowerPrompt.includes(keyword));
    if (hasEmpathy) {
      scoreAdjustment += 3;
    }

    // Check for error handling instructions
    const errorHandlingKeywords = ['error', 'mistake', 'cannot', 'unable', 'limitation'];
    const hasErrorHandling = errorHandlingKeywords.some(keyword => lowerPrompt.includes(keyword));
    if (!hasErrorHandling) {
      warnings.push({
        type: 'clarity',
        message: 'No error handling instructions found.',
        suggestion: 'Add guidance for how the agent should handle errors or limitations.'
      });
      scoreAdjustment -= 5;
    }

    // Check for conversation management
    const conversationKeywords = ['conversation', 'context', 'remember', 'follow-up', 'continue'];
    const hasConversationManagement = conversationKeywords.some(keyword => lowerPrompt.includes(keyword));
    if (hasConversationManagement) {
      scoreAdjustment += 3;
    } else {
      suggestions.push('Consider adding conversation management instructions.');
    }

    // Check for overly complex sentences
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const longSentences = sentences.filter(s => s.split(' ').length > 30);
    if (longSentences.length > sentences.length * 0.3) {
      warnings.push({
        type: 'clarity',
        message: 'Some sentences are quite long and may be hard to process.',
        suggestion: 'Break down complex sentences into shorter, clearer instructions.'
      });
      scoreAdjustment -= 5;
    }

    // Check for specific behavioral instructions
    const behaviorKeywords = ['always', 'never', 'should', 'must', 'ensure'];
    const behaviorCount = behaviorKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    if (behaviorCount >= 5) {
      scoreAdjustment += 5;
    } else if (behaviorCount < 2) {
      suggestions.push('Add more specific behavioral instructions using words like "always", "should", or "ensure".');
    }

    return {
      scoreAdjustment,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get test scenarios for prompt testing
   */
  getTestScenarios(): PromptTestScenario[] {
    return [
      {
        id: 'greeting-test',
        name: 'Initial Greeting',
        description: 'Test how the agent greets new users',
        input: 'Hello, I need help with something.',
        expectedBehavior: ['Warm greeting', 'Offer assistance', 'Ask clarifying questions'],
        category: 'greeting'
      },
      {
        id: 'personality-consistency',
        name: 'Personality Consistency',
        description: 'Test if the agent maintains consistent personality',
        input: 'Can you help me understand this complex topic?',
        expectedBehavior: ['Maintain configured tone', 'Show appropriate empathy level', 'Use consistent formality'],
        category: 'personality'
      },
      {
        id: 'task-handling',
        name: 'Task Handling',
        description: 'Test how the agent handles specific tasks',
        input: 'I need you to analyze this data and provide recommendations.',
        expectedBehavior: ['Acknowledge request', 'Ask for clarification if needed', 'Provide structured response'],
        category: 'task'
      },
      {
        id: 'edge-case',
        name: 'Out of Scope Request',
        description: 'Test handling of requests outside capabilities',
        input: 'Can you physically deliver something to my house?',
        expectedBehavior: ['Politely decline', 'Explain limitations', 'Suggest alternatives'],
        category: 'edge_case'
      },
      {
        id: 'complex-query',
        name: 'Complex Multi-Part Query',
        description: 'Test handling of complex requests with multiple components',
        input: 'I have three questions: First, what are the benefits of your service? Second, how much does it cost? And third, can you integrate with my existing tools?',
        expectedBehavior: ['Break down the query', 'Address each part systematically', 'Provide comprehensive response'],
        category: 'task'
      },
      {
        id: 'emotional-situation',
        name: 'Emotional User Interaction',
        description: 'Test empathy and emotional intelligence',
        input: 'I\'m really frustrated and stressed about this problem. Nothing seems to be working!',
        expectedBehavior: ['Acknowledge emotions', 'Show empathy', 'Offer calm support'],
        category: 'personality'
      },
      {
        id: 'technical-explanation',
        name: 'Technical Explanation Request',
        description: 'Test ability to explain complex concepts clearly',
        input: 'Can you explain how machine learning works in simple terms?',
        expectedBehavior: ['Use accessible language', 'Provide clear examples', 'Check understanding'],
        category: 'task'
      },
      {
        id: 'follow-up-context',
        name: 'Follow-up with Context',
        description: 'Test conversation continuity and context awareness',
        input: 'Thanks for that explanation. Can you give me more details about the second point you mentioned?',
        expectedBehavior: ['Reference previous context', 'Provide relevant details', 'Maintain conversation flow'],
        category: 'personality'
      }
    ];
  }

  /**
   * Test prompt with a scenario (mock implementation)
   */
  async testPrompt(prompt: string, scenario: PromptTestScenario): Promise<PromptTestResult> {
    // In a real implementation, this would call the AI service with the prompt
    // For now, we'll simulate the response based on prompt analysis
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const mockResponse = this.generateMockResponse(prompt, scenario);
    const score = this.calculateTestScore(mockResponse, scenario, prompt);
    const feedback = this.generateTestFeedback(score, scenario, prompt);

    return {
      scenarioId: scenario.id,
      input: scenario.input,
      output: mockResponse,
      score,
      feedback,
      behaviorMatch: score > 70,
      timestamp: new Date().toISOString()
    };
  }

  // Helper methods for prompt generation
  private getCreativityDescription(level: number): string {
    if (level < 30) return 'Be conservative and stick to factual information';
    if (level > 70) return 'Be creative and offer innovative solutions';
    return 'Be balanced, providing thoughtful and well-reasoned responses';
  }

  private getLengthDescription(length: string): string {
    switch (length) {
      case 'concise': return 'brief, to-the-point';
      case 'detailed': return 'comprehensive and thorough';
      case 'comprehensive': return 'in-depth and exhaustive';
      default: return 'appropriately detailed';
    }
  }

  private getFormalityDescription(formality: string): string {
    switch (formality) {
      case 'casual': return 'relaxed and conversational';
      case 'professional': return 'business-appropriate and polished';
      case 'formal': return 'structured and respectful';
      default: return 'appropriately formal';
    }
  }

  private getEmpathyDescription(empathy: string): string {
    switch (empathy) {
      case 'low': return 'minimal but appropriate';
      case 'medium': return 'balanced';
      case 'high': return 'high levels of';
      default: return 'appropriate';
    }
  }

  private getProactivityDescription(proactivity: string): string {
    switch (proactivity) {
      case 'reactive': return 'responsive to direct questions';
      case 'balanced': return 'moderately proactive with relevant suggestions';
      case 'proactive': return 'highly proactive in anticipating needs';
      default: return 'appropriately proactive';
    }
  }

  private getResponseApproach(personality: PersonalityConfig): string {
    const approaches = [];
    
    if (personality.tone === 'friendly') {
      approaches.push('- Use warm, welcoming language');
      approaches.push('- Show genuine interest in helping');
    } else if (personality.tone === 'professional') {
      approaches.push('- Maintain business-appropriate communication');
      approaches.push('- Focus on efficiency and clarity');
    } else if (personality.tone === 'enthusiastic') {
      approaches.push('- Show excitement and energy in responses');
      approaches.push('- Use positive, uplifting language');
    }

    if (personality.responseStyle.empathy === 'high') {
      approaches.push('- Acknowledge user emotions and concerns');
      approaches.push('- Show understanding and compassion');
    }

    return approaches.join('\n');
  }

  private getInteractionStyle(personality: PersonalityConfig): string {
    const styles = [];

    if (personality.responseStyle.proactivity === 'proactive') {
      styles.push('- Anticipate user needs and offer relevant suggestions');
      styles.push('- Ask follow-up questions to better understand requirements');
    } else if (personality.responseStyle.proactivity === 'reactive') {
      styles.push('- Respond directly to user questions without additional suggestions');
      styles.push('- Wait for explicit requests before offering help');
    }

    if (personality.responseStyle.length === 'comprehensive') {
      styles.push('- Provide thorough explanations with examples');
      styles.push('- Include relevant background information');
    } else if (personality.responseStyle.length === 'concise') {
      styles.push('- Keep responses brief and focused');
      styles.push('- Provide direct answers without unnecessary elaboration');
    }

    return styles.join('\n');
  }

  private getProblemSolvingApproach(personality: PersonalityConfig): string {
    const approaches = [
      '- Break down complex problems into manageable steps',
      '- Provide clear, actionable solutions',
      '- Verify understanding before proceeding'
    ];

    if (personality.creativityLevel > 70) {
      approaches.push('- Offer creative and innovative solutions');
      approaches.push('- Think outside the box when appropriate');
    } else if (personality.creativityLevel < 30) {
      approaches.push('- Stick to proven, reliable methods');
      approaches.push('- Focus on factual, evidence-based solutions');
    }

    return approaches.join('\n');
  }

  private findContradictoryTerms(prompt: string): string[] {
    const contradictions = [];
    const lowerPrompt = prompt.toLowerCase();

    // Check for tone contradictions
    if (lowerPrompt.includes('formal') && lowerPrompt.includes('casual')) {
      contradictions.push('formal vs casual');
    }

    if (lowerPrompt.includes('brief') && lowerPrompt.includes('comprehensive')) {
      contradictions.push('brief vs comprehensive');
    }

    if (lowerPrompt.includes('professional') && lowerPrompt.includes('enthusiastic')) {
      // This might not be contradictory, but worth noting
    }

    return contradictions;
  }

  private generateMockResponse(prompt: string, scenario: PromptTestScenario): string {
    // Analyze prompt to generate appropriate mock response
    const lowerPrompt = prompt.toLowerCase();
    const promptAnalysis = this.analyzePromptForResponse(prompt);
    
    let response = '';

    switch (scenario.id) {
      case 'greeting-test':
        response = this.generateGreetingResponse(promptAnalysis);
        break;
      case 'personality-consistency':
        response = this.generatePersonalityResponse(promptAnalysis);
        break;
      case 'task-handling':
        response = this.generateTaskResponse(promptAnalysis);
        break;
      case 'edge-case':
        response = this.generateEdgeCaseResponse(promptAnalysis);
        break;
      case 'complex-query':
        response = this.generateComplexQueryResponse(promptAnalysis);
        break;
      case 'emotional-situation':
        response = this.generateEmotionalResponse(promptAnalysis);
        break;
      case 'technical-explanation':
        response = this.generateTechnicalResponse(promptAnalysis);
        break;
      case 'follow-up-context':
        response = this.generateFollowUpResponse(promptAnalysis);
        break;
      default:
        response = this.generateDefaultResponse(promptAnalysis);
    }

    return response;
  }

  private analyzePromptForResponse(prompt: string): {
    tone: string;
    empathy: string;
    formality: string;
    proactivity: string;
    agentName: string;
    hasErrorHandling: boolean;
    hasPersonality: boolean;
  } {
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract tone
    let tone = 'neutral';
    if (lowerPrompt.includes('friendly')) tone = 'friendly';
    else if (lowerPrompt.includes('professional')) tone = 'professional';
    else if (lowerPrompt.includes('casual')) tone = 'casual';
    else if (lowerPrompt.includes('formal')) tone = 'formal';
    else if (lowerPrompt.includes('enthusiastic')) tone = 'enthusiastic';

    // Extract empathy level
    let empathy = 'medium';
    if (lowerPrompt.includes('high empathy') || lowerPrompt.includes('empathetic')) empathy = 'high';
    else if (lowerPrompt.includes('low empathy')) empathy = 'low';

    // Extract formality
    let formality = 'professional';
    if (lowerPrompt.includes('casual')) formality = 'casual';
    else if (lowerPrompt.includes('formal')) formality = 'formal';

    // Extract proactivity
    let proactivity = 'balanced';
    if (lowerPrompt.includes('proactive')) proactivity = 'proactive';
    else if (lowerPrompt.includes('reactive')) proactivity = 'reactive';

    // Extract agent name
    const nameMatch = prompt.match(/You are (\w+)/i);
    const agentName = nameMatch ? nameMatch[1] : 'Assistant';

    return {
      tone,
      empathy,
      formality,
      proactivity,
      agentName,
      hasErrorHandling: lowerPrompt.includes('error') || lowerPrompt.includes('limitation'),
      hasPersonality: lowerPrompt.includes('personality') || lowerPrompt.includes('tone')
    };
  }

  private generateGreetingResponse(analysis: any): string {
    const greetings = {
      friendly: "Hi there! I'm delighted to help you today.",
      professional: "Good day. I am here to provide assistance.",
      casual: "Hey! What's up? How can I help?",
      formal: "Good day. I shall be pleased to assist you.",
      enthusiastic: "Hello! I'm excited to help you with whatever you need!"
    };

    const baseGreeting = greetings[analysis.tone as keyof typeof greetings] || "Hello! I'm here to help.";
    
    let response = baseGreeting;
    
    if (analysis.proactivity === 'proactive') {
      response += " What specific challenge can I help you tackle today?";
    } else {
      response += " What can I assist you with?";
    }

    return response;
  }

  private generatePersonalityResponse(analysis: any): string {
    let response = "";

    if (analysis.tone === 'friendly') {
      response = "I'd love to help you understand this topic! ";
    } else if (analysis.tone === 'professional') {
      response = "I'll be happy to provide a clear explanation of this topic. ";
    } else if (analysis.tone === 'enthusiastic') {
      response = "What an interesting topic! I'm excited to break this down for you. ";
    } else {
      response = "I can certainly help explain this topic. ";
    }

    if (analysis.empathy === 'high') {
      response += "I understand that complex topics can sometimes feel overwhelming, but we'll work through it together step by step.";
    } else if (analysis.empathy === 'low') {
      response += "Let me provide you with the key information you need.";
    } else {
      response += "Let me break this down in a way that makes sense.";
    }

    return response;
  }

  private generateTaskResponse(analysis: any): string {
    let response = "I understand you need data analysis and recommendations. ";

    if (analysis.proactivity === 'proactive') {
      response += "To provide the most valuable insights, I'll need to understand: What type of data are we working with? What specific outcomes are you hoping to achieve? Are there any particular metrics or KPIs you're focused on?";
    } else {
      response += "Could you please share the data you'd like me to analyze?";
    }

    return response;
  }

  private generateEdgeCaseResponse(analysis: any): string {
    let response = "";

    if (analysis.hasErrorHandling) {
      if (analysis.tone === 'friendly') {
        response = "I appreciate you thinking of me, but I'm not able to physically deliver items since I'm an AI assistant. ";
      } else if (analysis.tone === 'professional') {
        response = "I must clarify that as an AI assistant, I cannot provide physical delivery services. ";
      } else {
        response = "I'm not able to physically deliver items as I'm an AI assistant. ";
      }

      if (analysis.proactivity === 'proactive') {
        response += "However, I can help you find local delivery services, compare shipping options, or assist with online ordering processes. Would any of these alternatives be helpful?";
      } else {
        response += "Is there another way I can assist you?";
      }
    } else {
      response = "I cannot help with physical deliveries, but I can assist with other requests.";
    }

    return response;
  }

  private generateComplexQueryResponse(analysis: any): string {
    let response = "I see you have three important questions. Let me address each one systematically:\n\n";
    
    response += "1. Regarding the benefits of our service: [This would contain specific benefits based on context]\n";
    response += "2. About pricing: [This would contain pricing information]\n";
    response += "3. For integrations: [This would contain integration details]\n\n";
    
    if (analysis.proactivity === 'proactive') {
      response += "Would you like me to elaborate on any of these points, or do you have additional questions about implementation?";
    } else {
      response += "Does this address all your questions?";
    }

    return response;
  }

  private generateEmotionalResponse(analysis: any): string {
    let response = "";

    if (analysis.empathy === 'high') {
      response = "I can hear how frustrated and stressed you're feeling right now, and I completely understand why this situation would be overwhelming. ";
      response += "It's really tough when nothing seems to be working despite your best efforts. ";
      response += "Let's take this step by step and see if we can find a solution together. Can you tell me more about what specific issues you're encountering?";
    } else if (analysis.empathy === 'medium') {
      response = "I understand this situation is causing you stress. Let me see how I can help resolve the problem you're facing. ";
      response += "What specific issues are you encountering?";
    } else {
      response = "I see you're having difficulties. Let me help you resolve this problem. What exactly isn't working?";
    }

    return response;
  }

  private generateTechnicalResponse(analysis: any): string {
    let response = "Machine learning is essentially a way for computers to learn patterns from data, much like how humans learn from experience. ";
    
    if (analysis.tone === 'friendly') {
      response += "Think of it like teaching a child to recognize animals - you show them many pictures of cats and dogs, and eventually they learn to tell the difference. ";
    } else if (analysis.tone === 'professional') {
      response += "The system analyzes large datasets to identify patterns and make predictions or decisions based on those patterns. ";
    }
    
    response += "The computer 'learns' by finding patterns in examples, then uses those patterns to make predictions about new, unseen data.";
    
    if (analysis.proactivity === 'proactive') {
      response += " Would you like me to explain any specific type of machine learning, or do you have questions about how it's applied in particular industries?";
    }

    return response;
  }

  private generateFollowUpResponse(analysis: any): string {
    let response = "";

    if (analysis.tone === 'friendly') {
      response = "Of course! I'm happy to dive deeper into that second point. ";
    } else if (analysis.tone === 'professional') {
      response = "Certainly. Let me provide additional details regarding the second point I mentioned. ";
    } else {
      response = "Sure, let me elaborate on that second point. ";
    }

    response += "[This would contain specific details about the referenced point from the previous conversation]";

    return response;
  }

  private generateDefaultResponse(analysis: any): string {
    return `I understand you need assistance. As ${analysis.agentName}, I'm here to help you with your request. Could you provide more details about what you need?`;
  }

  private calculateTestScore(response: string, scenario: PromptTestScenario, prompt: string): number {
    let score = 70; // Base score

    // Check if response matches expected behaviors
    const lowerResponse = response.toLowerCase();
    const matchedBehaviors = scenario.expectedBehavior.filter(behavior => {
      const lowerBehavior = behavior.toLowerCase();
      return lowerResponse.includes(lowerBehavior.split(' ')[0]) || 
             lowerResponse.includes(lowerBehavior.split(' ')[1]);
    });

    score += (matchedBehaviors.length / scenario.expectedBehavior.length) * 20;

    // Check prompt quality influence
    const promptValidation = this.validatePrompt(prompt);
    score += (promptValidation.score - 70) * 0.1;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateTestFeedback(score: number, scenario: PromptTestScenario, prompt: string): string[] {
    const feedback: string[] = [];

    if (score >= 90) {
      feedback.push('Excellent response! The prompt is working very well for this scenario.');
    } else if (score >= 75) {
      feedback.push('Good response with minor room for improvement.');
    } else if (score >= 60) {
      feedback.push('Adequate response, but the prompt could be enhanced.');
    } else {
      feedback.push('Response needs improvement. Consider refining the prompt.');
    }

    if (scenario.category === 'greeting' && score < 80) {
      feedback.push('Consider adding more specific greeting instructions to the prompt.');
    }

    if (scenario.category === 'personality' && score < 75) {
      feedback.push('The personality traits may not be clearly defined in the prompt.');
    }

    return feedback;
  }
}

// Export singleton instance
export const promptGenerator = PromptGeneratorService.getInstance();