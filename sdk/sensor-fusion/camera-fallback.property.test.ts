/**
 * Property-Based Tests for Camera Fallback Operation
 * **Feature: nightshift-navigator, Property 36: Camera fallback operation**
 * **Validates: Requirements 8.1**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SensorFallbackManager } from './sensor-fallback.js';
import { MockCamera } from './mock-camera.js';
import { MockLightSensor } from './mock-light-sensor.js';
import { createError } from '../error-handling/index.js';

describe('Property 36: Camera fallback operation', () => {
  /**
   * Property: For any camera failure during operation, the Sensor Fusion Layer 
   * should continue producing light metrics using only the light sensor.
   */
  it('should continue operation with light sensor when camera fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100000 }), // light sensor lux value
        async (luxValue) => {
          // Setup
          const camera = new MockCamera();
          const lightSensor = new MockLightSensor({ initialLux: luxValue });
          const fallbackManager = new SensorFallbackManager(camera, lightSensor);

          // Initialize sensors
          await camera.initialize();
          await lightSensor.initialize();
          camera.start();
          lightSensor.start();

          // Verify normal mode initially
          expect(fallbackManager.getCurrentMode()).toBe('normal');

          // Simulate camera failure
          const cameraError = createError(
            'sensor_error',
            'critical',
            'Camera',
            'Camera hardware failure',
            { sensor: 'camera' }
          );

          // Handle camera failure
          const result = await fallbackManager.handleCameraFailure(cameraError);

          // Verify recovery was successful
          expect(result.success).toBe(true);
          expect(result.action).toBe('degraded');

          // Verify switched to light sensor only mode
          expect(fallbackManager.getCurrentMode()).toBe('light_sensor_only');

          // Verify can still get metrics from light sensor
          const metrics = fallbackManager.getMetricsInFallbackMode();
          expect(metrics).not.toBeNull();
          
          if (metrics) {
            // Should have light sensor data
            expect(metrics.ambientLux).toBeGreaterThanOrEqual(0);
            
            // Camera-dependent metrics should be unavailable (0)
            expect(metrics.meanLuminance).toBe(0);
            expect(metrics.shadowCoverage).toBe(0);
            
            // Unified light level should be based on light sensor
            expect(metrics.unifiedLightLevel).toBeGreaterThanOrEqual(0);
            expect(metrics.unifiedLightLevel).toBeLessThanOrEqual(1);
          }

          // Cleanup
          camera.stop();
          lightSensor.stop();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail gracefully when camera fails and no light sensor available', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // no light sensor
        async () => {
          // Setup with camera only
          const camera = new MockCamera();
          const fallbackManager = new SensorFallbackManager(camera, undefined);

          await camera.initialize();
          camera.start();

          // Simulate camera failure
          const cameraError = createError(
            'sensor_error',
            'critical',
            'Camera',
            'Camera hardware failure',
            { sensor: 'camera' }
          );

          // Handle camera failure
          const result = await fallbackManager.handleCameraFailure(cameraError);

          // Should fail since no fallback available
          expect(result.success).toBe(false);
          expect(result.action).toBe('failed');

          // Cleanup
          camera.stop();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain light sensor operation across various lux values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 100000 }), { minLength: 5, maxLength: 20 }),
        async (luxValues) => {
          // Setup
          const camera = new MockCamera();
          const lightSensor = new MockLightSensor({ initialLux: luxValues[0] });
          const fallbackManager = new SensorFallbackManager(camera, lightSensor);

          await camera.initialize();
          await lightSensor.initialize();
          camera.start();
          lightSensor.start();

          // Trigger camera failure
          const cameraError = createError(
            'sensor_error',
            'critical',
            'Camera',
            'Camera hardware failure'
          );
          await fallbackManager.handleCameraFailure(cameraError);

          // Test with various lux values
          for (const luxValue of luxValues) {
            lightSensor.setLux(luxValue);
            
            const metrics = fallbackManager.getMetricsInFallbackMode();
            expect(metrics).not.toBeNull();
            
            if (metrics) {
              // Should continue producing valid metrics
              expect(metrics.ambientLux).toBeGreaterThanOrEqual(0);
              expect(metrics.unifiedLightLevel).toBeGreaterThanOrEqual(0);
              expect(metrics.unifiedLightLevel).toBeLessThanOrEqual(1);
            }
          }

          // Cleanup
          camera.stop();
          lightSensor.stop();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
