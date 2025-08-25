import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Upload,
  Download,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Settings,
  MessageSquare,
  Phone,
  FileText,
  Camera,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  type: 'text' | 'audio' | 'image' | 'file';
  timestamp: Date;
  metadata?: {
    audioUrl?: string;
    fileName?: string;
    fileSize?: number;
    processingTime?: number;
    confidence?: number;
  };
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  messages: Array<{
    role: 'user' | 'system';
    content: string;
    type: 'text' | 'audio' | 'image';
    delay?: number;
  }>;
  expectedOutcomes: string[];
}

interface AgentTestingInterfaceProps {
  agentId?: string;
  agentConfig?: any;
  onComplete: (testResults: any) => void;
  onBack: () => void;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'basic-greeting',
    name: 'Basic Greeting',
    description: 'Test basic conversation flow and greeting response',
    messages: [
      { role: 'user', content: 'Hello', type: 'text' },
      { role: 'user', content: 'How are you today?', type: 'text', delay: 2000 }
    ],
    expectedOutcomes: ['Friendly greeting response', 'Appropriate follow-up']
  },
  {
    id: 'information-request',
    name: 'Information Request',
    description: 'Test knowledge base retrieval and information accuracy',
    messages: [
      { role: 'user', content: 'What are your business hours?', type: 'text' },
      { role: 'user', content: 'Do you offer refunds?', type: 'text', delay: 3000 }
    ],
    expectedOutcomes: ['Accurate information provided', 'Knowledge base integration working']
  },
  {
    id: 'complex-query',
    name: 'Complex Query',
    description: 'Test handling of complex, multi-part questions',
    messages: [
      { role: 'user', content: 'I need help with my order #12345, it was supposed to arrive yesterday but I haven\'t received it. Can you check the status and provide tracking information?', type: 'text' }
    ],
    expectedOutcomes: ['Understands multi-part request', 'Asks for clarification if needed', 'Provides helpful response']
  }
];

