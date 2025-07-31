/**
 * Video Effects Library
 * Provides virtual backgrounds, noise cancellation, and video enhancement features
 */

interface VideoEffectsConfig {
  virtualBackground?: {
    enabled: boolean;
    type: 'blur' | 'image' | 'video';
    source?: string;
    intensity?: number;
  };
  noiseCancellation?: {
    enabled: boolean;
    intensity?: number;
  };
  videoEnhancement?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    autoFocus?: boolean;
  };
}

class VideoEffectsManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private backgroundVideo: HTMLVideoElement | null = null;
  private isProcessing = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Apply virtual background to video stream
   */
  async applyVirtualBackground(
    videoStream: MediaStream,
    config: VideoEffectsConfig['virtualBackground']
  ): Promise<MediaStream> {
    if (!config?.enabled || !this.canvas || !this.ctx) {
      return videoStream;
    }

    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) {
      return videoStream;
    }

    try {
      // Create video element from stream
      const video = document.createElement('video');
      video.srcObject = videoStream;
      video.autoplay = true;
      video.muted = true;
      await video.play();

      // Set canvas dimensions
      this.canvas.width = video.videoWidth || 640;
      this.canvas.height = video.videoHeight || 480;

      // Load background if needed
      if (config.type === 'image' && config.source) {
        await this.loadBackgroundImage(config.source);
      } else if (config.type === 'video' && config.source) {
        await this.loadBackgroundVideo(config.source);
      }

      // Create processed stream
      const processedStream = this.canvas.captureStream(30);
      
      // Start processing frames
      this.startFrameProcessing(video, config);

      // Replace video track
      const newVideoTrack = processedStream.getVideoTracks()[0];
      const newStream = new MediaStream([newVideoTrack, ...videoStream.getAudioTracks()]);

      return newStream;
    } catch (error) {
      console.error('Failed to apply virtual background:', error);
      return videoStream;
    }
  }

  /**
   * Apply noise cancellation to audio stream
   */
  async applyNoiseCancellation(
    audioStream: MediaStream,
    config: VideoEffectsConfig['noiseCancellation']
  ): Promise<MediaStream> {
    if (!config?.enabled) {
      return audioStream;
    }

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioStream);
      const destination = audioContext.createMediaStreamDestination();

      // Create noise gate
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
      compressor.knee.setValueAtTime(40, audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      compressor.attack.setValueAtTime(0, audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, audioContext.currentTime);

      // Create high-pass filter to remove low-frequency noise
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.setValueAtTime(80, audioContext.currentTime);

      // Create low-pass filter to remove high-frequency noise
      const lowPassFilter = audioContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.setValueAtTime(8000, audioContext.currentTime);

      // Connect audio processing chain
      source
        .connect(highPassFilter)
        .connect(lowPassFilter)
        .connect(compressor)
        .connect(destination);

      return destination.stream;
    } catch (error) {
      console.error('Failed to apply noise cancellation:', error);
      return audioStream;
    }
  }

  /**
   * Apply video enhancements
   */
  async applyVideoEnhancements(
    videoStream: MediaStream,
    config: VideoEffectsConfig['videoEnhancement']
  ): Promise<MediaStream> {
    if (!config || !this.canvas || !this.ctx) {
      return videoStream;
    }

    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) {
      return videoStream;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = videoStream;
      video.autoplay = true;
      video.muted = true;
      await video.play();

      this.canvas.width = video.videoWidth || 640;
      this.canvas.height = video.videoHeight || 480;

      const processedStream = this.canvas.captureStream(30);
      
      // Start enhancement processing
      this.startEnhancementProcessing(video, config);

      const newVideoTrack = processedStream.getVideoTracks()[0];
      const newStream = new MediaStream([newVideoTrack, ...videoStream.getAudioTracks()]);

      return newStream;
    } catch (error) {
      console.error('Failed to apply video enhancements:', error);
      return videoStream;
    }
  }

  /**
   * Start frame processing for virtual background
   */
  private startFrameProcessing(
    video: HTMLVideoElement,
    config: VideoEffectsConfig['virtualBackground']
  ): void {
    if (this.isProcessing || !this.ctx || !this.canvas) return;

    this.isProcessing = true;

    const processFrame = () => {
      if (!this.isProcessing || !this.ctx || !this.canvas) return;

      try {
        // Draw current video frame
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

        // Apply background effect
        if (config?.type === 'blur') {
          this.applyBlurBackground(config.intensity || 5);
        } else if (config?.type === 'image' && this.backgroundImage) {
          this.applyImageBackground();
        } else if (config?.type === 'video' && this.backgroundVideo) {
          this.applyVideoBackground();
        }

        requestAnimationFrame(processFrame);
      } catch (error) {
        console.error('Frame processing error:', error);
        this.isProcessing = false;
      }
    };

    processFrame();
  }

  /**
   * Start enhancement processing
   */
  private startEnhancementProcessing(
    video: HTMLVideoElement,
    config: VideoEffectsConfig['videoEnhancement']
  ): void {
    if (this.isProcessing || !this.ctx || !this.canvas) return;

    this.isProcessing = true;

    const processFrame = () => {
      if (!this.isProcessing || !this.ctx || !this.canvas) return;

      try {
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

        // Apply enhancements
        if (config) {
          this.applyImageEnhancements(config);
        }

        requestAnimationFrame(processFrame);
      } catch (error) {
        console.error('Enhancement processing error:', error);
        this.isProcessing = false;
      }
    };

    processFrame();
  }

  /**
   * Apply blur background effect
   */
  private applyBlurBackground(intensity: number): void {
    if (!this.ctx || !this.canvas) return;

    // Simple blur effect using canvas filter
    this.ctx.filter = `blur(${intensity}px)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = 'none';
  }

  /**
   * Apply image background
   */
  private applyImageBackground(): void {
    if (!this.ctx || !this.canvas || !this.backgroundImage) return;

    // Draw background image
    this.ctx.globalCompositeOperation = 'destination-over';
    this.ctx.drawImage(
      this.backgroundImage,
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Apply video background
   */
  private applyVideoBackground(): void {
    if (!this.ctx || !this.canvas || !this.backgroundVideo) return;

    // Draw background video frame
    this.ctx.globalCompositeOperation = 'destination-over';
    this.ctx.drawImage(
      this.backgroundVideo,
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Apply image enhancements
   */
  private applyImageEnhancements(config: VideoEffectsConfig['videoEnhancement']): void {
    if (!this.ctx || !config) return;

    const filters = [];

    if (config.brightness !== undefined) {
      filters.push(`brightness(${config.brightness}%)`);
    }
    if (config.contrast !== undefined) {
      filters.push(`contrast(${config.contrast}%)`);
    }
    if (config.saturation !== undefined) {
      filters.push(`saturate(${config.saturation}%)`);
    }

    if (filters.length > 0) {
      this.ctx.filter = filters.join(' ');
      this.ctx.drawImage(this.canvas!, 0, 0);
      this.ctx.filter = 'none';
    }
  }

  /**
   * Load background image
   */
  private async loadBackgroundImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Load background video
   */
  private async loadBackgroundVideo(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadeddata = () => {
        this.backgroundVideo = video;
        video.loop = true;
        video.muted = true;
        video.play();
        resolve();
      };
      video.onerror = reject;
      video.src = src;
    });
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    this.isProcessing = false;
  }

  /**
   * Get available background presets
   */
  getBackgroundPresets(): Array<{
    id: string;
    name: string;
    type: 'blur' | 'image' | 'video';
    thumbnail: string;
    source?: string;
  }> {
    return [
      {
        id: 'blur-light',
        name: 'Light Blur',
        type: 'blur',
        thumbnail: '/backgrounds/blur-light.jpg'
      },
      {
        id: 'blur-heavy',
        name: 'Heavy Blur',
        type: 'blur',
        thumbnail: '/backgrounds/blur-heavy.jpg'
      },
      {
        id: 'office',
        name: 'Modern Office',
        type: 'image',
        thumbnail: '/backgrounds/office-thumb.jpg',
        source: '/backgrounds/office.jpg'
      },
      {
        id: 'library',
        name: 'Library',
        type: 'image',
        thumbnail: '/backgrounds/library-thumb.jpg',
        source: '/backgrounds/library.jpg'
      },
      {
        id: 'nature',
        name: 'Nature Scene',
        type: 'image',
        thumbnail: '/backgrounds/nature-thumb.jpg',
        source: '/backgrounds/nature.jpg'
      },
      {
        id: 'abstract',
        name: 'Abstract Animation',
        type: 'video',
        thumbnail: '/backgrounds/abstract-thumb.jpg',
        source: '/backgrounds/abstract.mp4'
      }
    ];
  }

  /**
   * Check if effects are supported
   */
  static isSupported(): {
    virtualBackground: boolean;
    noiseCancellation: boolean;
    videoEnhancement: boolean;
  } {
    return {
      virtualBackground: !!(HTMLCanvasElement.prototype.captureStream),
      noiseCancellation: !!(window.AudioContext || window.webkitAudioContext),
      videoEnhancement: !!(HTMLCanvasElement.prototype.captureStream)
    };
  }
}

// Export singleton instance
export const videoEffectsManager = new VideoEffectsManager();
export default videoEffectsManager;

// Export types
export type { VideoEffectsConfig };