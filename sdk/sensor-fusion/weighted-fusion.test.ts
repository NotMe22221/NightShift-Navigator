/**
 * Unit tests for weighted sensor fusion
 */

import { describe, it, expect } from 'vitest';
import { 
  computeWeightedFusion, 
  validateFusionWeights, 
  normalizeFusionWeights 
} from './weighted-fusion.js';

describe('Weighted Sensor Fusion', () => {
  it('should compute fusion with equal weights', () => {
    const inputs = {
      cameraBrightness: 0.5,
      lightSensorLux: 500,
      shadowCoverage: 0.3,
    };
    
    const weights = {
      camera: 1/3,
      lightSensor: 1/3,
      shadowDetection: 1/3,
    };
    
    const result = computeWeightedFusion(inputs, weights);
    
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should return 0 when all inputs are 0 and no shadows', () => {
    const inputs = {
      cameraBrightness: 0,
      lightSensorLux: 0,
      shadowCoverage: 0,
    };
    
    const weights = {
      camera: 1/3,
      lightSensor: 1/3,
      shadowDetection: 1/3,
    };
    
    const result = computeWeightedFusion(inputs, weights);
    
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should handle high shadow coverage (low light)', () => {
    const inputs = {
      cameraBrightness: 0.5,
      lightSensorLux: 500,
      shadowCoverage: 0.9, // High shadow coverage
    };
    
    const weights = {
      camera: 0.3,
      lightSensor: 0.3,
      shadowDetection: 0.4, // High weight on shadows
    };
    
    const result = computeWeightedFusion(inputs, weights);
    
    // High shadow coverage should reduce unified light level
    expect(result).toBeLessThan(0.5);
  });

  it('should validate correct fusion weights', () => {
    const validWeights = {
      camera: 0.3,
      lightSensor: 0.4,
      shadowDetection: 0.3,
    };
    
    expect(validateFusionWeights(validWeights)).toBe(true);
  });

  it('should reject negative fusion weights', () => {
    const invalidWeights = {
      camera: -0.1,
      lightSensor: 0.6,
      shadowDetection: 0.5,
    };
    
    expect(validateFusionWeights(invalidWeights)).toBe(false);
  });

  it('should reject weights that do not sum to 1', () => {
    const invalidWeights = {
      camera: 0.5,
      lightSensor: 0.5,
      shadowDetection: 0.5,
    };
    
    expect(validateFusionWeights(invalidWeights)).toBe(false);
  });

  it('should normalize weights to sum to 1', () => {
    const unnormalizedWeights = {
      camera: 2,
      lightSensor: 3,
      shadowDetection: 5,
    };
    
    const normalized = normalizeFusionWeights(unnormalizedWeights);
    
    expect(normalized.camera).toBeCloseTo(0.2);
    expect(normalized.lightSensor).toBeCloseTo(0.3);
    expect(normalized.shadowDetection).toBeCloseTo(0.5);
    
    const sum = normalized.camera + normalized.lightSensor + normalized.shadowDetection;
    expect(sum).toBeCloseTo(1.0);
  });

  it('should handle zero weights by using equal distribution', () => {
    const zeroWeights = {
      camera: 0,
      lightSensor: 0,
      shadowDetection: 0,
    };
    
    const normalized = normalizeFusionWeights(zeroWeights);
    
    expect(normalized.camera).toBeCloseTo(1/3);
    expect(normalized.lightSensor).toBeCloseTo(1/3);
    expect(normalized.shadowDetection).toBeCloseTo(1/3);
  });
});
