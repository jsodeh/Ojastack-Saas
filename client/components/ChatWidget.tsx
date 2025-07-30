import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Minimize2,
  Maximize2,
  X,
  Bot,
  User,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { streamingChatService } from "@/lib/streaming-chat";

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface ChatWidgetProps {
  agentId: string;
  agentName?: string;
  agentType?: 'chat' | 'voice' | 'multimodal';
  customerId?: string;
  customerName?: string;
  position?: 'bottom-right' | 'bottom-left' | 'center';
  theme?: 'light' | 'dark';
  primaryColor?: string;
  embedded?: boolean;
  onClose?: () => void;
}

export default function ChatWidget({
  agentId,
  agentName = 'AI Assistant',
  agentType = 'chat',
  customerId = `user_${Date.now()}`,
  customerName,
  position = 'bottom-right',
  theme = 'light',
  primaryColor = '#3b82f6',
  embedded = false,
  onClose,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen, agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      
      // Create conversation
      const response = await fetch('/.netlify/functions/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          customer_id: customerId,
          channel: 'web',
          customer_name: customerName,
          metadata: {
            widget_session: true,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation.id);
        setIsConnected(true);
        
        // Add welcome message
        addMessage('agent', `Hello! I'm ${agentName}. How can I help you today?`);
      } else {
        throw new Error('Failed to initialize conversation');
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      addMessage('system', 'Sorry, I encountered an error connecting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role: 'user' | 'agent' | 'system', content: string, streaming = false) => {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      streaming,
    };

    setMessages(prev => [...prev, message]);
    return message.id;
  };

  const updateMessage = (messageId: string, content: string, streaming = false) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content, streaming }
        : msg
    ));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setTypingIndicator(true);

    // Add user message
    addMessage('user', userMessage);

    try {
      // Create streaming interface
      const streamingInterface = streamingChatService.createStreamingInterface(conversationId);
      
      // Add empty agent message for streaming
      const agentMessageId = addMessage('agent', '', true);

      // Set up streaming callbacks
      streamingInterface.onMessage((chunk: string, isComplete: boolean) => {
        updateMessage(agentMessageId, chunk, !isComplete);
        
        if (isComplete) {
          setTypingIndicator(false);
          setIsLoading(false);
          
          // Speak the response if voice is enabled
          if (voiceEnabled && agentType !== 'chat') {
            speakText(chunk);
          }
        }
      });

      streamingInterface.onError((error: Error) => {
        console.error('Streaming error:', error);
        updateMessage(agentMessageId, 'Sorry, I encountered an error. Please try again.');
        setTypingIndicator(false);
        setIsLoading(false);
      });

      // Send the message
      await streamingInterface.sendMessage(userMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('agent', 'Sorry, I encountered an error processing your message. Please try again.');
      setTypingIndicator(false);
      setIsLoading(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const { voiceService } = await import('@/lib/voice-service');
      setIsRecording(true);
      setRecordingDuration(0);
      
      await voiceService.startRecording();
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      const { voiceService } = await import('@/lib/voice-service');
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      const audioBlob = await voiceService.stopRecording();
      const transcription = await voiceService.speechToText(audioBlob);
      
      // Add user message
      addMessage('user', transcription.text);
      
      // Process with agent (similar to text message)
      await processVoiceMessage(transcription.text);
    } catch (error) {
      console.error('Error stopping voice recording:', error);
    } finally {
      setRecordingDuration(0);
    }
  };

  const processVoiceMessage = async (transcribedText: string) => {
    if (!conversationId) return;

    setIsLoading(true);
    setTypingIndicator(true);

    try {
      const streamingInterface = streamingChatService.createStreamingInterface(conversationId);
      const agentMessageId = addMessage('agent', '', true);

      streamingInterface.onMessage((chunk: string, isComplete: boolean) => {
        updateMessage(agentMessageId, chunk, !isComplete);
        
        if (isComplete) {
          setTypingIndicator(false);
          setIsLoading(false);
          
          // Speak the response if voice is enabled
          if (voiceEnabled && agentType !== 'chat') {
            speakText(chunk);
          }
        }
      });

      streamingInterface.onError((error: Error) => {
        console.error('Streaming error:', error);
        updateMessage(agentMessageId, 'Sorry, I encountered an error. Please try again.');
        setTypingIndicator(false);
        setIsLoading(false);
      });

      await streamingInterface.sendMessage(transcribedText);
    } catch (error) {
      console.error('Error processing voice message:', error);
      addMessage('agent', 'Sorry, I encountered an error processing your voice message.');
      setTypingIndicator(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleWidget = () => {
    if (embedded) return;
    setIsOpen(!isOpen);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeWidget = () => {
    // Cleanup recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsOpen(false);
    onClose?.();
  };

  const getPositionClasses = () => {
    if (embedded) return '';
    
    switch (position) {
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      case 'center':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
      default:
        return 'fixed bottom-4 right-4 z-50';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Floating button when widget is closed
  if (!embedded && !isOpen) {
    return (
      <div className={getPositionClasses()}>
        <Button
          onClick={toggleWidget}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`${getPositionClasses()} ${embedded ? 'w-full h-full' : 'w-96 h-[500px]'}`}>
      <Card className={`h-full flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
        {/* Header */}
        <CardHeader className="pb-3" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <div>
                <CardTitle className="text-sm font-medium text-white">
                  {agentName}
                </CardTitle>
                <div className="flex items-center space-x-2 text-xs opacity-90">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span>{isConnected ? 'Online' : 'Offline'}</span>
                  {agentType !== 'chat' && (
                    <Badge variant="secondary" className="text-xs">
                      {agentType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {agentType !== 'chat' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="text-white hover:bg-white/20 p-1 h-auto"
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              )}
              
              {!embedded && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMinimize}
                    className="text-white hover:bg-white/20 p-1 h-auto"
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeWidget}
                    className="text-white hover:bg-white/20 p-1 h-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.role === 'system'
                            ? 'bg-muted text-muted-foreground text-center text-sm'
                            : 'bg-muted'
                        }`}
                        style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}
                      >
                        <div className="flex items-start space-x-2">
                          {message.role === 'agent' && (
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          {message.role === 'user' && (
                            <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                              {message.streaming && (
                                <span className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1" />
                              )}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {typingIndicator && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? `Recording... ${recordingDuration}s` : "Type your message..."}
                  disabled={isLoading || !isConnected || isRecording}
                  className="flex-1"
                />
                
                {/* Voice Recording Button */}
                {(agentType === 'voice' || agentType === 'multimodal') && (
                  <Button
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    disabled={isLoading || !isConnected}
                    size="sm"
                    variant={isRecording ? "destructive" : "outline"}
                    className={isRecording ? "animate-pulse" : ""}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim() || !isConnected || isRecording}
                  size="sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {!isConnected && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Connecting to agent...
                </p>
              )}
              
              {isRecording && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-red-600 font-medium">
                    🎤 Recording... {recordingDuration}s
                  </p>
                  <div className="w-full bg-red-100 rounded-full h-1 mt-1">
                    <div 
                      className="bg-red-500 h-1 rounded-full animate-pulse"
                      style={{ width: `${Math.min(100, (recordingDuration / 30) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}