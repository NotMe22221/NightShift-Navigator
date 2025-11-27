/**
 * Mock Camera Implementation
 * Provides simulated camera frames for testing
 */

import type { CameraInterface } from './index.js';

/**
 * Configuration options for MockCamera
 */
export interface MockCameraConfig {
  width?: number;
  height?: number;
  fps?: number;
  brightness?: number; // 0-255, average brightness of generated frames
}

/**
 * Mock camera implementation for testing
 * Generates synthetic ImageData frames with configurable properties
 */
export class MockCamera implements CameraInterface {
  private config: Required<MockCameraConfig>;
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  private currentFrame: ImageData | null = null;
  private frameCallbacks: Array<(frame: ImageData) => void> = [];

  constructor(config: MockCameraConfig = {}) {
    this.config = {
      width: config.width ?? 640,
      height: config.height ?? 480,
      fps: config.fps ?? 30,
      brightness: config.brightness ?? 128,
    };
  }

  /**
   * Initialize the mock camera
   */
  async initialize(): Promise<void> {
    // Generate initial frame
    this.currentFrame = this.generateFrame();
  }

  /**
   * Start generating frames at configured FPS
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const intervalMs = 1000 / this.config.fps;

    this.intervalId = setInterval(() => {
      this.currentFrame = this.generateFrame();
      this.notifyFrameCallbacks(this.currentFrame);
    }, intervalMs) as unknown as number;
  }

  /**
   * Stop generating frames
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get the most recent frame
   */
  getCurrentFrame(): ImageData | null {
    return this.currentFrame;
  }

  /**
   * Register a callback for frame updates
   */
  onFrame(callback: (frame: ImageData) => void): void {
    this.frameCallbacks.push(callback);
  }

  /**
   * Check if camera is running
   */
  isRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Update the brightness setting
   */
  setBrightness(brightness: number): void {
    this.config.brightness = Math.max(0, Math.min(255, brightness));
  }

  /**
   * Generate a synthetic frame with the configured brightness
   */
  private generateFrame(): ImageData {
    const { width, height, brightness } = this.config;
    const data = new Uint8ClampedArray(width * height * 4);

    // Generate frame with some variation around target brightness
    for (let i = 0; i < data.length; i += 4) {
      // Add some random variation (±20) to make it more realistic
      const variation = Math.floor(Math.random() * 40) - 20;
      const pixelBrightness = Math.max(0, Math.min(255, brightness + variation));

      // RGBA values
      data[i] = pixelBrightness;     // R
      data[i + 1] = pixelBrightness; // G
      data[i + 2] = pixelBrightness; // B
      data[i + 3] = 255;             // A (fully opaque)
    }

    return new ImageData(data, width, height);
  }

  /**
   * Notify all registered callbacks of a new frame
   */
  private notifyFrameCallbacks(frame: ImageData): void {
    for (const callback of this.frameCallbacks) {
      callback(frame);
    }
  }
}
