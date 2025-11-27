/**
 * Tests for mock sensor implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockCamera } from './mock-camera.js';
import { MockLightSensor } from './mock-light-sensor.js';

describe('MockCamera', () => {
  let camera: MockCamera;

  beforeEach(() => {
    camera = new MockCamera({ width: 640, height: 480, fps: 30, brightness: 128 });
  });

  afterEach(() => {
    camera.stop();
  });

  it('should initialize and generate a frame', async () => {
    await camera.initialize();
    const frame = camera.getCurrentFrame();
    
    expect(frame).not.toBeNull();
    expect(frame?.width).toBe(640);
    expect(frame?.height).toBe(480);
    expect(frame?.data.length).toBe(640 * 480 * 4);
  });

  it('should generate frames with approximately correct brightness', async () => {
    await camera.initialize();
    const frame = camera.getCurrentFrame();
    
    if (!frame) {
      throw new Error('Frame should not be null');
    }

    // Calculate average brightness
    let sum = 0;
    for (let i = 0; i < frame.data.length; i += 4) {
      sum += frame.data[i]; // R channel
    }
    const avgBrightness = sum / (frame.data.length / 4);

    // Should be within reasonable range of target (128 ± 30)
    expect(avgBrightness).toBeGreaterThan(98);
    expect(avgBrightness).toBeLessThan(158);
  });

  it('should call frame callbacks when started', async () => {
    await camera.initialize();
    
    const callback = vi.fn();
    camera.onFrame(callback);
    
    camera.start();
    
    // Wait for at least one frame
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(callback).toHaveBeenCalled();
    expect(callback.mock.calls[0][0]).toBeInstanceOf(ImageData);
  });

  it('should stop generating frames when stopped', async () => {
    await camera.initialize();
    
    const callback = vi.fn();
    camera.onFrame(callback);
    
    camera.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const callCountBeforeStop = callback.mock.calls.length;
    camera.stop();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    const callCountAfterStop = callback.mock.calls.length;
    
    expect(callCountAfterStop).toBe(callCountBeforeStop);
  });

  it('should update brightness when setBrightness is called', async () => {
    await camera.initialize();
    
    camera.setBrightness(200);
    camera.start();
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const frame = camera.getCurrentFrame();
    if (!frame) {
      throw new Error('Frame should not be null');
    }

    let sum = 0;
    for (let i = 0; i < frame.data.length; i += 4) {
      sum += frame.data[i];
    }
    const avgBrightness = sum / (frame.data.length / 4);

    // Should be closer to 200 now
    expect(avgBrightness).toBeGreaterThan(170);
    expect(avgBrightness).toBeLessThan(230);
  });
});

describe('MockLightSensor', () => {
  let sensor: MockLightSensor;

  beforeEach(() => {
    sensor = new MockLightSensor({ updateFrequencyHz: 10, initialLux: 100, variationRange: 10 });
  });

  afterEach(() => {
    sensor.stop();
  });

  it('should initialize with correct initial reading', async () => {
    await sensor.initialize();
    const reading = sensor.getCurrentReading();
    
    expect(reading).toBe(100);
  });

  it('should generate readings within expected range', async () => {
    await sensor.initialize();
    sensor.start();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const reading = sensor.getCurrentReading();
    
    // Should be within variation range (100 ± 10)
    expect(reading).toBeGreaterThanOrEqual(90);
    expect(reading).toBeLessThanOrEqual(110);
  });

  it('should call reading callbacks when started', async () => {
    await sensor.initialize();
    
    const callback = vi.fn();
    sensor.onReading(callback);
    
    sensor.start();
    
    // Wait for at least one reading
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(callback).toHaveBeenCalled();
    expect(typeof callback.mock.calls[0][0]).toBe('number');
  });

  it('should stop generating readings when stopped', async () => {
    await sensor.initialize();
    
    const callback = vi.fn();
    sensor.onReading(callback);
    
    sensor.start();
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const callCountBeforeStop = callback.mock.calls.length;
    sensor.stop();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    const callCountAfterStop = callback.mock.calls.length;
    
    expect(callCountAfterStop).toBe(callCountBeforeStop);
  });

  it('should update lux value when setLux is called', async () => {
    await sensor.initialize();
    
    sensor.setLux(500);
    const reading = sensor.getCurrentReading();
    
    expect(reading).toBe(500);
  });

  it('should never generate negative readings', async () => {
    await sensor.initialize();
    sensor.setLux(5);
    sensor.setVariationRange(20);
    
    sensor.start();
    
    const readings: number[] = [];
    sensor.onReading((reading) => readings.push(reading));
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    for (const reading of readings) {
      expect(reading).toBeGreaterThanOrEqual(0);
    }
  });
});
