export interface VoiceSettings {
  voice_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost?: boolean;
}

export interface VoiceModel {
  voice_id: string;
  name: string;
  description: string;
  category: 'premade' | 'cloned' | 'generated';
  labels: Record<string, string>;
  preview_url?: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  duration: number;
  language?: string;
}

export interface TextToSpeechResult {
  audio_url: string;
  audio_blob: Blob;
  duration: number;
  character_count: number;
}

export interface VoiceStreamingOptions {
  onChunk: (chunk: Uint8Array) => void;
  onComplete: (result: TextToSpeechResult) => void;
  onError: (error: Error) => void;
}

/**
 * Voice Service
 * Handles speech-to-text and text-to-speech using ElevenLabs API
 */
export class VoiceService {
  private elevenLabsApiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];

  constructor() {
    this.elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<VoiceModel[]> {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return this.getFallbackVoices();
    }
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(
    text: string,
    voiceSettings: VoiceSettings,
    streaming = false
  ): Promise<TextToSpeechResult> {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const url = `${this.baseUrl}/text-to-speech/${voiceSettings.voice_id}${streaming ? '/stream' : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost || false,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Get audio duration
      const duration = await this.getAudioDuration(audioBlob);

      return {
        audio_url: audioUrl,
        audio_blob: audioBlob,
        duration,
        character_count: text.length,
      };
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech with streaming
   */
  async textToSpeechStreaming(
    text: string,
    voiceSettings: VoiceSettings,
    options: VoiceStreamingOptions
  ): Promise<void> {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceSettings.voice_id}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost || false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs streaming TTS error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const chunks: Uint8Array[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Combine all chunks and create final result
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combinedArray = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
              combinedArray.set(chunk, offset);
              offset += chunk.length;
            }

            const audioBlob = new Blob([combinedArray], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const duration = await this.getAudioDuration(audioBlob);

            options.onComplete({
              audio_url: audioUrl,
              audio_blob: audioBlob,
              duration,
              character_count: text.length,
            });
            break;
          }

          chunks.push(value);
          options.onChunk(value);
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error in streaming text-to-speech:', error);
      options.onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Convert speech to text
   */
  async speechToText(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      // ElevenLabs doesn't have STT, so we'll use Web Speech API as fallback
      // In production, you might want to use Google Speech-to-Text, Azure, or Whisper
      return await this.speechToTextWebAPI(audioBlob);
    } catch (error) {
      console.error('Error in speech-to-text:', error);
      throw error;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.recordingChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordingChunks, { type: 'audio/webm' });
        
        // Stop all tracks
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        console.log('🎤 Recording stopped');
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Play audio from blob or URL
   */
  async playAudio(audioSource: Blob | string): Promise<void> {
    try {
      const audio = new Audio();
      
      if (typeof audioSource === 'string') {
        audio.src = audioSource;
      } else {
        audio.src = URL.createObjectURL(audioSource);
      }

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          if (typeof audioSource !== 'string') {
            URL.revokeObjectURL(audio.src);
          }
          resolve();
        };

        audio.onerror = () => {
          reject(new Error('Failed to play audio'));
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Get audio duration from blob
   */
  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };

      audio.src = url;
    });
  }

  /**
   * Speech to text using Web Speech API (fallback)
   */
  private async speechToTextWebAPI(audioBlob: Blob): Promise<SpeechToTextResult> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const result = event.results[0];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        resolve({
          text: transcript,
          confidence: confidence || 0.8,
          duration: 0, // Web Speech API doesn't provide duration
          language: 'en-US',
        });
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        // Recognition ended without result
        reject(new Error('No speech detected'));
      };

      // For Web Speech API, we need to use it differently
      // This is a simplified implementation
      recognition.start();
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        recognition.stop();
      }, 10000);
    });
  }

  /**
   * Get fallback voices when API is not available
   */
  private getFallbackVoices(): VoiceModel[] {
    return [
      {
        voice_id: 'rachel',
        name: 'Rachel',
        description: 'Calm and professional female voice',
        category: 'premade',
        labels: { accent: 'american', age: 'young', gender: 'female' },
      },
      {
        voice_id: 'domi',
        name: 'Domi',
        description: 'Strong and confident female voice',
        category: 'premade',
        labels: { accent: 'american', age: 'young', gender: 'female' },
      },
      {
        voice_id: 'bella',
        name: 'Bella',
        description: 'Friendly and warm female voice',
        category: 'premade',
        labels: { accent: 'american', age: 'young', gender: 'female' },
      },
      {
        voice_id: 'antoni',
        name: 'Antoni',
        description: 'Deep and authoritative male voice',
        category: 'premade',
        labels: { accent: 'american', age: 'middle_aged', gender: 'male' },
      },
      {
        voice_id: 'elli',
        name: 'Elli',
        description: 'Young and energetic female voice',
        category: 'premade',
        labels: { accent: 'american', age: 'young', gender: 'female' },
      },
    ];
  }

  /**
   * Test voice service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const voices = await this.getAvailableVoices();
      return voices.length > 0;
    } catch (error) {
      console.error('Voice service connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if microphone is available
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Get voice service statistics
   */
  getServiceStats() {
    return {
      api_key_configured: !!this.elevenLabsApiKey,
      audio_context_available: !!this.audioContext,
      media_recorder_supported: !!window.MediaRecorder,
      speech_recognition_supported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
      recording_active: !!this.mediaRecorder && this.mediaRecorder.state === 'recording',
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Create singleton instance
export const voiceService = new VoiceService();