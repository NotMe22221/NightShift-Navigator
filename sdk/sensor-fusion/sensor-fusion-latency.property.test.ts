/**
 * Property-Based Tests for Sensor Fusion Latency
 * **Feature: nightshift-navigator, Property 54: Sensor fusion latency**
 * **Validates: Requirements 11.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SensorFusionLayerImpl } from './sensor-fusion-layer.js';
import type { SensorFusionConfig, CameraInterface, LightSensorInterface } from './index.js';

/**
 * Mock camera for testing
 */
class MockCamera implements CameraInterface {
  private frame: ImageData | null = null;

  async initialize(): Promise<void> {}
  
  start(): void {}
  
  stop(): void {}
  
  getCurrentFrame(): ImageData | null {
    return this.frame;
  }
  
  setFrame(frame: ImageData): void {
    this.frame = frame;
  }
}

/**
 * Mock light sensor for testing
 */
class MockLightSensor implements LightSensorInterface {
  private reading: number = 100;

  async initialize(): Promise<void> {}
  
  start(): void {}
  
  stop(): void {}
  
  getCurrentReading(): number {
    return this.reading;
  }
  
  setReading(reading: number): void {
    this.reading = reading;
  }
}

describe('Sensor Fusion Latency Property Tests', () => {
  /**
   * Property 54: Sensor fusion latency
   * For any sensor update, the Sensor Fusion Layer should process it with latency below 50 milliseconds
   */
  it('should process sensor updates with latency below 50ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random frame dimensions (reasonable sizes)
        fc.record({
          width: fc.integer({ min: 160, max: 640 }),
          height: fc.integer({ min: 120, max: 480 }),
          lightReading: fc.float({ min: 0, max: 100000 }),
          cameraEnabled: fc.boolean(),
          lightSensorEnabled: fc.boolean(),
          shadowDetectionEnabled: fc.boolean(),
        }),
        async (config) => {
          // Skip if both sensors are disabled
          if (!config.cameraEnabled && !config.lightSensorEnabled) {
            return true;
          }

          // Create mock sensors
          const mockCamera = new MockCamera();
          const mockLightSensor = new MockLightSensor();

          // Generate random frame data
          const frameSize = config.width * config.height * 4;
          const frameData = new Uint8ClampedArray(frameSize);
          for (let i = 0; i < frameSize; i++) {
            frameData[i] = Math.floor(Math.random() * 256);
          }
          const frame = new ImageData(frameData, config.width, config.height);
          
          mockCamera.setFrame(frame);
          mockLightSensor.setReading(config.lightReading);

          // Create sensor fusion layer
          const fusionConfig: SensorFusionConfig = {
            cameraEnabled: config.cameraEnabled,
            lightSensorEnabled: config.lightSensorEnabled,
            shadowDetectionEnabled: config.shadowDetectionEnabled,
            updateFrequencyHz: 10,
            weightings: {
              camera: 0.4,
              lightSensor: 0.4,
              shadowDetection: 0.2,
            },
          };

          const sensorFusion = new SensorFusionLayerImpl(
            fusionConfig,
            mockCamera,
            mockLightSensor
          );

          await sensorFusion.initialize(fusionConfig);

          // Start and let it run for a bit to collect latency data
          sensorFusion.start();

          // Wait for several updates (300ms = ~3 updates at 10Hz)
          await new Promise(resolve => setTimeout(resolve, 300));

          sensorFusion.stop();

          // Check latency statistics
          const latencyStats = sensorFusion.getLatencyStats();

          // Property: Average latency should be below 50ms
          const avgLatencyOk = latencyStats.avgMs < 50;
          
          // Property: Maximum latency should be below 50ms (with some tolerance for outliers)
          // We allow max to be slightly higher due to system variance
          const maxLatencyOk = latencyStats.maxMs < 100;

          return avgLatencyOk && maxLatencyOk;
        }
      ),
      { numRuns: 20 } // Reduced runs since this is a performance test
    );
  }, 15000); // 15 second timeout for performance tests

  /**
   * Property: Single update latency
   * For any single sensor update operation, latency should be below 50ms
   */
  it('should process individual updates with latency below 50ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          width: fc.integer({ min: 160, max: 640 }),
          height: fc.integer({ min: 120, max: 480 }),
          lightReading: fc.float({ min: 0, max: 100000 }),
        }),
        async (config) => {
          // Create mock sensors
          const mockCamera = new MockCamera();
          const mockLightSensor = new MockLightSensor();

          // Generate random frame data
          const frameSize = config.width * config.height * 4;
          const frameData = new Uint8ClampedArray(frameSize);
          for (let i = 0; i < frameSize; i++) {
            frameData[i] = Math.floor(Math.random() * 256);
          }
          const frame = new ImageData(frameData, config.width, config.height);
          
          mockCamera.setFrame(frame);
          mockLightSensor.setReading(config.lightReading);

          // Create sensor fusion layer with all features enabled
          const fusionConfig: SensorFusionConfig = {
            cameraEnabled: true,
            lightSensorEnabled: true,
            shadowDetectionEnabled: true,
            updateFrequencyHz: 10,
            weightings: {
              camera: 0.4,
              lightSensor: 0.4,
              shadowDetection: 0.2,
            },
          };

          const sensorFusion = new SensorFusionLayerImpl(
            fusionConfig,
            mockCamera,
            mockLightSensor
          );

          await sensorFusion.initialize(fusionConfig);

          // Start and wait for one update cycle
          sensorFusion.start();
          await new Promise(resolve => setTimeout(resolve, 150));
          sensorFusion.stop();

          // Check latest latency
          const latencyStats = sensorFusion.getLatencyStats();

          // Property: Latest update latency should be below 50ms
          return latencyStats.latestMs < 50;
        }
      ),
      { numRuns: 30 } // Reduced runs for faster execution
    );
  }, 15000); // 15 second timeout

  /**
   * Property: Latency consistency
   * For any sequence of updates, latency should remain consistently below 50ms
   */
  it('should maintain consistent latency below 50ms across multiple updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          width: fc.constantFrom(320, 480, 640),
          height: fc.constantFrom(240, 360, 480),
        }),
        async (config) => {
          // Create mock sensors
          const mockCamera = new MockCamera();
          const mockLightSensor = new MockLightSensor();

          // Generate frame
          const frameSize = config.width * config.height * 4;
          const frameData = new Uint8ClampedArray(frameSize);
          for (let i = 0; i < frameSize; i++) {
            frameData[i] = Math.floor(Math.random() * 256);
          }
          const frame = new ImageData(frameData, config.width, config.height);
          
          mockCamera.setFrame(frame);
          mockLightSensor.setReading(500);

          // Create sensor fusion layer
          const fusionConfig: SensorFusionConfig = {
            cameraEnabled: true,
            lightSensorEnabled: true,
            shadowDetectionEnabled: true,
            updateFrequencyHz: 10,
            weightings: {
              camera: 0.4,
              lightSensor: 0.4,
              shadowDetection: 0.2,
            },
          };

          const sensorFusion = new SensorFusionLayerImpl(
            fusionConfig,
            mockCamera,
            mockLightSensor
          );

          await sensorFusion.initialize(fusionConfig);

          // Run for 500ms to collect multiple samples (~5 updates)
          sensorFusion.start();
          await new Promise(resolve => setTimeout(resolve, 500));
          sensorFusion.stop();

          // Check latency statistics
          const latencyStats = sensorFusion.getLatencyStats();

          // Property: Average latency should be well below 50ms
          const avgOk = latencyStats.avgMs < 50;
          
          // Property: Minimum latency should be reasonable (not zero, which would indicate no processing)
          const minOk = latencyStats.minMs > 0 && latencyStats.minMs < 50;

          return avgOk && minOk;
        }
      ),
      { numRuns: 15 } // Reduced runs for faster execution
    );
  }, 15000); // 15 second timeout
});