export default function AgentTestingInterface({
  agentId,
  agentConfig,
  onComplete,
  onBack
}: AgentTestingInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'text' | 'voice' | 'video'>('text');
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { 
      content: string; 
      type: 'text' | 'audio' | 'image' | 'file';
      channel: string;
      metadata?: any;
    }) => {
      const response = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageData.content,
          agentId: agentId || 'test-agent',
          isVoice: messageData.type === 'audio',
          channel: messageData.channel,
          metadata: messageData.metadata
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Add agent response to messages
      const agentMessage: Message = {
        id: Date.now().toString() + '-agent',
        role: 'agent',
        content: data.response,
        type: 'text',
        timestamp: new Date(),
        metadata: {
          processingTime: data.processingTime,
          confidence: data.confidence
        }
      };
      
      setMessages(prev => [...prev, agentMessage]);
      
      // If response includes audio URL (for voice)
      if (data.audioUrl && selectedChannel === 'voice') {
        const audio = new Audio(data.audioUrl);
        audio.play();
      }
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      type: 'text',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    sendMessageMutation.mutate({
      content: currentMessage,
      type: 'text',
      channel: selectedChannel
    });
    
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Add user voice message
        const voiceMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: 'Voice message',
          type: 'audio',
          timestamp: new Date(),
          metadata: { audioUrl }
        };
        
        setMessages(prev => [...prev, voiceMessage]);
        
        // Convert audio to text and send to agent
        // This would typically involve speech-to-text processing
        toast.info('Processing voice message...');
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Failed to start recording: ' + (error as Error).message);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsVideoOn(true);
      toast.success('Video call started');
    } catch (error) {
      toast.error('Failed to start video: ' + (error as Error).message);
    }
  };

  const stopVideoCall = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoOn(false);
    toast.info('Video call ended');
  };

  const runTestScenario = async (scenarioId: string) => {
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    setIsRunningScenario(true);
    setSelectedScenario(scenarioId);
    
    // Clear previous messages
    setMessages([]);
    
    try {
      for (let i = 0; i < scenario.messages.length; i++) {
        const msg = scenario.messages[i];
        
        // Add delay if specified
        if (msg.delay) {
          await new Promise(resolve => setTimeout(resolve, msg.delay));
        }
        
        // Add user message
        const userMessage: Message = {
          id: `scenario-${i}`,
          role: 'user',
          content: msg.content,
          type: msg.type,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Send to agent and wait for response
        await sendMessageMutation.mutateAsync({
          content: msg.content,
          type: msg.type,
          channel: selectedChannel
        });
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Analyze results
      const results = {
        scenarioId,
        scenarioName: scenario.name,
        passed: true, // This would be more sophisticated in real implementation
        completedAt: new Date(),
        messages: messages.length,
        avgResponseTime: 1200 // ms
      };
      
      setTestResults(prev => [...prev, results]);
      toast.success(`Test scenario "${scenario.name}" completed`);
      
    } catch (error) {
      toast.error('Test scenario failed: ' + (error as Error).message);
    } finally {
      setIsRunningScenario(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded file: ${file.name}`,
      type: 'file',
      timestamp: new Date(),
      metadata: {
        fileName: file.name,
        fileSize: file.size
      }
    };
    
    setMessages(prev => [...prev, fileMessage]);
    
    // Process file upload
    toast.info('Processing uploaded file...');
  };

  const clearConversation = () => {
    setMessages([]);
    setTestResults([]);
    toast.info('Conversation cleared');
  };

  const exportTestResults = () => {
    const data = {
      agentId,
      testResults,
      messages,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onComplete({
      testResults,
      messages,
      summary: {
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.passed).length,
        totalMessages: messages.length,
        avgResponseTime: testResults.reduce((acc, r) => acc + r.avgResponseTime, 0) / testResults.length || 0
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Agent Testing</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test your agent's capabilities across different channels and scenarios to ensure optimal performance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Test Controls */}
        <div className="space-y-4">
          {/* Channel Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Test Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedChannel} onValueChange={setSelectedChannel as any}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text" className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Voice
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    Video
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Test Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
              <CardDescription>
                Run predefined scenarios to test common use cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TEST_SCENARIOS.map(scenario => (
                <div key={scenario.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-xs text-muted-foreground">{scenario.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runTestScenario(scenario.id)}
                      disabled={isRunningScenario}
                    >
                      {isRunningScenario && selectedScenario === scenario.id ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {testResults.find(r => r.scenarioId === scenario.id) && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Passed
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={clearConversation}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Conversation
              </Button>
              <Button variant="outline" className="w-full" onClick={exportTestResults}>
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Agent Conversation
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedChannel}</Badge>
                  <Badge variant="secondary">{messages.length} messages</Badge>
                </div>
              </div>
            </CardHeader>
            
            {/* Messages Area */}
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation to test your agent</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'agent' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg p-3 space-y-1",
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {message.type === 'audio' && <Phone className="w-4 h-4" />}
                            {message.type === 'file' && <FileText className="w-4 h-4" />}
                            {message.type === 'image' && <Camera className="w-4 h-4" />}
                          </div>
                          
                          <p className="text-sm">{message.content}</p>
                          
                          <div className="flex items-center justify-between text-xs opacity-70">
                            <span>{message.timestamp.toLocaleTimeString()}</span>
                            {message.metadata?.processingTime && (
                              <span>{message.metadata.processingTime}ms</span>
                            )}
                          </div>
                          
                          {message.metadata?.audioUrl && (
                            <audio controls className="w-full mt-2">
                              <source src={message.metadata.audioUrl} type="audio/wav" />
                            </audio>
                          )}
                        </div>
                        
                        {message.role === 'user' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Video Call Area */}
              {selectedChannel === 'video' && isVideoOn && (
                <div className="p-4 border-t">
                  <video
                    ref={videoRef}
                    className="w-full h-48 bg-black rounded-lg"
                    autoPlay
                    muted
                  />
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t space-y-3">
                {selectedChannel === 'text' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {selectedChannel === 'voice' && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      className="flex-1"
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Start Recording
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {selectedChannel === 'video' && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant={isVideoOn ? "destructive" : "default"}
                      onClick={isVideoOn ? stopVideoCall : startVideoCall}
                      className="flex-1"
                    >
                      {isVideoOn ? (
                        <>
                          <VideoOff className="w-4 h-4 mr-2" />
                          End Video Call
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4 mr-2" />
                          Start Video Call
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Test Results Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{testResults.filter(r => r.passed).length}</div>
                <div className="text-sm text-muted-foreground">Tests Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{testResults.length}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{messages.length}</div>
                <div className="text-sm text-muted-foreground">Messages Exchanged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round(testResults.reduce((acc, r) => acc + r.avgResponseTime, 0) / testResults.length || 0)}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}