/**
 * Computer Vision Pipeline
 * Analyzes camera frames to detect hazards, compute brightness distributions, and generate contrast maps
 */

import { BrightnessHistogram, computeBrightnessHistogram } from '../sensor-fusion/brightness-histogram';
import { detectHazards } from './hazard-classifier';
import { generateContrastMap } from './contrast-map';
import { createError, type SystemError } from '../error-handling/index.js';

/**
 * Computer Vision configuration
 */
export interface CVConfig {
  targetFPS: number; // minimum 10 fps
  maxMemoryMB: number; // maximum 150 MB
  hazardDetectionEnabled: boolean;
  contrastMapEnabled: boolean;
}

/**
 * Hazard detection result
 */
export interface HazardDetection {
  id: string;
  type: 'obstacle' | 'uneven_surface' | 'drop_off' | 'unknown';
  confidence: number; // 0.0-1.0
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  worldPosition?: {
    latitude: number;
    longitude: number;
    distance: number; // meters from user
  };
}

/**
 * Contrast map result
 */
export interface ContrastMap {
  width: number;
  height: number;
  data: Float32Array; // normalized contrast values 0-1
}

/**
 * Computer Vision processing result
 */
export interface CVResult {
  histogram: BrightnessHistogram;
  hazards: HazardDetection[];
  contrastMap: ContrastMap;
  processingTimeMs: number;
}

/**
 * Frame processing job
 */
interface FrameJob {
  id: number;
  frame: ImageData;
  timestamp: number;
  resolve: (result: CVResult) => void;
  reject: (error: Error) => void;
}

/**
 * Computer Vision Pipeline
 * Processes camera frames to detect hazards and analyze brightness
 */
export class CVPipeline {
  private config: CVConfig;
  private frameQueue: FrameJob[] = [];
  private processing = false;
  private frameCounter = 0;
  private fpsHistory: number[] = [];
  private lastFpsUpdate = 0;
  private currentFPS = 0;
  private memoryUsageMB = 0;
  private worker: Worker | null = null;
  private initialized = false;
  private errorLog: SystemError[] = [];
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  constructor() {
    this.config = {
      targetFPS: 10,
      maxMemoryMB: 150,
      hazardDetectionEnabled: true,
      contrastMapEnabled: true,
    };
  }

  /**
   * Initialize the CV pipeline
   */
  async initialize(config: CVConfig): Promise<void> {
    this.config = { ...config };
    
    // Note: Web Worker setup would go here in a real implementation
    // For now, we'll process on the main thread
    this.initialized = true;
  }

  /**
   * Process a camera frame
   * Optimized for synchronous processing when queue is empty
   */
  async processFrame(frame: ImageData): Promise<CVResult> {
    if (!this.initialized) {
      throw new Error('CVPipeline not initialized');
    }

    // If not currently processing and queue is empty, process immediately
    if (!this.processing && this.frameQueue.length === 0) {
      this.frameCounter++;
      const result = await this.processFrameInternal(frame);
      this.updateFPS();
      return result;
    }

    // Otherwise, queue the frame
    return new Promise((resolve, reject) => {
      const job: FrameJob = {
        id: this.frameCounter++,
        frame,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      this.frameQueue.push(job);
      this.processQueue();
    });
  }

  /**
   * Get current processing FPS
   */
  getCurrentFPS(): number {
    return this.currentFPS;
  }

  /**
   * Get current memory usage in MB
   */
  getMemoryUsage(): number {
    // Update memory usage if performance.memory is available
    if (performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);
    }
    return this.memoryUsageMB;
  }

