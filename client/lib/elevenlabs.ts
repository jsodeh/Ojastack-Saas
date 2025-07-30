// ElevenLabs API Integration
const ELEVENLABS_API_KEY =
  import.meta.env.VITE_ELEVENLABS_API_KEY || "your-api-key";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export interface Voice {
  voice_id: string;
  name: string;
  samples: any[];
  category: string;
  fine_tuning: {
    is_allowed_to_fine_tune: boolean;
    state: object;
    verification_failures: string[];
    verification_attempts_count: number;
    manual_verification_requested: boolean;
  };
  labels: Record<string, string>;
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  sharing: {
    status: string;
    history_item_sample_id: string;
    original_voice_id: string;
    public_owner_id: string;
    liked_by_count: number;
    cloned_by_count: number;
    name: string;
    description: string;
    labels: Record<string, string>;
    review_status: string;
    review_message: string;
    enabled_in_library: boolean;
  };
  high_quality_base_model_ids: string[];
}

export interface TextToSpeechOptions {
  voice_id: string;
  text: string;
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  pronunciation_dictionary_locators?: Array<{
    pronunciation_dictionary_id: string;
    version_id: string;
  }>;
  seed?: number;
  previous_text?: string;
  next_text?: string;
  previous_request_ids?: string[];
  next_request_ids?: string[];
}

export interface SpeechToTextOptions {
  audio: Blob;
  model?: string;
  language?: string;
}

class ElevenLabsService {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string = ELEVENLABS_API_KEY,
    baseUrl: string = ELEVENLABS_BASE_URL,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      Accept: "application/json",
      "xi-api-key": this.apiKey,
    };
  }

  private getAudioHeaders(): HeadersInit {
    return {
      Accept: "audio/mpeg",
      "xi-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  // Get all available voices
  async getVoices(): Promise<Voice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error("Error fetching voices:", error);
      throw error;
    }
  }

  // Get a specific voice by ID
  async getVoice(voiceId: string): Promise<Voice> {
    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching voice:", error);
      throw error;
    }
  }

  // Convert text to speech
  async textToSpeech(options: TextToSpeechOptions): Promise<ArrayBuffer> {
    try {
      const {
        voice_id,
        text,
        model_id = "eleven_monolingual_v1",
        voice_settings = {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      } = options;

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voice_id}`,
        {
          method: "POST",
          headers: this.getAudioHeaders(),
          body: JSON.stringify({
            text,
            model_id,
            voice_settings,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      throw error;
    }
  }

  // Convert speech to text (using ElevenLabs Speech-to-Text)
  async speechToText(
    options: SpeechToTextOptions,
  ): Promise<{ text: string; language?: string }> {
    try {
      const formData = new FormData();
      formData.append("audio", options.audio);

      if (options.model) {
        formData.append("model", options.model);
      }

      if (options.language) {
        formData.append("language", options.language);
      }

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }

      const data = await response.json();
      return {
        text: data.text,
        language: data.language,
      };
    } catch (error) {
      console.error("Error in speech-to-text:", error);
      throw error;
    }
  }

  // Stream text-to-speech for real-time audio
  async streamTextToSpeech(
    options: TextToSpeechOptions,
  ): Promise<ReadableStream> {
    try {
      const {
        voice_id,
        text,
        model_id = "eleven_monolingual_v1",
        voice_settings = {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      } = options;

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voice_id}/stream`,
        {
          method: "POST",
          headers: this.getAudioHeaders(),
          body: JSON.stringify({
            text,
            model_id,
            voice_settings,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      return response.body;
    } catch (error) {
      console.error("Error in stream text-to-speech:", error);
      throw error;
    }
  }

  // Get user subscription info
  async getUserSubscription() {
    try {
      const response = await fetch(`${this.baseUrl}/user/subscription`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      throw error;
    }
  }

  // Get user usage statistics
  async getUserUsage() {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching user usage:", error);
      throw error;
    }
  }
}

// Audio utilities for handling voice interactions
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async initialize(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error("Error initializing audio:", error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.stream) {
      await this.initialize();
    }

    if (!this.stream) {
      throw new Error("No audio stream available");
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error("No active recording");
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (!this.audioContext) {
      throw new Error("No audio context available");
    }

    try {
      const audioData = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
      throw error;
    }
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const elevenLabs = new ElevenLabsService();
export const audioManager = new AudioManager();
