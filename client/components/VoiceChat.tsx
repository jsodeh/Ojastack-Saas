import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  Waveform,
} from "lucide-react";
import { voiceService, type VoiceSettings, type VoiceModel } from "@/lib/voice-service";

interface VoiceChatProps {
  agentId: string;
  agentName?: string;
  voiceSettings: VoiceSettings;
  onVoiceSettingsChange?: (settings: VoiceSettings) => void;
  onTranscription?: (text: string) => void;
  onResponse?: (audioUrl: string, text: string) => void;
  disabled?: boolean;
}

interface VoiceMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  duration?: number;
}

export default function VoiceChat({
  agentId,
  agentName = 'AI Assistant',
  voiceSettings,
  onVoiceSettingsChange,
  onTranscription,
  onResponse,
  disabled = false,
}: VoiceChatProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [availableVoices, setAvailableVoices] = useState<VoiceModel[]>([]);
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    initializeVoiceService();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      startRecordingTimer();
    } else {
      stopRecordingTimer();
    }
  }, [isRecording]);

  const initializeVoiceService = async () => {
    try {
      // Check microphone permission
      const hasPermission = await voiceService.checkMicrophonePermission();
      setMicrophonePermission(hasPermission);

      // Load available voices
      const voices = await voiceService.getAvailableVoices();
      setAvailableVoices(voices);

      // Test connection
      const isConnected = await voiceService.testConnection();
      if (!isConnected) {
        setError('Voice service connection failed');
      }
    } catch (error) {
      console.error('Error initializing voice service:', error);
      setError('Failed to initialize voice service');
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      setIsProcessing(false);

      await voiceService.startRecording();
      startAudioLevelMonitoring();
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      stopAudioLevelMonitoring();

      const audioBlob = await voiceService.stopRecording();
      
      // Convert speech to text
      const transcription = await voiceService.speechToText(audioBlob);
      
      // Add user message
      const userMessage: VoiceMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        text: transcription.text,
        audioUrl: URL.createObjectURL(audioBlob),
        timestamp: new Date(),
        duration: transcription.duration,
      };

      setMessages(prev => [...prev, userMessage]);
      onTranscription?.(transcription.text);

      // Get AI response
      await getAIResponse(transcription.text);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAIResponse = async (userText: string) => {
    try {
      setIsSpeaking(true);

      // Call your conversation API to get text response
      const response = await fetch('/.netlify/functions/conversations/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          message: userText,
          customerId: `voice_user_${Date.now()}`,
          channel: 'voice',
          messageType: 'audio',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const responseText = data.response;

      // Convert response to speech
      const ttsResult = await voiceService.textToSpeech(responseText, voiceSettings);

      // Add agent message
      const agentMessage: VoiceMessage = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        text: responseText,
        audioUrl: ttsResult.audio_url,
        timestamp: new Date(),
        duration: ttsResult.duration,
      };

      setMessages(prev => [...prev, agentMessage]);
      onResponse?.(ttsResult.audio_url, responseText);

      // Auto-play the response
      await playAudio(ttsResult.audio_blob);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setError('Failed to get AI response');
    } finally {
      setIsSpeaking(false);
    }
  };

  const playAudio = async (audioSource: Blob | string) => {
    try {
      setIsPlaying(true);
      await voiceService.playAudio(audioSource);
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Failed to play audio');
    } finally {
      setIsPlaying(false);
    }
  };

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
  };

  const startAudioLevelMonitoring = () => {
    // Simulate audio level monitoring
    audioLevelTimerRef.current = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);
  };

  const stopAudioLevelMonitoring = () => {
    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current);
      audioLevelTimerRef.current = null;
    }
    setAudioLevel(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateVoiceSettings = (field: keyof VoiceSettings, value: any) => {
    const newSettings = { ...voiceSettings, [field]: value };
    onVoiceSettingsChange?.(newSettings);
  };

  const cleanup = () => {
    stopRecordingTimer();
    stopAudioLevelMonitoring();
    voiceService.cleanup();
  };

  if (microphonePermission === false) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Microphone Access Required</h3>
          <p className="text-muted-foreground mb-4">
            Please allow microphone access to use voice chat features.
          </p>
          <Button onClick={initializeVoiceService}>
            Retry Permission
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voice Chat Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Volume2 className="h-5 w-5 mr-2" />
              Voice Chat with {agentName}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={microphonePermission ? 'default' : 'destructive'}>
                {microphonePermission ? 'Mic Ready' : 'No Mic'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Controls */}
          <div className="text-center space-y-4">
            <div className="relative">
              <Button
                size="lg"
                className={`w-24 h-24 rounded-full ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled || isProcessing || !microphonePermission}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
              
              {isRecording && (
                <div className="absolute -inset-2 border-4 border-red-500 rounded-full animate-ping opacity-75"></div>
              )}
            </div>

            <div className="space-y-2">
              {isRecording && (
                <>
                  <p className="text-sm font-medium">Recording... {formatDuration(recordingDuration)}</p>
                  <Progress value={audioLevel} className="w-48 mx-auto" />
                </>
              )}
              
              {isProcessing && (
                <p className="text-sm text-muted-foreground">Processing speech...</p>
              )}
              
              {isSpeaking && (
                <p className="text-sm text-muted-foreground">AI is speaking...</p>
              )}
              
              {!isRecording && !isProcessing && !isSpeaking && (
                <p className="text-sm text-muted-foreground">
                  {microphonePermission ? 'Click to start recording' : 'Microphone access required'}
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Voice Settings */}
          {showSettings && (
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Voice Settings</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select
                    value={voiceSettings.voice_id}
                    onValueChange={(value) => updateVoiceSettings('voice_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} - {voice.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Stability: {voiceSettings.stability}</Label>
                  <Slider
                    value={[voiceSettings.stability]}
                    onValueChange={([value]) => updateVoiceSettings('stability', value)}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Clarity: {voiceSettings.similarity_boost}</Label>
                  <Slider
                    value={[voiceSettings.similarity_boost]}
                    onValueChange={([value]) => updateVoiceSettings('similarity_boost', value)}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Style: {voiceSettings.style}</Label>
                  <Slider
                    value={[voiceSettings.style]}
                    onValueChange={([value]) => updateVoiceSettings('style', value)}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation History */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <p className="text-sm">{message.text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.audioUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playAudio(message.audioUrl!)}
                              disabled={isPlaying}
                            >
                              {isPlaying ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}