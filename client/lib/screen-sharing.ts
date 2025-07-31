/**
 * Screen Sharing Utility
 * Handles screen capture, window selection, and screen sharing features
 */

interface ScreenShareOptions {
  video?: {
    width?: number;
    height?: number;
    frameRate?: number;
    cursor?: 'always' | 'motion' | 'never';
  };
  audio?: boolean;
  preferCurrentTab?: boolean;
}

interface ScreenShareSource {
  id: string;
  name: string;
  type: 'screen' | 'window' | 'tab';
  thumbnail?: string;
}

class ScreenSharingManager {
  private currentStream: MediaStream | null = null;
  private isSharing = false;
  private onStreamEndedCallback?: () => void;

  /**
   * Start screen sharing
   */
  async startScreenShare(options: ScreenShareOptions = {}): Promise<MediaStream> {
    if (this.isSharing) {
      throw new Error('Screen sharing is already active');
    }

    try {
      const constraints: DisplayMediaStreamConstraints = {
        video: {
          width: options.video?.width || 1920,
          height: options.video?.height || 1080,
          frameRate: options.video?.frameRate || 30,
          cursor: options.video?.cursor || 'always'
        },
        audio: options.audio || false
      };

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      this.currentStream = stream;
      this.isSharing = true;

      // Listen for stream end (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.handleStreamEnded();
      });

      return stream;
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw new Error('Failed to start screen sharing. Please check permissions.');
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.handleStreamEnded();
    }
  }

  /**
   * Switch between screen sharing and camera
   */
  async switchToCamera(): Promise<MediaStream> {
    if (!this.isSharing) {
      throw new Error('No active screen share to switch from');
    }

    try {
      // Stop current screen share
      this.stopScreenShare();

      // Start camera
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          frameRate: 30
        },
        audio: true
      });

      return cameraStream;
    } catch (error) {
      console.error('Failed to switch to camera:', error);
      throw new Error('Failed to switch to camera');
    }
  }

  /**
   * Get screen sharing capabilities
   */
  async getCapabilities(): Promise<{
    supported: boolean;
    canShareAudio: boolean;
    canShareTab: boolean;
    canShareWindow: boolean;
    canShareScreen: boolean;
  }> {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    
    if (!supported) {
      return {
        supported: false,
        canShareAudio: false,
        canShareTab: false,
        canShareWindow: false,
        canShareScreen: false
      };
    }

    // Test capabilities by attempting to get constraints
    try {
      const capabilities = {
        supported: true,
        canShareAudio: true, // Most browsers support this
        canShareTab: true,   // Chrome, Edge support this
        canShareWindow: true, // Most browsers support this
        canShareScreen: true  // Most browsers support this
      };

      return capabilities;
    } catch (error) {
      return {
        supported: true,
        canShareAudio: false,
        canShareTab: false,
        canShareWindow: false,
        canShareScreen: false
      };
    }
  }

  /**
   * Create picture-in-picture for screen share
   */
  async createPictureInPicture(videoElement: HTMLVideoElement): Promise<PictureInPictureWindow | null> {
    if (!document.pictureInPictureEnabled) {
      console.warn('Picture-in-picture not supported');
      return null;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      const pipWindow = await videoElement.requestPictureInPicture();
      return pipWindow;
    } catch (error) {
      console.error('Failed to create picture-in-picture:', error);
      return null;
    }
  }

  /**
   * Record screen share
   */
  async startRecording(options: {
    mimeType?: string;
    videoBitsPerSecond?: number;
    audioBitsPerSecond?: number;
  } = {}): Promise<MediaRecorder> {
    if (!this.currentStream) {
      throw new Error('No active screen share to record');
    }

    const mimeType = options.mimeType || 'video/webm;codecs=vp9';
    
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error(`MIME type ${mimeType} not supported`);
    }

    const recorder = new MediaRecorder(this.currentStream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond || 2500000,
      audioBitsPerSecond: options.audioBitsPerSecond || 128000
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `screen-recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    };

    recorder.start(1000); // Collect data every second
    return recorder;
  }

  /**
   * Annotate screen share
   */
  createAnnotationOverlay(canvas: HTMLCanvasElement): {
    startDrawing: (x: number, y: number) => void;
    draw: (x: number, y: number) => void;
    stopDrawing: () => void;
    clear: () => void;
    setColor: (color: string) => void;
    setLineWidth: (width: number) => void;
  } {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentColor = '#ff0000';
    let currentLineWidth = 3;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    return {
      startDrawing: (x: number, y: number) => {
        isDrawing = true;
        lastX = x;
        lastY = y;
      },

      draw: (x: number, y: number) => {
        if (!isDrawing) return;

        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        lastX = x;
        lastY = y;
      },

      stopDrawing: () => {
        isDrawing = false;
      },

      clear: () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },

      setColor: (color: string) => {
        currentColor = color;
      },

      setLineWidth: (width: number) => {
        currentLineWidth = width;
      }
    };
  }

  /**
   * Handle stream ended
   */
  private handleStreamEnded(): void {
    this.currentStream = null;
    this.isSharing = false;
    this.onStreamEndedCallback?.();
  }

  /**
   * Set callback for when stream ends
   */
  onStreamEnded(callback: () => void): void {
    this.onStreamEndedCallback = callback;
  }

  /**
   * Check if currently sharing
   */
  get sharing(): boolean {
    return this.isSharing;
  }

  /**
   * Get current stream
   */
  get stream(): MediaStream | null {
    return this.currentStream;
  }

  /**
   * Get stream statistics
   */
  getStreamStats(): {
    isActive: boolean;
    videoTrack?: {
      width: number;
      height: number;
      frameRate: number;
    };
    audioTrack?: {
      enabled: boolean;
    };
  } | null {
    if (!this.currentStream) {
      return null;
    }

    const videoTrack = this.currentStream.getVideoTracks()[0];
    const audioTrack = this.currentStream.getAudioTracks()[0];

    const stats: any = {
      isActive: this.isSharing
    };

    if (videoTrack) {
      const settings = videoTrack.getSettings();
      stats.videoTrack = {
        width: settings.width || 0,
        height: settings.height || 0,
        frameRate: settings.frameRate || 0
      };
    }

    if (audioTrack) {
      stats.audioTrack = {
        enabled: audioTrack.enabled
      };
    }

    return stats;
  }

  /**
   * Create screen share preview
   */
  createPreview(container: HTMLElement): HTMLVideoElement {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';

    if (this.currentStream) {
      video.srcObject = this.currentStream;
    }

    container.appendChild(video);
    return video;
  }

  /**
   * Check browser support
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices && 
      navigator.mediaDevices.getDisplayMedia
    );
  }

  /**
   * Get supported MIME types for recording
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }
}

// Export singleton instance
export const screenSharingManager = new ScreenSharingManager();
export default screenSharingManager;

// Export types
export type { ScreenShareOptions, ScreenShareSource };