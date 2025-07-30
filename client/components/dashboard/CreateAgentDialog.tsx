import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: (agent: any) => void;
}

interface AgentConfig {
  name: string;
  description: string;
  type: 'chat' | 'voice' | 'multimodal';
  personality: string;
  instructions: string;
  model: string;
  temperature: number;
  max_tokens: number;
  voice_settings?: {
    voice_id: string;
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

const VOICE_OPTIONS = [
  { id: 'rachel', name: 'Rachel', description: 'Calm and professional' },
  { id: 'domi', name: 'Domi', description: 'Strong and confident' },
  { id: 'bella', name: 'Bella', description: 'Friendly and warm' },
  { id: 'antoni', name: 'Antoni', description: 'Deep and authoritative' },
  { id: 'elli', name: 'Elli', description: 'Young and energetic' },
];

export default function CreateAgentDialog({ open, onOpenChange, onAgentCreated }: CreateAgentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    type: 'chat',
    personality: 'You are a helpful and professional AI assistant.',
    instructions: 'Provide helpful, accurate, and friendly responses to user questions.',
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 500,
    voice_settings: {
      voice_id: 'rachel',
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.5,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        onAgentCreated(data.agent);
        // Reset form
        setConfig({
          name: '',
          description: '',
          type: 'chat',
          personality: 'You are a helpful and professional AI assistant.',
          instructions: 'Provide helpful, accurate, and friendly responses to user questions.',
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 500,
          voice_settings: {
            voice_id: 'rachel',
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.5,
          },
        });
      } else {
        const error = await response.json();
        alert(`Error creating agent: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (field: keyof AgentConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateVoiceSettings = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      voice_settings: {
        ...prev.voice_settings!,
        [field]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New AI Agent</DialogTitle>
          <DialogDescription>
            Configure your AI agent's personality, capabilities, and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="personality">Personality</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Support Bot"
                    value={config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Agent Type *</Label>
                  <Select value={config.type} onValueChange={(value) => updateConfig('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">💬 Chat Only</SelectItem>
                      <SelectItem value="voice">🎤 Voice Only</SelectItem>
                      <SelectItem value="multimodal">🎯 Chat + Voice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this agent does"
                  value={config.description}
                  onChange={(e) => updateConfig('description', e.target.value)}
                />
              </div>

              {(config.type === 'voice' || config.type === 'multimodal') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Voice Settings</CardTitle>
                    <CardDescription>Configure the voice for your agent</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Voice</Label>
                      <Select 
                        value={config.voice_settings?.voice_id} 
                        onValueChange={(value) => updateVoiceSettings('voice_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VOICE_OPTIONS.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              {voice.name} - {voice.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Stability: {config.voice_settings?.stability}</Label>
                        <Slider
                          value={[config.voice_settings?.stability || 0.5]}
                          onValueChange={([value]) => updateVoiceSettings('stability', value)}
                          max={1}
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Clarity: {config.voice_settings?.similarity_boost}</Label>
                        <Slider
                          value={[config.voice_settings?.similarity_boost || 0.5]}
                          onValueChange={([value]) => updateVoiceSettings('similarity_boost', value)}
                          max={1}
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Style: {config.voice_settings?.style}</Label>
                        <Slider
                          value={[config.voice_settings?.style || 0.5]}
                          onValueChange={([value]) => updateVoiceSettings('style', value)}
                          max={1}
                          min={0}
                          step={0.1}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="personality" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personality">Personality *</Label>
                <Textarea
                  id="personality"
                  placeholder="Describe your agent's personality and tone..."
                  value={config.personality}
                  onChange={(e) => updateConfig('personality', e.target.value)}
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This defines how your agent behaves and communicates with users.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions *</Label>
                <Textarea
                  id="instructions"
                  placeholder="Specific instructions for your agent..."
                  value={config.instructions}
                  onChange={(e) => updateConfig('instructions', e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Detailed instructions on how the agent should handle conversations.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select value={config.model} onValueChange={(value) => updateConfig('model', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</SelectItem>
                      <SelectItem value="claude-3">Claude 3 (Alternative)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Max Response Length</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    min="50"
                    max="2000"
                    value={config.max_tokens}
                    onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Creativity: {config.temperature}</Label>
                <Slider
                  value={[config.temperature]}
                  onValueChange={([value]) => updateConfig('temperature', value)}
                  max={1}
                  min={0}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Lower values make responses more focused and consistent. Higher values make them more creative.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !config.name || !config.personality}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}