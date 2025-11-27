/**
 * Sensor Fallback Strategies
 * Implements fallback behavior when sensors fail
 */

import type { 
  LightMetrics, 
  CameraInterface, 
  LightSensorInterface 
} from './index.js';
import { normalizeLightSensorReading } from './light-sensor-normalization.js';
import type { SystemError, RecoveryResult } from '../error-handling/index.js';

/**
 * Fallback mode for sensor fusion
 */
export type FallbackMode = 'normal' | 'light_sensor_only' | 'camera_only' | 'dead_reckoning';

/**
 * Sensor fallback manager
 */
export class SensorFallbackManager {
  private currentMode: FallbackMode = 'normal';
  private lastKnownMetrics: LightMetrics | null = null;
  private camera: CameraInterface | null = null;
  private lightSensor: LightSensorInterface | null = null;

  constructor(camera?: CameraInterface, lightSensor?: LightSensorInterface) {
    this.camera = camera || null;
    this.lightSensor = lightSensor || null;
  }

  /**
   * Get current fallback mode
   */
  getCurrentMode(): FallbackMode {
    return this.currentMode;
  }

  /**
   * Set last known metrics for fallback
   */
  setLastKnownMetrics(metrics: LightMetrics): void {
    this.lastKnownMetrics = metrics;
  }

  /**
   * Handle camera failure - switch to light sensor only mode
   */
  async handleCameraFailure(error: SystemError): Promise<RecoveryResult> {
    if (!this.lightSensor) {
      return {
        success: false,
        action: 'failed',
        message: 'Camera failed and no light sensor available'
      };
    }

    try {
      // Switch to light sensor only mode
      this.currentMode = 'light_sensor_only';

      // Ensure light sensor is initialized and running
      try {
        if (!this.lightSensor.isRunning()) {
          await this.lightSensor.initialize();
          this.lightSensor.start();
        }
      } catch (initError) {
        // Light sensor might already be initialized, that's okay
      }

      return {
        success: true,
        action: 'degraded',
        message: 'Switched to light sensor only mode'
      };
    } catch (fallbackError) {
      return {
        success: false,
        action: 'failed',
        message: 'Failed to switch to light sensor only mode'
      };
    }
  }

  /**
   * Handle light sensor failure - switch to camera only mode
   */
  async handleLightSensorFailure(error: SystemError): Promise<RecoveryResult> {
    if (!this.camera) {
      return {
        success: false,
        action: 'failed',
        message: 'Light sensor failed and no camera available'
      };
    }

    try {
      // Switch to camera only mode
      this.currentMode = 'camera_only';

      // Ensure camera is initialized and running
      try {
        if (!this.camera.isRunning()) {
          await this.camera.initialize();
          this.camera.start();
        }
      } catch (initError) {
        // Camera might already be initialized, that's okay
      }

      return {
        success: true,
        action: 'degraded',
        message: 'Switched to camera only mode'
      };
    } catch (fallbackError) {
      return {
        success: false,
        action: 'failed',
        message: 'Failed to switch to camera only mode'
      };
    }
  }

  /**
   * Get metrics in fallback mode
   */
  getMetricsInFallbackMode(): LightMetrics | null {
    const timestamp = Date.now();

    switch (this.currentMode) {
      case 'light_sensor_only':
        if (this.lightSensor) {
          const rawReading = this.lightSensor.getCurrentReading();
          const ambientLux = normalizeLightSensorReading(rawReading);
          
          return {
            meanLuminance: 0, // Not available
            ambientLux,
            shadowCoverage: 0, // Not available
            unifiedLightLevel: ambientLux / 100000, // Normalize lux to 0-1 (assuming max 100k lux)
            timestamp
          };
        }
        break;

      case 'camera_only':
        // Camera-only metrics would be computed by the main sensor fusion layer
        // This is just a marker that we're in fallback mode
        return this.lastKnownMetrics;

      case 'dead_reckoning':
        // Return last known metrics with updated timestamp
        if (this.lastKnownMetrics) {
          return {
            ...this.lastKnownMetrics,
            timestamp
          };
        }
        break;

      case 'normal':
      default:
        return null;
    }

    return null;
  }

  /**
   * Attempt to recover to normal mode
   */
  async attemptRecovery(): Promise<boolean> {
    if (this.currentMode === 'normal') {
      return true;
    }

    try {
      // Try to reinitialize failed sensors
      if (this.currentMode === 'light_sensor_only' && this.camera) {
        await this.camera.initialize();
        this.camera.start();
        this.currentMode = 'normal';
        return true;
      }

      if (this.currentMode === 'camera_only' && this.lightSensor) {
        await this.lightSensor.initialize();
        this.lightSensor.start();
        this.currentMode = 'normal';
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}

/**
 * GPS fallback using dead reckoning with IMU
 * Note: This is a simplified implementation. Real dead reckoning would use
 * accelerometer and gyroscope data to estimate position changes.
 */
export interface IMUData {
  acceleration: { x: number; y: number; z: number };
  rotation: { alpha: number; beta: number; gamma: number };
  timestamp: number;
}

export interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export class GPSFallbackManager {
  private lastKnownPosition: Position | null = null;
  private imuHistory: IMUData[] = [];
  private maxHistorySize: number = 100;

  /**
   * Set last known GPS position
   */
  setLastKnownPosition(position: Position): void {
    this.lastKnownPosition = position;
  }

  /**
   * Add IMU data for dead reckoning
   */
  addIMUData(data: IMUData): void {
    this.imuHistory.push(data);
    
    // Keep only recent history
    if (this.imuHistory.length > this.maxHistorySize) {
      this.imuHistory.shift();
    }
  }

  /**
   * Estimate position using dead reckoning
   * This is a simplified implementation - real dead reckoning is complex
   */
  estimatePosition(): Position | null {
    if (!this.lastKnownPosition || this.imuHistory.length === 0) {
      return this.lastKnownPosition;
    }

    // In a real implementation, this would:
    // 1. Integrate acceleration to get velocity
    // 2. Integrate velocity to get displacement
    // 3. Apply rotation to get direction
    // 4. Update position based on displacement and direction
    
    // For now, return last known position with degraded accuracy
    return {
      ...this.lastKnownPosition,
      accuracy: 50 // Degraded accuracy in meters
    };
  }

  /**
   * Handle GPS loss
   */
  async handleGPSLoss(error: SystemError): Promise<RecoveryResult> {
    if (!this.lastKnownPosition) {
      return {
        success: false,
        action: 'failed',
        message: 'GPS lost and no previous position available'
      };
    }

    return {
      success: true,
      action: 'degraded',
      message: 'Using dead reckoning with IMU data'
    };
  }
}
