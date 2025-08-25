import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube,
  MessageSquare,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Upload,
  Send,
  Play,
  Square,
  FileText,
  Image,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw
} from 'lucide-react';

import { useAgentCreation } from '../AgentCreationContext';
import { StepProps } from '../AgentCreationWizard';
import { useToast } from '@/hooks/use-toast';

interface TestMessage {
  id: string;
  type: 'text' | 'voice' | 'image' | 'document';
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  metadata?: {
    duration?: number;
    fileSize?: number;
    fileName?: string;
    audioUrl?: string;
  };
}

interface TestSession {
  id: string;
  name: string;
  messages: TestMessage[];
  status: 'idle' | 'active' | 'completed' | 'error';
  createdAt: Date;
  metrics: {
    totalMessages: number;
    averageResponseTime: number;
    successRate: number;
  };
}

const TEST_SCENARIOS = [
  {
    name: 'Basic Greeting',
    description: 'Test basic conversation flow',
    messages: ['Hello', 'How are you?', 'What can you help me with?']
  },
  {
    name: 'Product Inquiry',
    description: 'Test product knowledge',
    messages: ['Tell me about your products', 'What are the pricing options?', 'Do you offer free trials?']
  },
  {
    name: 'Technical Support',
    description: 'Test problem-solving capabilities',
    messages: ['I\'m having trouble logging in', 'The app is crashing', 'How do I reset my password?']
  },
  {
    name: 'Complex Inquiry',
    description: 'Test advanced reasoning',
    messages: ['I need to integrate your API with our system', 'What are the rate limits?', 'Do you provide webhooks?']
  }
];

