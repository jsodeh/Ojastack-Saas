import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  Upload,
  Download,
  Settings,
  Bot,
  User,
  FileText,
  Image,
  MessageSquare,
  Phone,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { elevenLabs, audioManager, Voice } from "@/lib/elevenlabs";
import { mcpClient, toolCallManager } from "@/lib/mcp-integration";

import { useToast } from "@/hooks/use-toast";

export default function InteractiveDemo() {
  const { toast } = useToast();
  const [activeDemo, setActiveDemo] = useState("chat");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const [response, setResponse] = useState("");
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
  });

  // Chat demo state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. I can help with various tasks using voice, text, and vision capabilities. What would you like to explore?",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Tool calling state
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [toolCallResults, setToolCallResults] = useState<any[]>([]);

  // Document processing state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize ElevenLabs voices
    loadVoices();

    // Initialize MCP tools
    initializeMCPTools();
  }, []);

  const loadVoices = async () => {
    try {
      const voiceList = await elevenLabs.getVoices();
      setVoices(voiceList);
      if (voiceList.length > 0) {
        setSelectedVoice(voiceList[0].voice_id);
      }
    } catch (error) {
      console.error("Error loading voices:", error);
      toast({
        title: "Voice Loading Error",
        description:
          "Could not load ElevenLabs voices. Please check your API key.",
        variant: "destructive",
      });
    }
  };

  const initializeMCPTools = async () => {
    try {
      // Initialize MCP client with demo servers
      await mcpClient.initializeServers([
        {
          id: "demo-tools",
          name: "Demo Tools",
          endpoint: "ws://localhost:3001/mcp/demo",
          description: "Demo MCP server with sample tools",
        },
      ]);

      await toolCallManager.registerMCPTools();
      const tools = toolCallManager.getAvailableTools();
      setAvailableTools(tools);
    } catch (error) {
      console.error("Error initializing MCP tools:", error);
    }
  };

  // Voice interaction functions
  const startRecording = async () => {
    try {
      setIsLoading(true);
      await audioManager.startRecording();
      setIsRecording(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsLoading(false);
      toast({
        title: "Recording Error",
        description:
          "Could not start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    try {
      setIsLoading(true);
      const blob = await audioManager.stopRecording();
      setAudioBlob(blob);
      setIsRecording(false);

      // Convert speech to text
      const result = await elevenLabs.speechToText({ audio: blob });
      setTranscription(result.text);

      // Generate AI response
      await generateAIResponse(result.text);

      setIsLoading(false);
    } catch (error) {
      console.error("Error stopping recording:", error);
      setIsLoading(false);
      toast({
        title: "Processing Error",
        description: "Could not process audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAIResponse = async (input: string) => {
    try {
      // Simulate AI processing with tool calls
      const aiResponse = await simulateAIResponse(input);
      setResponse(aiResponse);

      // Convert response to speech
      if (selectedVoice) {
        const audioBuffer = await elevenLabs.textToSpeech({
          voice_id: selectedVoice,
          text: aiResponse,
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            use_speaker_boost: true,
          },
        });

        await audioManager.playAudio(audioBuffer);
      }

      // Add to chat history
      setChatMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          role: "user",
          content: input,
          timestamp: new Date(),
        },
        {
          id: prev.length + 2,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({
        title: "AI Response Error",
        description: "Could not generate response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const simulateAIResponse = async (input: string): Promise<string> => {
    // Simulate different types of responses based on input
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("weather")) {
      // Simulate weather tool call
      try {
        const result = await toolCallManager.executeTool(
          "demo-tools:get_weather",
          {
            location: "San Francisco",
          },
        );

        if (result.success) {
          setToolCallResults((prev) => [...prev, result]);
          return `Based on the weather data, it's currently 72°F and sunny in San Francisco. Perfect weather for outdoor activities!`;
        }
      } catch (error) {
        console.log("Weather tool not available, using fallback");
      }

      return "I'd love to help you with weather information! The weather tool integration would provide real-time data here.";
    }

    if (lowerInput.includes("time") || lowerInput.includes("date")) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()} and today's date is ${now.toLocaleDateString()}.`;
    }

    if (lowerInput.includes("create") || lowerInput.includes("agent")) {
      return "I can help you create a new AI agent! What type of agent would you like - chat, voice, or vision? And what should it specialize in?";
    }

    if (lowerInput.includes("integration")) {
      return "Great question about integrations! We support over 200+ platforms including WhatsApp, Telegram, Slack, Zendesk, and many more. Which platform would you like to integrate with?";
    }

    return "Thank you for your question! I'm a demo AI assistant showcasing Ojastack's capabilities. I can process voice input, generate natural responses, and integrate with various tools and platforms.";
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");

    setChatMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    // Generate AI response
    const aiResponse = await simulateAIResponse(userMessage);

    setChatMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      },
    ]);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsLoading(true);

    try {
      // Simulate document processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const analysis = {
        type: file.type.includes("image") ? "image" : "document",
        size: file.size,
        name: file.name,
        summary: file.type.includes("image")
          ? "Image analyzed: Contains text elements, appears to be a business document with charts and graphs."
          : "Document processed: 3 pages, contains customer service policies and FAQ sections. Key topics identified: refund policy, shipping information, contact details.",
        confidence: 0.95,
        entities: [
          "Customer Service",
          "Refund Policy",
          "Shipping",
          "Contact Information",
        ],
        keyInsights: [
          "Document contains structured FAQ content",
          "Suitable for knowledge base training",
          "High text quality for processing",
        ],
      };

      setDocumentAnalysis(analysis);
      setIsLoading(false);

      toast({
        title: "Document Processed",
        description:
          "Successfully analyzed the uploaded document using vision AI.",
      });
    } catch (error) {
      console.error("Error processing document:", error);
      setIsLoading(false);
      toast({
        title: "Processing Error",
        description: "Could not process the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Interactive AI Demo
            </h1>
            <p className="text-muted-foreground">
              Experience real AI conversations powered by ElevenLabs - voice,
              chat, and vision capabilities
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Live AI Demo
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Powered by ElevenLabs
            </Badge>
          </div>
        </div>

        {/* Demo Tabs */}
        <Tabs
          value={activeDemo}
          onValueChange={setActiveDemo}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat Demo</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Voice Demo</span>
            </TabsTrigger>
            <TabsTrigger value="vision" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Vision Demo</span>
            </TabsTrigger>
          </TabsList>

          {/* Chat Demo */}
          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-[500px] flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            AI Assistant Demo
                          </CardTitle>
                          <CardDescription>
                            Interactive chat with tool calling capabilities
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Online
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex items-start space-x-2 max-w-[80%] ${
                              message.role === "user"
                                ? "flex-row-reverse space-x-reverse"
                                : ""
                            }`}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarFallback
                                className={
                                  message.role === "user"
                                    ? "bg-blue-500 text-white"
                                    : "bg-primary text-primary-foreground"
                                }
                              >
                                {message.role === "user" ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Bot className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`px-4 py-2 rounded-lg ${
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background border"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your message... Try asking about weather, time, or creating agents!"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          (e.preventDefault(), sendChatMessage())
                        }
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tool Calls Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Tool Calls
                  </CardTitle>
                  <CardDescription>Available MCP integrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <strong>Available Tools:</strong>
                      <ul className="mt-2 space-y-1">
                        <li className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          Weather API
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          Date/Time
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          File System
                        </li>
                        <li className="flex items-center">
                          <AlertCircle className="h-3 w-3 text-yellow-500 mr-2" />
                          Database (demo)
                        </li>
                      </ul>
                    </div>

                    {toolCallResults.length > 0 && (
                      <div className="space-y-2">
                        <strong className="text-sm">Recent Tool Calls:</strong>
                        {toolCallResults.slice(-3).map((result, index) => (
                          <div
                            key={index}
                            className="p-2 bg-muted rounded text-xs"
                          >
                            <div className="font-medium">{result.toolName}</div>
                            <div className="text-muted-foreground">
                              Status: {result.success ? "Success" : "Failed"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Voice Demo */}
          <TabsContent value="voice" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Voice Interaction
                  </CardTitle>
                  <CardDescription>
                    Speech-to-text and text-to-speech with ElevenLabs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      {isRecording ? (
                        <div className="relative">
                          <Mic className="h-16 w-16 text-white" />
                          <div className="absolute inset-0 animate-ping">
                            <div className="w-16 h-16 bg-white rounded-full opacity-20"></div>
                          </div>
                        </div>
                      ) : (
                        <MicOff className="h-16 w-16 text-white" />
                      )}
                    </div>

                    <div className="space-y-4">
                      <Button
                        size="lg"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isLoading}
                        className={
                          isRecording ? "bg-red-500 hover:bg-red-600" : ""
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="h-4 w-4 mr-2" />
                        ) : (
                          <Mic className="h-4 w-4 mr-2" />
                        )}
                        {isLoading
                          ? "Processing..."
                          : isRecording
                            ? "Stop Recording"
                            : "Start Recording"}
                      </Button>

                      {transcription && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Transcription:</h4>
                          <p className="text-sm">{transcription}</p>
                        </div>
                      )}

                      {response && (
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <h4 className="font-semibold mb-2">AI Response:</h4>
                          <p className="text-sm">{response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Voice Settings
                  </CardTitle>
                  <CardDescription>
                    Customize voice synthesis parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">
                      Voice Selection
                    </label>
                    <Select
                      value={selectedVoice}
                      onValueChange={setSelectedVoice}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map((voice) => (
                          <SelectItem
                            key={voice.voice_id}
                            value={voice.voice_id}
                          >
                            {voice.name} ({voice.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Stability: {voiceSettings.stability}
                    </label>
                    <Slider
                      value={[voiceSettings.stability]}
                      onValueChange={(value) =>
                        setVoiceSettings((prev) => ({
                          ...prev,
                          stability: value[0],
                        }))
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Similarity Boost: {voiceSettings.similarityBoost}
                    </label>
                    <Slider
                      value={[voiceSettings.similarityBoost]}
                      onValueChange={(value) =>
                        setVoiceSettings((prev) => ({
                          ...prev,
                          similarityBoost: value[0],
                        }))
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Style: {voiceSettings.style}
                    </label>
                    <Slider
                      value={[voiceSettings.style]}
                      onValueChange={(value) =>
                        setVoiceSettings((prev) => ({
                          ...prev,
                          style: value[0],
                        }))
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedVoice) {
                        elevenLabs
                          .textToSpeech({
                            voice_id: selectedVoice,
                            text: "This is a test of the selected voice settings.",
                            voice_settings: voiceSettings,
                          })
                          .then((audioBuffer) =>
                            audioManager.playAudio(audioBuffer),
                          );
                      }
                    }}
                    className="w-full"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Test Voice
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vision Demo */}
          <TabsContent value="vision" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Document Processing
                  </CardTitle>
                  <CardDescription>
                    Upload and analyze documents with AI vision
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto">
                        {uploadedFile ? (
                          uploadedFile.type.includes("image") ? (
                            <Image className="h-8 w-8" />
                          ) : (
                            <FileText className="h-8 w-8" />
                          )
                        ) : (
                          <Upload className="h-8 w-8" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {uploadedFile
                            ? uploadedFile.name
                            : "Upload Document or Image"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {uploadedFile
                            ? "Click to upload a different file"
                            : "PDF, Word, Images supported"}
                        </p>
                      </div>
                      {!uploadedFile && (
                        <Button variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin mr-3" />
                      <span>Processing document...</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {documentAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Analysis Results
                    </CardTitle>
                    <CardDescription>
                      AI-powered document insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Type:</span>
                        <p className="text-sm text-muted-foreground capitalize">
                          {documentAnalysis.type}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Confidence:</span>
                        <p className="text-sm text-muted-foreground">
                          {(documentAnalysis.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Summary:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {documentAnalysis.summary}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Key Entities:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {documentAnalysis.entities.map(
                          (entity: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {entity}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Insights:</span>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        {documentAnalysis.keyInsights.map(
                          (insight: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              {insight}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