  /**
   * Process the frame queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.frameQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.frameQueue.length > 0) {
      const job = this.frameQueue.shift()!;

      try {
        const result = await this.processFrameInternal(job.frame);
        job.resolve(result);
        this.updateFPS();
        
        // Reset consecutive error counter on success
        this.consecutiveErrors = 0;
      } catch (error) {
        // Log error with context
        const systemError = createError(
          'processing_error',
          'warning',
          'CVPipeline',
          `Frame processing failed: ${(error as Error).message}`,
          {
            frameId: job.id,
            frameSize: `${job.frame.width}x${job.frame.height}`,
            queueLength: this.frameQueue.length,
            error: error
          }
        );
        this.errorLog.push(systemError);
        
        // Keep only last 100 errors
        if (this.errorLog.length > 100) {
          this.errorLog.shift();
        }

        this.consecutiveErrors++;

        // Continue processing subsequent frames (error recovery)
        // Only stop if too many consecutive errors
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.error('Too many consecutive CV pipeline errors, stopping processing');
          job.reject(new Error('CV pipeline error threshold exceeded'));
          break;
        }

        // Reject this frame but continue with next
        job.reject(error as Error);
      }

      // Check if we should skip frames to maintain target FPS
      if (this.shouldSkipFrames()) {
        // Clear queue to catch up
        while (this.frameQueue.length > 1) {
          const skippedJob = this.frameQueue.shift()!;
          skippedJob.reject(new Error('Frame skipped to maintain FPS'));
        }
      }
    }

    this.processing = false;
  }

  /**
   * Internal frame processing implementation
   * Optimized to avoid dynamic imports for better performance
   */
  private async processFrameInternal(frame: ImageData): Promise<CVResult> {
    const startTime = performance.now();

    // Compute brightness histogram (always required)
    const histogram = computeBrightnessHistogram(frame);

    // Detect hazards if enabled (with error recovery)
    const hazards: HazardDetection[] = [];
    if (this.config.hazardDetectionEnabled) {
      try {
        hazards.push(...detectHazards(frame, histogram));
      } catch (hazardError) {
        // Log error but continue processing
        const error = createError(
          'processing_error',
          'warning',
          'HazardClassifier',
          `Hazard detection failed: ${(hazardError as Error).message}`,
          { frameSize: `${frame.width}x${frame.height}` }
        );
        this.errorLog.push(error);
        
        // Return empty hazards array and continue
        console.warn('Hazard detection failed, continuing with empty hazards', hazardError);
      }
    }

    // Generate contrast map if enabled (with error recovery)
    let contrastMap: ContrastMap = {
      width: frame.width,
      height: frame.height,
      data: new Float32Array(0),
    };
    if (this.config.contrastMapEnabled) {
      try {
        contrastMap = generateContrastMap(frame);
      } catch (contrastError) {
        // Log error but continue processing
        const error = createError(
          'processing_error',
          'warning',
          'ContrastMap',
          `Contrast map generation failed: ${(contrastError as Error).message}`,
          { frameSize: `${frame.width}x${frame.height}` }
        );
        this.errorLog.push(error);
        
        // Return empty contrast map and continue
        console.warn('Contrast map generation failed, continuing with empty map', contrastError);
      }
    }

    const processingTimeMs = performance.now() - startTime;

    return {
      histogram,
      hazards,
      contrastMap,
      processingTimeMs,
    };
  }

  /**
   * Update FPS tracking
   */
  private updateFPS(): void {
    const now = performance.now();
    
    if (this.lastFpsUpdate === 0) {
      this.lastFpsUpdate = now;
      return;
    }

    const deltaMs = now - this.lastFpsUpdate;
    const instantFPS = 1000 / deltaMs;
    
    this.fpsHistory.push(instantFPS);
    
    // Keep only last 30 samples for moving average
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }

    // Calculate moving average
    this.currentFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    this.lastFpsUpdate = now;
  }

  /**
   * Check if we should skip frames to maintain target FPS
   */
  private shouldSkipFrames(): boolean {
    return this.currentFPS < this.config.targetFPS && this.frameQueue.length > 2;
  }

  /**
   * Get error log
   */
  getErrorLog(): SystemError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.consecutiveErrors = 0;
  }

  /**
   * Get consecutive error count
   */
  getConsecutiveErrorCount(): number {
    return this.consecutiveErrors;
  }

  /**
   * Shutdown the pipeline
   */
  async shutdown(): Promise<void> {
    this.frameQueue = [];
    this.processing = false;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
  }
}

export * from './hazard-classifier';
export * from './contrast-map';
