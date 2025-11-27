/**
 * Sensor Fusion Layer
 * Aggregates data from camera, light sensor, and shadow detection
 */

/**
 * Configuration for the Sensor Fusion Layer
 */
export interface SensorFusionConfig {
  cameraEnabled: boolean;
  lightSensorEnabled: boolean;
  shadowDetectionEnabled: boolean;
  updateFrequencyHz: number; // minimum 5 Hz
  weightings: {
    camera: number;
    lightSensor: number;
    shadowDetection: number;
  };
}

/**
 * Aggregated light metrics from multiple sensors
 */
export interface LightMetrics {
  meanLuminance: number; // 0-255
  ambientLux: number; // lux scale
  shadowCoverage: number; // 0-1 (percentage)
  unifiedLightLevel: number; // 0-1 (normalized)
  timestamp: number;
}

/**
 * Main interface for the Sensor Fusion Layer
 */
export interface SensorFusionLayer {
  initialize(config: SensorFusionConfig): Promise<void>;
  start(): void;
  stop(): void;
  getCurrentMetrics(): LightMetrics;
  onMetricsUpdate(callback: (metrics: LightMetrics) => void): void;
}

/**
 * Hardware abstraction for camera access
 */
export interface CameraInterface {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  getCurrentFrame(): ImageData | null;
  onFrame(callback: (frame: ImageData) => void): void;
  isRunning(): boolean;
}

/**
 * Hardware abstraction for ambient light sensor
 */
export interface LightSensorInterface {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  getCurrentReading(): number; // raw sensor value
  onReading(callback: (reading: number) => void): void;
  isRunning(): boolean;
}

/**
 * Shadow detection result
 */
export interface ShadowDetectionResult {
  shadowCoverage: number; // 0-1 (percentage)
  shadowRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export * from './mock-camera.js';
export * from './mock-light-sensor.js';
export * from './brightness-histogram.js';
export * from './light-sensor-normalization.js';
export * from './shadow-detection.js';
export * from './weighted-fusion.js';
export * from './sensor-fusion-layer.js';
export * from './sensor-fallback.js';