export default function TestingStep({ onNext, onPrevious }: StepProps) {
  const { state } = useAgentCreation();
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoTesting, setIsVideoTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const createNewSession = (name: string = 'Test Session') => {
    const session: TestSession = {
      id: crypto.randomUUID(),
      name: `${name} ${new Date().toLocaleTimeString()}`,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      metrics: {
        totalMessages: 0,
        averageResponseTime: 0,
        successRate: 100
      }
    };
    setCurrentSession(session);
    setSessions(prev => [session, ...prev]);
  };

  const sendMessage = async (content: string, type: 'text' | 'voice' | 'image' | 'document' = 'text', metadata?: any) => {
    if (!currentSession || !content.trim()) return;

    const userMessage: TestMessage = {
      id: crypto.randomUUID(),
      type,
      content,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
      metadata
    };

    // Add user message
    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage]
    } : null);

    setLoading(true);
    const startTime = Date.now();

    try {
      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const responseTime = Date.now() - startTime;
      const agentMessage: TestMessage = {
        id: crypto.randomUUID(),
        type: 'text',
        content: generateMockResponse(content, type),
        sender: 'agent',
        timestamp: new Date(),
        status: 'delivered'
      };

      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages.map(m => m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m), agentMessage],
        metrics: {
          ...prev.metrics,
          totalMessages: prev.metrics.totalMessages + 1,
          averageResponseTime: (prev.metrics.averageResponseTime + responseTime) / 2
        }
      } : null);

      // Update session in sessions list
      setSessions(prev => prev.map(s => s.id === currentSession.id ? {
        ...s,
        messages: [...s.messages.map(m => m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m), agentMessage],
        metrics: {
          ...s.metrics,
          totalMessages: s.metrics.totalMessages + 1,
          averageResponseTime: (s.metrics.averageResponseTime + responseTime) / 2
        }
      } : s));
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get response from agent',
        variant: 'destructive'
      });
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: prev.messages.map(m => m.id === userMessage.id ? { ...m, status: 'error' as const } : m)
      } : null);
    } finally {
      setLoading(false);
      setMessage('');
    }
  };

  const generateMockResponse = (userMessage: string, type: string): string => {
    const responses = {
      greeting: ['Hello! How can I assist you today?', 'Hi there! What can I help you with?', 'Welcome! I\'m here to help.'],
      product: ['I\'d be happy to tell you about our products...', 'Our main offerings include...', 'Here\'s what we have available...'],
      support: ['I understand you\'re having an issue. Let me help...', 'I\'ll help you resolve this problem...', 'Let me guide you through the solution...'],
      default: ['I understand your question. Let me provide you with information...', 'That\'s a great question. Here\'s what I can tell you...', 'I\'m here to help with that...']
    };

    let category = 'default';
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) category = 'greeting';
    if (userMessage.toLowerCase().includes('product') || userMessage.toLowerCase().includes('pricing')) category = 'product';
    if (userMessage.toLowerCase().includes('problem') || userMessage.toLowerCase().includes('issue') || userMessage.toLowerCase().includes('help')) category = 'support';

    const categoryResponses = responses[category as keyof typeof responses] || responses.default;
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        sendMessage('Voice message', 'voice', { audioUrl, duration: 3000 });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access microphone',
        variant: 'destructive'
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startVideoTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoTesting(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access camera',
        variant: 'destructive'
      });
    }
  };

  const stopVideoTest = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsVideoTesting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        sendMessage(`Uploaded: ${file.name}`, 'document', {
          fileName: file.name,
          fileSize: file.size
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const runAutomatedTest = async (scenario: typeof TEST_SCENARIOS[0]) => {
    createNewSession(scenario.name);
    
    for (const msg of scenario.messages) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendMessage(msg);
    }
  };

  const calculateOverallScore = () => {
    if (sessions.length === 0) return 0;
    const totalScore = sessions.reduce((acc, session) => acc + session.metrics.successRate, 0);
    return Math.round(totalScore / sessions.length);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Test Your Agent</h2>
        <p className="text-muted-foreground">
          Test your agent's responses across different modalities and scenarios
        </p>
      </div>

      <Tabs defaultValue="interactive" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="interactive">Interactive Testing</TabsTrigger>
          <TabsTrigger value="automated">Automated Tests</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Sessions */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Test Sessions
                    <Button size="sm" onClick={() => createNewSession()}>
                      New Session
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No test sessions yet</p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          currentSession?.id === session.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{session.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.messages.length} messages
                            </p>
                          </div>
                          <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              {currentSession ? (
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{currentSession.name}</CardTitle>
                        <CardDescription>
                          Testing {state.agentName || 'Your Agent'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {state.capabilities.voice.enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                          >
                            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </Button>
                        )}
                        {state.capabilities.video.enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={isVideoTesting ? stopVideoTest : startVideoTest}
                          >
                            {isVideoTesting ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {currentSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {msg.type === 'voice' && <Volume2 className="h-4 w-4" />}
                            {msg.type === 'image' && <Image className="h-4 w-4" />}
                            {msg.type === 'document' && <FileText className="h-4 w-4" />}
                            <span className="text-sm">{msg.content}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs opacity-70">
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.status === 'sending' && <Clock className="h-3 w-3" />}
                            {msg.status === 'delivered' && <CheckCircle className="h-3 w-3" />}
                            {msg.status === 'error' && <XCircle className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span className="text-sm">Agent is typing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  {/* Input */}
                  <div className="border-t p-4">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your test message..."
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage(message)}
                        disabled={loading}
                      />
                      <Button
                        onClick={() => sendMessage(message)}
                        disabled={!message.trim() || loading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Start Testing</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a new test session to start testing your agent
                    </p>
                    <Button onClick={() => createNewSession()}>
                      Create New Session
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Video Testing */}
          {isVideoTesting && (
            <Card>
              <CardHeader>
                <CardTitle>Video Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Camera</Label>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-48 bg-black rounded-lg"
                    />
                  </div>
                  <div>
                    <Label>Agent Avatar (Simulated)</Label>
                    <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                      AI Agent Avatar
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.jpg,.png,.gif"
          />
        </TabsContent>

        <TabsContent value="automated" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Test Scenarios</CardTitle>
              <CardDescription>
                Run predefined test scenarios to evaluate your agent's performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEST_SCENARIOS.map((scenario, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      <CardDescription>{scenario.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Test Messages:</Label>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {scenario.messages.map((msg, i) => (
                            <li key={i}>• {msg}</li>
                          ))}
                        </ul>
                        <Button
                          className="w-full mt-3"
                          onClick={() => runAutomatedTest(scenario)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Run Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{calculateOverallScore()}%</div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {sessions.length > 0 
                      ? Math.round(sessions.reduce((acc, s) => acc + s.metrics.averageResponseTime, 0) / sessions.length)
                      : 0}ms
                  </div>
                  <p className="text-sm text-muted-foreground">Average</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{sessions.length}</div>
                  <p className="text-sm text-muted-foreground">Sessions Completed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Session History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.messages.length} messages • {session.createdAt.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={session.metrics.successRate > 80 ? 'default' : 'secondary'}>
                          {session.metrics.successRate}% Success
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {Math.round(session.metrics.averageResponseTime)}ms avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}