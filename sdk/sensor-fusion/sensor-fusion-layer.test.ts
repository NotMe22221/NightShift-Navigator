/**
 * Unit tests for Sensor Fusion Layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SensorFusionLayerImpl } from './sensor-fusion-layer.js';
import { MockCamera } from './mock-camera.js';
import { MockLightSensor } from './mock-light-sensor.js';

describe('SensorFusionLayer', () => {
  let fusionLayer: SensorFusionLayerImpl;
  let camera: MockCamera;
  let lightSensor: MockLightSensor;

  beforeEach(() => {
    camera = new MockCamera({ width: 640, height: 480, brightness: 128 });
    lightSensor = new MockLightSensor({ initialLux: 100 });
    
    fusionLayer = new SensorFusionLayerImpl(
      {
        cameraEnabled: true,
        lightSensorEnabled: true,
        shadowDetectionEnabled: true,
        updateFrequencyHz: 5,
        weightings: {
          camera: 1/3,
          lightSensor: 1/3,
          shadowDetection: 1/3,
        },
      },
      camera,
      lightSensor
    );
  });

  afterEach(() => {
    fusionLayer.stop();
  });

  it('should initialize successfully', async () => {
    await fusionLayer.initialize({
      cameraEnabled: true,
      lightSensorEnabled: true,
      shadowDetectionEnabled: true,
      updateFrequencyHz: 5,
      weightings: {
        camera: 1/3,
        lightSensor: 1/3,
        shadowDetection: 1/3,
      },
    });

    const metrics = fusionLayer.getCurrentMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.timestamp).toBeGreaterThan(0);
  });

  it('should start and produce metrics updates', async () => {
    await fusionLayer.initialize({
      cameraEnabled: true,
      lightSensorEnabled: true,
      shadowDetectionEnabled: true,
      updateFrequencyHz: 10,
      weightings: {
        camera: 1/3,
        lightSensor: 1/3,
        shadowDetection: 1/3,
      },
    });

    const callback = vi.fn();
    fusionLayer.onMetricsUpdate(callback);

    fusionLayer.start();

    // Wait for at least one update
    await new Promise(resolve => setTimeout(resolve, 250));

    expect(callback).toHaveBeenCalled();
    
    const metrics = callback.mock.calls[0][0];
    expect(metrics.meanLuminance).toBeGreaterThanOrEqual(0);
    expect(metrics.meanLuminance).toBeLessThanOrEqual(255);
    expect(metrics.ambientLux).toBeGreaterThanOrEqual(0);
    expect(metrics.shadowCoverage).toBeGreaterThanOrEqual(0);
    expect(metrics.shadowCoverage).toBeLessThanOrEqual(1);
    expect(metrics.unifiedLightLevel).toBeGreaterThanOrEqual(0);
    expect(metrics.unifiedLightLevel).toBeLessThanOrEqual(1);
  });

  it('should stop producing updates when stopped', async () => {
    await fusionLayer.initialize({
      cameraEnabled: true,
      lightSensorEnabled: true,
      shadowDetectionEnabled: false,
      updateFrequencyHz: 10,
      weightings: {
        camera: 0.5,
        lightSensor: 0.5,
        shadowDetection: 0,
      },
    });

    const callback = vi.fn();
    fusionLayer.onMetricsUpdate(callback);

    fusionLayer.start();
    await new Promise(resolve => setTimeout(resolve, 250));

    const callCountBeforeStop = callback.mock.calls.length;
    fusionLayer.stop();

    await new Promise(resolve => setTimeout(resolve, 250));
    const callCountAfterStop = callback.mock.calls.length;

    expect(callCountAfterStop).toBe(callCountBeforeStop);
  });

  it('should update at approximately the configured frequency', async () => {
    const targetHz = 10;
    
    await fusionLayer.initialize({
      cameraEnabled: true,
      lightSensorEnabled: true,
      shadowDetectionEnabled: false,
      updateFrequencyHz: targetHz,
      weightings: {
        camera: 0.5,
        lightSensor: 0.5,
        shadowDetection: 0,
      },
    });

    fusionLayer.start();

    // Wait for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stats = fusionLayer.getUpdateStats();
    
    // Should have at least a few updates (test environment timing can vary)
    expect(stats.count).toBeGreaterThanOrEqual(3);
  });

  it('should work with only camera enabled', async () => {
    await fusionLayer.initialize({
      cameraEnabled: true,
      lightSensorEnabled: false,
      shadowDetectionEnabled: false,
      updateFrequencyHz: 5,
      weightings: {
        camera: 1,
        lightSensor: 0,
        shadowDetection: 0,
      },
    });

    fusionLayer.start();
    await new Promise(resolve => setTimeout(resolve, 250));

    const metrics = fusionLayer.getCurrentMetrics();
    expect(metrics.meanLuminance).toBeGreaterThan(0);
    expect(metrics.ambientLux).toBe(0);
  });

  it('should work with only light sensor enabled', async () => {
    await fusionLayer.initialize({
      cameraEnabled: false,
      lightSensorEnabled: true,
      shadowDetectionEnabled: false,
      updateFrequencyHz: 5,
      weightings: {
        camera: 0,
        lightSensor: 1,
        shadowDetection: 0,
      },
    });

    fusionLayer.start();
    await new Promise(resolve => setTimeout(resolve, 250));

    const metrics = fusionLayer.getCurrentMetrics();
    expect(metrics.ambientLux).toBeGreaterThan(0);
    expect(metrics.meanLuminance).toBe(0);
  });
});
