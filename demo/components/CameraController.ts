/**
 * Camera Controller Component
 * Manages simulated camera feed for demo
 * Implements Requirements 1.1, 2.1
 */

/**
 * CameraController handles simulated camera feed and frame capture
 */
export class CameraController {
  private canvasElement: HTMLCanvasElement | null = null;
  private displayCanvas: HTMLCanvasElement | null = null;
  private isActive = false;
  private frameCallbacks: ((frame: ImageData) => void)[] = [];
  private startCallbacks: (() => void)[] = [];
  private stopCallbacks: (() => void)[] = [];
  private captureInterval: number | null = null;
  private animationFrame: number | null = null;
  private time = 0;

  /**
   * Initialize the camera controller
   */
  async initialize(): Promise<void> {
    // Get the display canvas (replaces video element)
    const container = document.getElementById('camera-container');
    if (!container) {
      throw new Error('Camera container not found');
    }

    // Create display canvas for simulated feed
    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.id = 'camera-feed';
    this.displayCanvas.width = 640;
    this.displayCanvas.height = 480;
    this.displayCanvas.style.maxWidth = '100%';
    this.displayCanvas.style.maxHeight = '100%';
    this.displayCanvas.style.display = 'block';
    
    // Remove video element if it exists
    const oldVideo = document.getElementById('camera-feed');
    if (oldVideo) {
      oldVideo.remove();
    }
    
    container.insertBefore(this.displayCanvas, container.firstChild);
    
    // Get overlay canvas
    this.canvasElement = document.getElementById('cv-overlay') as HTMLCanvasElement;
    if (!this.canvasElement) {
      throw new Error('Canvas overlay element not found');
    }
    
    // Match overlay size to display
    this.canvasElement.width = 640;
    this.canvasElement.height = 480;
  }

  /**
   * Start the simulated camera feed
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.time = 0;

    // Start animation loop for simulated feed
    this.startAnimation();

    // Start frame capture loop
    this.startFrameCapture();

    // Notify listeners
    this.startCallbacks.forEach(cb => cb());
    
    console.log('Simulated camera started successfully');
  }

  /**
   * Stop the simulated camera feed
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

    // Stop animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.isActive = false;

    // Notify listeners
    this.stopCallbacks.forEach(cb => cb());
  }

  /**
   * Animate the simulated camera feed
   */
  private startAnimation(): void {
    const animate = () => {
      if (!this.isActive || !this.displayCanvas) {
        return;
      }

      const ctx = this.displayCanvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const width = this.displayCanvas.width;
      const height = this.displayCanvas.height;

      // Create a gradient background simulating low-light environment
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `hsl(${this.time % 360}, 20%, 15%)`);
      gradient.addColorStop(0.5, `hsl(${(this.time + 60) % 360}, 20%, 10%)`);
      gradient.addColorStop(1, `hsl(${(this.time + 120) % 360}, 20%, 8%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add some "stars" or light points
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(this.time * 0.01 + i) * 0.5 + 0.5) * width;
        const y = (Math.cos(this.time * 0.015 + i * 2) * 0.5 + 0.5) * height;
        const size = Math.sin(this.time * 0.05 + i) * 2 + 3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add text overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Simulated Low-Light Environment', width / 2, 40);
      ctx.font = '14px monospace';
      ctx.fillText('Apply scenarios to see different conditions', width / 2, 70);

      this.time += 1;
      this.animationFrame = requestAnimationFrame(animate);
    };

    animate();
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
   * Capture a single frame from the simulated feed
   */
  private captureFrame(): void {
    if (!this.displayCanvas || !this.isActive) {
      return;
    }

    const ctx = this.displayCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Get image data from display canvas
    try {
      const imageData = ctx.getImageData(0, 0, this.displayCanvas.width, this.displayCanvas.height);
      
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
