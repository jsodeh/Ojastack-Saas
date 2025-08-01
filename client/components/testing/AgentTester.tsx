/**
 * Agent Tester
 * Interactive chat interface for testing agents
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  RotateCcw, 
  Download,
  Upload,
  Play,
  Pause,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    responseTime?: number;
    tokens?: number;
    model?: string;
    confidence?: number;
  };
}

interface TestSession {
  id: string;
  agentId: string;
  agentName: string;
  startedAt: string;
  endedAt?: string;
  messages: Message[];
  totalMessages: number;
  avgResponseTime: number;
  totalTokens: number;
}

interface AgentTesterProps {
  agentId: string;
  agentName: string;
  className?: string;
}

export const AgentTester: React.FC<AgentTesterProps> = ({
  agentId,
  agentName,
  className = ''
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<TestSession | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startNewSession();
  }, [agentId]);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startNewSession = () => {
    const newSession: TestSession = {
      id: crypto.randomUUID(),
      agentId,
      agentName,
      startedAt: new Date().toISOString(),
      messages: [],
      totalMessages: 0,
      avgResponseTime: 0,
      totalTokens: 0
    };

    setSession(newSession);
    setMessages([]);
    
    // Add welcome message
    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `Testing session started for agent: ${agentName}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !session) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // Simulate agent response
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const responseTime = Date.now() - startTime;
      const mockResponse = generateMockResponse(userMessage.content);
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: mockResponse.content,
        timestamp: new Date().toISOString(),
        metadata: {
          responseTime,
          tokens: mockResponse.tokens,
          model: 'gpt-4',
          confidence: mockResponse.confidence
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update session stats
      setSession(prev => {
        if (!prev) return prev;
        
        const totalMessages = prev.totalMessages + 2;
        const totalResponseTime = (prev.avgResponseTime * (totalMessages - 2)) + responseTime;
        const avgResponseTime = totalResponseTime / (totalMessages / 2);
        
        return {
          ...prev,
          totalMessages,
          avgResponseTime,
          totalTokens: prev.totalTokens + mockResponse.tokens
        };
      });

    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${error.message || 'Failed to get response from agent'}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const generateMockResponse = (input: string) => {
    const responses = [
      "I understand your question. Let me help you with that.",
      "That's an interesting point. Here's what I think about it.",
      "Based on the information provided, I can suggest the following approach.",
      "I'd be happy to assist you with this. Let me break it down for you.",
      "Thank you for your question. Here's a detailed response to help you."
    ];

    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    const elaboration = ` ${input.toLowerCase().includes('help') ? 'I can provide step-by-step guidance.' : 
                         input.toLowerCase().includes('how') ? 'Let me explain the process in detail.' :
                         input.toLowerCase().includes('what') ? 'Here are the key points you should know.' :
                         'I hope this information is helpful to you.'}`;

    return {
      content: baseResponse + elaboration,
      tokens: Math.floor(50 + Math.random() * 100),
      confidence: 0.8 + Math.random() * 0.2
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportSession = () => {
    if (!session) return;

    const exportData = {
      ...session,
      messages: messages.filter(m => m.role !== 'system'),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-test-session-${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSession = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        setSession(importedData);
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Imported session from ${new Date(importedData.startedAt).toLocaleString()}`,
            timestamp: new Date().toISOString()
          },
          ...importedData.messages
        ]);
      } catch (error) {
        console.error('Failed to import session:', error);
      }
    };
    reader.readAsText(file);
  };

  const formatTime = (ms: number) => {
    return `${Math.round(ms)}ms`;
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMessageBgColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-100 border-blue-200';
      case 'assistant':
        return 'bg-green-100 border-green-200';
      case 'system':
        return 'bg-gray-100 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Agent Tester</h3>
            <p className="text-sm text-gray-600">Testing: {agentName}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportSession}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={startNewSession}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importSession}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`p-2 rounded-full ${getMessageBgColor(message.role)}`}>
                  {getMessageIcon(message.role)}
                </div>
                
                <div className={`flex-1 max-w-xs md:max-w-md lg:max-w-lg ${
                  message.role === 'user' ? 'text-right' : ''
                }`}>
                  <div className={`p-3 rounded-lg border ${getMessageBgColor(message.role)}`}>
                    <p className="text-sm">{message.content}</p>
                    
                    {message.metadata && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                        {message.metadata.responseTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(message.metadata.responseTime)}</span>
                          </div>
                        )}
                        {message.metadata.confidence && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>{Math.round(message.metadata.confidence * 100)}% confidence</span>
                          </div>
                        )}
                        {message.metadata.tokens && (
                          <div>Tokens: {message.metadata.tokens}</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-full bg-green-100 border-green-200">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 max-w-xs md:max-w-md lg:max-w-lg">
                  <div className="p-3 rounded-lg border bg-green-100 border-green-200">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <span className="text-sm text-gray-600">Agent is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Press Enter to send</span>
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto-scroll</span>
                </label>
              </div>
              
              {session && (
                <div className="flex items-center space-x-4">
                  <span>Messages: {session.totalMessages}</span>
                  {session.avgResponseTime > 0 && (
                    <span>Avg Response: {formatTime(session.avgResponseTime)}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session Stats Sidebar */}
        <div className="w-80 border-l bg-gray-50">
          <div className="p-4">
            <h4 className="font-medium mb-4">Session Statistics</h4>
            
            {session && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Messages</div>
                        <div className="font-medium">{session.totalMessages}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Duration</div>
                        <div className="font-medium">
                          {Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000 / 60)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Response</div>
                        <div className="font-medium">
                          {session.avgResponseTime > 0 ? formatTime(session.avgResponseTime) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Total Tokens</div>
                        <div className="font-medium">{session.totalTokens}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Test Scenarios
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Agent Settings
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Chat
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {[
                      "Hello, how can you help me?",
                      "What are your capabilities?",
                      "Can you explain complex topics?",
                      "How do you handle errors?",
                      "What's your knowledge cutoff?"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(suggestion)}
                        className="w-full text-left p-2 text-xs bg-white border rounded hover:bg-gray-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTester;