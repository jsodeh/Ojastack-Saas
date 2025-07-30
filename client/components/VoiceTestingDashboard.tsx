import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Square,
  BarChart3,
  Clock,
  MessageSquare,
  TrendingUp,
  Waveform,
  Settings,
} from "lucide-react";
import { voiceConversationManager, type VoiceAnalytics, type VoiceMessage } from "@/lib/voice-conversation-manager";

interface VoiceTestingDashboardProps {
  agentId: string;
  agentName: string;
}

export default function VoiceTestingDashboard({ agentId, agentName }: VoiceTestingDashboardProps) {
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [recentVoiceMessages, setRecentVoiceMessages] = useState<VoiceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchVoiceAnalytics();
    fetchRecentVoiceMessages();
  }, [agentId]);

  const fetchVoiceAnalytics = async () => {
    try {
      const data = await voiceConversationManager.getVoiceAnalytics(agentId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching voice analytics:', error);
    }
  };

  const fetchRecentVoiceMessages = async () => {
    try {
      // This would need to be implemented to get recent voice messages for an agent
      // For now, we'll use mock data
      setRecentVoiceMessages([]);
    } catch (error) {
      console.error('Error fetching recent voice messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const formatAccuracy = (accuracy: number) => {
    return `${(accuracy * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voice Testing Dashboard</h2>
          <p className="text-muted-foreground">Monitor voice interactions for {agentName}</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voice Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_voice_conversations}</div>
              <p className="text-xs text-muted-foreground">
                Total voice interactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(analytics.total_audio_duration)}</div>
              <p className="text-xs text-muted-foreground">
                Audio processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(analytics.average_conversation_duration)}</div>
              <p className="text-xs text-muted-foreground">
                Per conversation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <Waveform className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAccuracy(analytics.transcription_accuracy)}</div>
              <p className="text-xs text-muted-foreground">
                Transcription accuracy
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="voices">Voice Usage</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="history">Conversation History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Usage Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Hours</CardTitle>
                <CardDescription>When users interact with voice features most</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.peak_usage_hours.slice(0, 5).map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {hour.hour}:00 - {hour.hour + 1}:00
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(hour.conversation_count / (analytics.peak_usage_hours[0]?.conversation_count || 1)) * 100} 
                          className="w-20" 
                        />
                        <span className="text-sm text-muted-foreground w-8">
                          {hour.conversation_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Voice Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
                <CardDescription>Voice interaction quality indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Transcription Accuracy</span>
                    <span className="font-medium">{formatAccuracy(analytics?.transcription_accuracy || 0)}</span>
                  </div>
                  <Progress value={(analytics?.transcription_accuracy || 0) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Voice Quality</span>
                    <span className="font-medium">{formatAccuracy(analytics?.voice_quality_average || 0)}</span>
                  </div>
                  <Progress value={(analytics?.voice_quality_average || 0) * 100} />
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Quality metrics are calculated based on transcription confidence and audio clarity.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Used Voices</CardTitle>
              <CardDescription>Voice preferences and usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.most_used_voices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No voice usage data available yet
                  </div>
                ) : (
                  analytics?.most_used_voices.map((voice, index) => (
                    <div key={voice.voice_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <div className="font-medium capitalize">{voice.voice_id}</div>
                          <div className="text-sm text-muted-foreground">
                            {voice.usage_count} interactions
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(voice.usage_count / (analytics.most_used_voices[0]?.usage_count || 1)) * 100} 
                          className="w-24" 
                        />
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Quality Distribution</CardTitle>
                <CardDescription>Distribution of audio quality scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Excellent (90-100%)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={25} className="w-20" />
                      <span className="text-sm text-muted-foreground">25%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Good (80-89%)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={45} className="w-20" />
                      <span className="text-sm text-muted-foreground">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fair (70-79%)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={20} className="w-20" />
                      <span className="text-sm text-muted-foreground">20%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Poor (< 70%)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={10} className="w-20" />
                      <span className="text-sm text-muted-foreground">10%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Recommendations</CardTitle>
                <CardDescription>Suggestions to improve voice quality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <div className="text-sm font-medium">Good transcription accuracy</div>
                      <div className="text-xs text-muted-foreground">
                        Your current accuracy is above 85%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <div className="text-sm font-medium">Consider voice variety</div>
                      <div className="text-xs text-muted-foreground">
                        Try different voices for better user engagement
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <div className="text-sm font-medium">Monitor peak hours</div>
                      <div className="text-xs text-muted-foreground">
                        Optimize for high-usage time periods
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Voice Conversations</CardTitle>
              <CardDescription>Latest voice interactions and their details</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recentVoiceMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No voice conversations yet. Start testing to see data here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentVoiceMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                              {message.role}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(message.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {message.audio_url && (
                              <Button variant="outline" size="sm">
                                <Play className="h-3 w-3 mr-1" />
                                Play
                              </Button>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {message.audio_duration ? formatDuration(message.audio_duration) : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {message.speech_confidence && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">Confidence:</span>
                            <Progress value={message.speech_confidence * 100} className="w-20" />
                            <span className="text-xs text-muted-foreground">
                              {formatAccuracy(message.speech_confidence)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}