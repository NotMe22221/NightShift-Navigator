/**
 * Unit tests for shadow detection
 */

import { describe, it, expect } from 'vitest';
import { detectShadows } from './shadow-detection.js';

describe('Shadow Detection', () => {
  it('should detect no shadows in a uniformly bright image', () => {
    // Create a bright uniform image
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;     // R
      data[i + 1] = 200; // G
      data[i + 2] = 200; // B
      data[i + 3] = 255; // A
    }
    
    const frame = new ImageData(data, width, height);
    const result = detectShadows(frame);
    
    expect(result.shadowCoverage).toBeLessThan(0.1); // Less than 10% shadows
  });

  it('should detect high shadow coverage in a dark image', () => {
    // Create a dark uniform image
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 30;      // R
      data[i + 1] = 30;  // G
      data[i + 2] = 30;  // B
      data[i + 3] = 255; // A
    }
    
    const frame = new ImageData(data, width, height);
    const result = detectShadows(frame);
    
    expect(result.shadowCoverage).toBeGreaterThan(0.5); // More than 50% shadows
  });

  it('should return shadow coverage between 0 and 1', () => {
    // Create a mixed brightness image
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.floor(Math.random() * 256);
      data[i] = brightness;     // R
      data[i + 1] = brightness; // G
      data[i + 2] = brightness; // B
      data[i + 3] = 255;        // A
    }
    
    const frame = new ImageData(data, width, height);
    const result = detectShadows(frame);
    
    expect(result.shadowCoverage).toBeGreaterThanOrEqual(0);
    expect(result.shadowCoverage).toBeLessThanOrEqual(1);
  });

  it('should return an array of shadow regions', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Create image with some dark areas
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 50;      // R
      data[i + 1] = 50;  // G
      data[i + 2] = 50;  // B
      data[i + 3] = 255; // A
    }
    
    const frame = new ImageData(data, width, height);
    const result = detectShadows(frame);
    
    expect(Array.isArray(result.shadowRegions)).toBe(true);
    
    // Each region should have x, y, width, height
    for (const region of result.shadowRegions) {
      expect(typeof region.x).toBe('number');
      expect(typeof region.y).toBe('number');
      expect(typeof region.width).toBe('number');
      expect(typeof region.height).toBe('number');
    }
  });
});
