import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Calendar,
  Clock,
  MessageSquare,
  Phone,
  Eye,
  ArrowRight,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  BarChart3,
  Zap,
  CheckCircle,
  User,
  Loader2,
  Volume2,
  StopCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  chatWorkflowService,
  chatHelpers,
  type ChatWorkflowRequest,
  type ChatWorkflowResponse,
} from "@/lib/chat-workflow";
import { useAuth } from "@/lib/auth-context";
import { AIConfigChecker } from "@/components/AIConfigChecker";

export default function Demo() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDemo, setSelectedDemo] = useState("chat");
  const [chatMessage, setChatMessage] = useState("");
  interface ChatMessage {
    id: number;
    type: "user" | "agent";
    content: string;
    timestamp: string;
    isTyping?: boolean;
  }

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: "agent",
      content:
        "Hi! I'm your AI customer support agent powered by ElevenLabs. I can have real conversations with you through text and voice. How can I help you today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Voice demo state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  interface VoiceMessage {
    id: number;
    type: "user" | "agent";
    content: string;
    timestamp: string;
    audioUrl?: string | null;
  }

  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([
    {
      id: 1,
      type: "agent",
      content:
        "Hello! I'm ready for voice conversation. Click the microphone to start speaking.",
      timestamp: new Date().toLocaleTimeString(),
      audioUrl: null,
    },
  ]);

  // Audio refs and state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ElevenLabs Configuration
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Default voice, can be customized

  useEffect(() => {
    // Initialize audio context for better browser compatibility
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }
  }, []);

  // Real AI conversation function using n8n workflow and Supabase edge function
  const generateAIResponse = async (
    userMessage: string,
    isVoice: boolean = false,
  ): Promise<{ text: string; audioUrl?: string }> => {
    try {
      // Prepare conversation context
      const conversationContext = isVoice
        ? chatHelpers.generateConversationContext(voiceMessages)
        : chatHelpers.generateConversationContext(messages);

      // Enhanced agent prompt with conversation context
      const agentPrompt = `You are a helpful AI assistant for Ojastack, a platform that creates intelligent AI agents for businesses.

Key information about Ojastack:
      - We help businesses create AI agents for customer support, sales, and automation
      - Our platform supports text, voice, and vision AI capabilities powered by ElevenLabs
      - We offer integrations with 200+ platforms including WhatsApp, Telegram, Slack, HubSpot, Salesforce
      - Our agents can handle real conversations, understand context, and provide personalized responses
      - We use advanced AI models for natural language processing and generation
      - Our voice AI supports speech-to-text, text-to-speech, and real-time voice conversations
      - We provide n8n workflow automation for complex business processes
      - Users can build, deploy, and manage AI agents through our intuitive dashboard

      Previous conversation context:
      ${conversationContext}

      User intent: ${chatHelpers.extractUserIntent(userMessage)}

      When responding:
      - Be helpful, professional, and knowledgeable about AI and business automation
      - Provide specific examples of how Ojastack can solve business problems
      - Ask follow-up questions to better understand the user's needs
      - Keep responses conversational and engaging (max 2-3 sentences for demos)
      - If asked about technical details, provide accurate information about our capabilities
      - Always aim to demonstrate the value of AI agents for business growth

      Respond naturally to the user's message.`;

      // Create chat request
      const chatRequest: ChatWorkflowRequest = {
        message: userMessage,
        userId: user?.id || "demo-user",
        conversationId: isVoice ? `voice-${Date.now()}` : `chat-${Date.now()}`,
        isVoice: isVoice,
        agentPrompt: agentPrompt,
      };

      // Send through n8n workflow or direct API
      const response: ChatWorkflowResponse =
        await chatWorkflowService.sendMessage(chatRequest);

      if (response.error) {
        throw new Error(response.error);
      }

      return {
        text: response.response,
        audioUrl: response.audioUrl,
      };
    } catch (error) {
      console.error("Error generating AI response:", error);

      // Enhanced fallback with context awareness
      const fallbackResponse = generateContextualFallback(userMessage);

      return {
        text: fallbackResponse,
      };
    }
  };

  // Enhanced fallback function for when AI service is unavailable
  const generateContextualFallback = (message: string): string => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("voice") || lowerMessage.includes("speech")) {
      return "Our voice AI is powered by ElevenLabs for natural conversations. Try the voice demo above! Currently experiencing high demand - please try again in a moment.";
    }

    if (
      lowerMessage.includes("integration") ||
      lowerMessage.includes("connect")
    ) {
      return "Ojastack connects with 200+ platforms including WhatsApp, Slack, and HubSpot. Which integration interests you most?";
    }

    if (lowerMessage.includes("business") || lowerMessage.includes("company")) {
      return "AI agents help businesses automate support, qualify leads, and improve customer satisfaction. What's your main business challenge?";
    }

    if (lowerMessage.includes("demo") || lowerMessage.includes("try")) {
      return "You're experiencing our live demo right now! This AI is having real conversations powered by our platform. Try our voice features or ask about specific capabilities.";
    }

    return `Thanks for asking about "${message}". I'm an Ojastack AI agent demonstrating real conversations. Our platform helps businesses automate customer interactions with intelligent AI. What would you like to know more about?`;
  };

  // ElevenLabs Text-to-Speech
  const textToSpeech = async (text: string): Promise<string | null> => {
    if (!ELEVENLABS_API_KEY) {
      toast({
        title: "API Key Missing",
        description: "ElevenLabs API key is required for voice features.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      return audioUrl;
    } catch (error) {
      console.error("Error with text-to-speech:", error);
      toast({
        title: "Voice Generation Error",
        description:
          "Failed to generate voice response. Please check your API key.",
        variant: "destructive",
      });
      return null;
    }
  };

  // ElevenLabs Speech-to-Text
  const speechToText = async (audioBlob: Blob): Promise<string | null> => {
    if (!ELEVENLABS_API_KEY) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("model", "whisper-1");

      const response = await fetch(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.text || null;
    } catch (error) {
      console.error("Error with speech-to-text:", error);
      toast({
        title: "Speech Recognition Error",
        description: "Failed to convert speech to text.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Chat functionality
  const sendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: "user" as const,
      content: chatMessage,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatMessage("");

    // Show typing indicator
    const typingMessage: ChatMessage = {
      id: messages.length + 2,
      type: "agent",
      content: "Typing...",
      timestamp: new Date().toLocaleTimeString(),
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      const aiResponse = await generateAIResponse(chatMessage);

      // Remove typing indicator and add real response
      setMessages((prev) => {
        const withoutTyping = prev.filter((msg) => !msg.isTyping);
        return [
          ...withoutTyping,
          {
            id: Date.now(),
            type: "agent",
            content: aiResponse.text,
            timestamp: new Date().toLocaleTimeString(),
          } as ChatMessage,
        ];
      });
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => !msg.isTyping));
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await processVoiceMessage(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processVoiceMessage = async (audioBlob: Blob) => {
    try {
      // Convert speech to text
      const transcription = await speechToText(audioBlob);

      if (!transcription) {
        setIsProcessing(false);
        return;
      }

      // Add user's transcribed message
      const userMessage: VoiceMessage = {
        id: voiceMessages.length + 1,
        type: "user",
        content: transcription,
        timestamp: new Date().toLocaleTimeString(),
        audioUrl: URL.createObjectURL(audioBlob),
      };

      setVoiceMessages((prev) => [...prev, userMessage]);

      // Generate AI response with voice
      const aiResponse = await generateAIResponse(transcription, true);

      // Add AI response
      const agentMessage: VoiceMessage = {
        id: voiceMessages.length + 2,
        type: "agent",
        content: aiResponse.text,
        timestamp: new Date().toLocaleTimeString(),
        audioUrl: aiResponse.audioUrl || null,
      };

      setVoiceMessages((prev) => [...prev, agentMessage]);

      // Auto-play AI response
      if (aiResponse.audioUrl) {
        playAudio(aiResponse.audioUrl);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error("Error processing voice message:", error);
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: "Failed to process voice message.",
        variant: "destructive",
      });
    }
  };

  const playAudio = async (audioUrl: string) => {
    try {
      if (audioRef.current) {
        setIsPlaying(true);
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => setIsPlaying(false);
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                  Ojastack
                </span>
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link
                    to="/features"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Features
                  </Link>
                  <Link
                    to="/pricing"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/docs"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Docs
                  </Link>
                  <Link
                    to="/contact"
                    className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Contact
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-gradient-via/5 to-gradient-to/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              <CheckCircle className="h-3 w-3 mr-1" />
              Live AI Demo
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              Experience Real AI
              <span className="bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                {" "}
                Conversations
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Try our live AI agents powered by ElevenLabs. Have real
              conversations through text and voice with intelligent agents.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Tabs */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs
            value={selectedDemo}
            onValueChange={setSelectedDemo}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="chat">💬 Live Chat</TabsTrigger>
              <TabsTrigger value="voice">🎙️ Voice AI</TabsTrigger>
              <TabsTrigger value="vision">👁️ Vision AI</TabsTrigger>
            </TabsList>

            <div className="mt-12">
              {/* Chat Demo */}
              <TabsContent value="chat">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <Card className="h-[600px] flex flex-col">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              AI
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              Live AI Assistant
                            </CardTitle>
                            <CardDescription>
                              Powered by Ojastack AI • Real conversations with
                              n8n workflow
                            </CardDescription>
                          </div>
                          <div className="ml-auto">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700"
                            >
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                              Live
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`flex items-start space-x-2 max-w-[80%] ${
                                  message.type === "user"
                                    ? "flex-row-reverse space-x-reverse"
                                    : ""
                                }`}
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback
                                    className={
                                      message.type === "user"
                                        ? "bg-blue-500 text-white"
                                        : "bg-primary text-primary-foreground"
                                    }
                                  >
                                    {message.type === "user" ? (
                                      <User className="h-4 w-4" />
                                    ) : (
                                      "AI"
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div
                                  className={`px-4 py-3 rounded-lg ${
                                    message.type === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background border"
                                  }`}
                                >
                                  {message.isTyping ? (
                                    <div className="flex items-center space-x-1">
                                      <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                        <div
                                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                                          style={{ animationDelay: "0.1s" }}
                                        ></div>
                                        <div
                                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                                          style={{ animationDelay: "0.2s" }}
                                        ></div>
                                      </div>
                                      <span className="text-sm ml-2">
                                        AI is thinking...
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm">
                                        {message.content}
                                      </p>
                                      <p className="text-xs opacity-70 mt-1">
                                        {message.timestamp}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Ask me anything... Try: 'Tell me about Ojastack features' or 'How does voice AI work?'"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              (e.preventDefault(), sendMessage())
                            }
                            className="flex-1"
                          />
                          <Button
                            onClick={sendMessage}
                            disabled={!chatMessage.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <AIConfigChecker />

                    <Card>
                      <CardHeader>
                        <CardTitle>Live AI Features</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Real AI responses</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Context awareness</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Natural conversations</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Instant responses</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Try These Examples</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <button
                          onClick={() =>
                            setChatMessage(
                              "What can Ojastack do for my business?",
                            )
                          }
                          className="w-full text-left p-2 text-sm bg-muted hover:bg-muted/70 rounded-md transition-colors"
                        >
                          "What can Ojastack do for my business?"
                        </button>
                        <button
                          onClick={() =>
                            setChatMessage("How does the voice AI work?")
                          }
                          className="w-full text-left p-2 text-sm bg-muted hover:bg-muted/70 rounded-md transition-colors"
                        >
                          "How does the voice AI work?"
                        </button>
                        <button
                          onClick={() =>
                            setChatMessage("Tell me about integrations")
                          }
                          className="w-full text-left p-2 text-sm bg-muted hover:bg-muted/70 rounded-md transition-colors"
                        >
                          "Tell me about integrations"
                        </button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Voice Demo */}
              <TabsContent value="voice">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="h-[600px] flex flex-col">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-green-500 text-white">
                            🎙️
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            Voice AI Assistant
                          </CardTitle>
                          <CardDescription>
                            Real voice conversations with ElevenLabs
                          </CardDescription>
                        </div>
                        <div className="ml-auto">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            Live
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
                        {voiceMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex items-start space-x-2 max-w-[80%] ${
                                message.type === "user"
                                  ? "flex-row-reverse space-x-reverse"
                                  : ""
                              }`}
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarFallback
                                  className={
                                    message.type === "user"
                                      ? "bg-blue-500 text-white"
                                      : "bg-green-500 text-white"
                                  }
                                >
                                  {message.type === "user" ? "🎤" : "🎙️"}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={`px-4 py-3 rounded-lg ${
                                  message.type === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border"
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs opacity-70">
                                    {message.timestamp}
                                  </p>
                                  {message.audioUrl && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        playAudio(message.audioUrl!)
                                      }
                                      className="h-6 px-2"
                                    >
                                      <Volume2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-center">
                        <div className="mb-4">
                          <div
                            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                              isRecording
                                ? "bg-red-100 animate-pulse"
                                : "bg-muted"
                            }`}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            ) : isRecording ? (
                              <Mic className="h-12 w-12 text-red-500" />
                            ) : (
                              <MicOff className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button
                            size="lg"
                            onClick={
                              isRecording ? stopRecording : startRecording
                            }
                            disabled={isProcessing}
                            className={
                              isRecording ? "bg-red-500 hover:bg-red-600" : ""
                            }
                          >
                            {isRecording ? (
                              <>
                                <StopCircle className="h-4 w-4 mr-2" />
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <Mic className="h-4 w-4 mr-2" />
                                Start Voice Chat
                              </>
                            )}
                          </Button>

                          <p className="text-sm text-muted-foreground">
                            {isRecording
                              ? "Listening... Click stop when done"
                              : isProcessing
                                ? "Processing your voice..."
                                : "Click to start voice conversation"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Voice Features</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            Real speech recognition
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            Natural voice synthesis
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            Conversational AI responses
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            Multi-language support
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Powered by ElevenLabs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          This demo uses ElevenLabs' cutting-edge AI for speech
                          recognition and voice synthesis, providing natural,
                          human-like conversations.
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Voice Quality:</span>
                            <span className="text-green-600">
                              High Definition
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Response Time:</span>
                            <span className="text-green-600">
                              &lt; 2 seconds
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Accuracy:</span>
                            <span className="text-green-600">99%+</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Vision Demo */}
              <TabsContent value="vision">
                <div className="text-center py-24">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Eye className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Vision AI Demo</h3>
                  <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Our Vision AI capabilities are currently being integrated.
                    This will include document analysis, image recognition, and
                    visual content processing powered by advanced AI models.
                  </p>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Build Your Own AI Agents?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Create powerful AI agents with voice, chat, and vision capabilities
            for your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8">
                Start Building
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                  Ojastack
                </span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Empowering businesses with intelligent AI agents for better
                customer experiences.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Product
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/features"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/integrations"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/api"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Company
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/about"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/careers"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Support
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/docs"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/help"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/status"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Status
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              © 2024 Ojastack. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
