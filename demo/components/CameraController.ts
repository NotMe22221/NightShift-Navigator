/**
 * Camera Controller Component
 * Manages camera access and video feed display
 * Implements Requirements 1.1, 2.1
 */

/**
 * CameraController handles camera access and frame capture
 */
export class CameraController {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private isActive = false;
  private frameCallbacks: ((frame: ImageData) => void)[] = [];
  private startCallbacks: (() => void)[] = [];
  private stopCallbacks: (() => void)[] = [];
  private captureInterval: number | null = null;

  /**
   * Initialize the camera controller
   */
  async initialize(): Promise<void> {
    this.videoElement = document.getElementById('camera-feed') as HTMLVideoElement;
    this.canvasElement = document.getElementById('cv-overlay') as HTMLCanvasElement;
    
    if (!this.videoElement) {
      throw new Error('Camera video element not found');
    }
    if (!this.canvasElement) {
      throw new Error('Canvas overlay element not found');
    }
  }

  /**
   * Start the camera and begin frame capture
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Prefer rear camera on mobile
        }
      });

      // Attach stream to video element
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      this.isActive = true;

      // Start frame capture loop
      this.startFrameCapture();

      // Notify listeners
      this.startCallbacks.forEach(cb => cb());
    } catch (error) {
      console.error('Failed to start camera:', error);
      throw new Error(`Camera access denied or unavailable: ${(error as Error).message}`);
    }
  }

  /**
   * Stop the camera and release resources
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    // Stop frame capture
    if (this.captureInterval !== null) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isActive = false;

    // Notify listeners
    this.stopCallbacks.forEach(cb => cb());
  }

  /**
   * Start capturing frames from the video feed
   */
  private startFrameCapture(): void {
    // Capture frames at 10 fps (every 100ms)
    this.captureInterval = window.setInterval(() => {
      this.captureFrame();
    }, 100);
  }

  /**
   * Capture a single frame from the video feed
   */
  private captureFrame(): void {
    if (!this.videoElement || !this.canvasElement || !this.isActive) {
      return;
    }

    const video = this.videoElement;
    const canvas = this.canvasElement;

    // Ensure video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Notify frame callbacks
      this.frameCallbacks.forEach(cb => cb(imageData));
    } catch (error) {
      console.error('Failed to capture frame:', error);
    }
  }

  /**
   * Draw CV processing results on the overlay canvas
   */
  drawOverlay(drawFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void): void {
    if (!this.canvasElement) {
      return;
    }

    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear previous overlay
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Draw new overlay
    drawFn(ctx, this.canvasElement.width, this.canvasElement.height);
  }

  /**
   * Register callback for camera start
   */
  onStart(callback: () => void): void {
    this.startCallbacks.push(callback);
  }

  /**
   * Register callback for camera stop
   */
  onStop(callback: () => void): void {
    this.stopCallbacks.push(callback);
  }

  /**
   * Register callback for frame capture
   */
  onFrame(callback: (frame: ImageData) => void): void {
    this.frameCallbacks.push(callback);
  }

  /**
   * Check if camera is active
   */
  get active(): boolean {
    return this.isActive;
  }
}
