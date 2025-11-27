/**
 * Sensor Fusion Layer Implementation
 * Aggregates data from camera, light sensor, and shadow detection
 */

import type { 
  SensorFusionConfig, 
  LightMetrics, 
  SensorFusionLayer,
  CameraInterface,
  LightSensorInterface 
} from './index.js';
import { computeBrightnessHistogram } from './brightness-histogram.js';
import { normalizeLightSensorReading } from './light-sensor-normalization.js';
import { detectShadows } from './shadow-detection.js';
import { computeWeightedFusion, normalizeFusionWeights } from './weighted-fusion.js';
import { SensorFallbackManager } from './sensor-fallback.js';

/**
 * Implementation of the Sensor Fusion Layer
 */
export class SensorFusionLayerImpl implements SensorFusionLayer {
  private config: SensorFusionConfig;
  private camera: CameraInterface | null = null;
  private lightSensor: LightSensorInterface | null = null;
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  private currentMetrics: LightMetrics;
  private metricsCallbacks: Array<(metrics: LightMetrics) => void> = [];
  private updateCount: number = 0;
  private lastUpdateTime: number = 0;
  private fallbackManager: SensorFallbackManager;
  private latencyHistory: number[] = [];
  private maxLatencyHistorySize: number = 100;

  constructor(
    config: SensorFusionConfig,
    camera?: CameraInterface,
    lightSensor?: LightSensorInterface
  ) {
    this.config = config;
    this.camera = camera || null;
    this.lightSensor = lightSensor || null;
    this.fallbackManager = new SensorFallbackManager(this.camera || undefined, this.lightSensor || undefined);
    
    // Initialize with default metrics
    this.currentMetrics = {
      meanLuminance: 0,
      ambientLux: 0,
      shadowCoverage: 0,
      unifiedLightLevel: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Initialize the sensor fusion layer
   */
  async initialize(config: SensorFusionConfig): Promise<void> {
    this.config = config;
    
    // Normalize weights
    this.config.weightings = normalizeFusionWeights(this.config.weightings);
    
    // Initialize camera if enabled
    if (this.config.cameraEnabled && this.camera) {
      await this.camera.initialize();
    }
    
    // Initialize light sensor if enabled
    if (this.config.lightSensorEnabled && this.lightSensor) {
      await this.lightSensor.initialize();
    }
  }

  /**
   * Start the sensor fusion layer
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastUpdateTime = Date.now();
    this.updateCount = 0;

    // Start sensors
    if (this.config.cameraEnabled && this.camera) {
      this.camera.start();
    }
    
    if (this.config.lightSensorEnabled && this.lightSensor) {
      this.lightSensor.start();
    }

    // Start update loop at configured frequency
    const intervalMs = 1000 / this.config.updateFrequencyHz;
    this.intervalId = setInterval(() => {
      this.updateMetrics();
    }, intervalMs) as unknown as number;
  }

  /**
   * Stop the sensor fusion layer
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop sensors
    if (this.camera) {
      this.camera.stop();
    }
    
    if (this.lightSensor) {
      this.lightSensor.stop();
    }

    // Stop update loop
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): LightMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Register callback for metrics updates
   */
  onMetricsUpdate(callback: (metrics: LightMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * Get update frequency statistics
   */
  getUpdateStats(): { count: number; actualHz: number } {
    return {
      count: this.updateCount,
      actualHz: this.config.updateFrequencyHz,
    };
  }

  /**
   * Get latency statistics
   * @returns Average, min, max, and latest latency in milliseconds
   */
  getLatencyStats(): { avgMs: number; minMs: number; maxMs: number; latestMs: number } {
    if (this.latencyHistory.length === 0) {
      return { avgMs: 0, minMs: 0, maxMs: 0, latestMs: 0 };
    }

    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.latencyHistory.length;
    const min = Math.min(...this.latencyHistory);
    const max = Math.max(...this.latencyHistory);
    const latest = this.latencyHistory[this.latencyHistory.length - 1];

    return {
      avgMs: avg,
      minMs: min,
      maxMs: max,
      latestMs: latest,
    };
  }

  /**
   * Get fallback manager for error recovery
   */
  getFallbackManager(): SensorFallbackManager {
    return this.fallbackManager;
  }

  /**
   * Update metrics from all sensors
   * Optimized for low latency (<50ms)
   */
  private updateMetrics(): void {
    const startTime = performance.now();

    let meanLuminance = 0;
    let ambientLux = 0;
    let shadowCoverage = 0;

    // Check if we're in fallback mode (fast path)
    const fallbackMetrics = this.fallbackManager.getMetricsInFallbackMode();
    if (fallbackMetrics) {
      this.currentMetrics = fallbackMetrics;
      this.updateCount++;
      this.notifyMetricsCallbacks(this.currentMetrics);
      this.recordLatency(performance.now() - startTime);
      return;
    }

    // Get camera brightness if enabled
    if (this.config.cameraEnabled && this.camera) {
      try {
        const frame = this.camera.getCurrentFrame();
        if (frame) {
          const histogram = computeBrightnessHistogram(frame);
          meanLuminance = histogram.mean;

          // Detect shadows if enabled
          if (this.config.shadowDetectionEnabled) {
            const shadowResult = detectShadows(frame);
            shadowCoverage = shadowResult.shadowCoverage;
          }
        }
      } catch (error) {
        // Camera failed - trigger fallback
        console.warn('Camera error, attempting fallback', error);
      }
    }

    // Get light sensor reading if enabled
    if (this.config.lightSensorEnabled && this.lightSensor) {
      try {
        const rawReading = this.lightSensor.getCurrentReading();
        ambientLux = normalizeLightSensorReading(rawReading);
      } catch (error) {
        // Light sensor failed - trigger fallback
        console.warn('Light sensor error, attempting fallback', error);
      }
    }

    // Compute unified light level using weighted fusion
    // Inline normalization to avoid function call overhead
    const cameraBrightness = meanLuminance * 0.00392156862745098; // 1/255 precomputed
    const unifiedLightLevel = computeWeightedFusion(
      {
        cameraBrightness,
        lightSensorLux: ambientLux,
        shadowCoverage,
      },
      this.config.weightings
    );

    const timestamp = Date.now();

    // Update current metrics (reuse object to reduce GC pressure)
    this.currentMetrics.meanLuminance = meanLuminance;
    this.currentMetrics.ambientLux = ambientLux;
    this.currentMetrics.shadowCoverage = shadowCoverage;
    this.currentMetrics.unifiedLightLevel = unifiedLightLevel;
    this.currentMetrics.timestamp = timestamp;

    // Store for fallback
    this.fallbackManager.setLastKnownMetrics(this.currentMetrics);

    // Increment update count
    this.updateCount++;

    // Notify callbacks
    this.notifyMetricsCallbacks(this.currentMetrics);

    // Record latency
    this.recordLatency(performance.now() - startTime);
  }

  /**
   * Record latency measurement
   * @param latencyMs - Latency in milliseconds
   */
  private recordLatency(latencyMs: number): void {
    this.latencyHistory.push(latencyMs);
    
    // Keep history size bounded
    if (this.latencyHistory.length > this.maxLatencyHistorySize) {
      this.latencyHistory.shift();
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyMetricsCallbacks(metrics: LightMetrics): void {
    for (const callback of this.metricsCallbacks) {
      callback(metrics);
    }
  }
}
